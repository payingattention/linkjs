/*
Example:
  apps/foo [ json ] post --pragma="no-cache" convert [ xml ] post apps/bar

command      = request { content-type [ request ] } .
request      = [ method ] uri { header-flag } .
header-flag  = "--" header-key "=" header-value .
content-type = "[" [ token | string ] "]" .
method       = token .
header-key   = token .
header-value = token | string .
*/
define(['link/module', 'link/app', 'link/request', 'link/response'], function(Module, linkApp, Request, Response) {
    // CLI
    // ===
    // Run HTTP requests in the command line
    var CLI = Module(function() {
    });
    
    // Routes
    // ======
    CLI.post({ uri:'^/?$', 'content-type':'text/html' },     'commandHandler');
    CLI.get({ uri:'^/test/?$', 'content-type':'text/html' }, 'testsHandler');
    
    // Handlers
    // ========
    CLI.prototype.commandHandler = function(request) {
        var command = request.body();
        // Parse :TODO:
        // Execute with piping :TODO:
    };

    // Testing
    // =======
    CLI.prototype.testsHandler = function(orgRequest) {
        // :TODO: log query param
        //this.parser.logging = true;

        // Start a new test suite
        var self = this;
        (new Request('post', '#/test/suite', {}, 'Parser')).dispatch(function(request, response) {
            // Set up requests
            var suiteURI = '#/test/suite/' + response.body() + '/';
            var test = Request.Factory('post', [suiteURI,0], { 'content-type':'jso/array' });
            var tests = [];
            var testParse = function(cmd, match) {
                var requests = self.parse(cmd);
                tests.push(test('matches', [requests, match]).header('message', 'parse of ' + cmd));
            };
            
            // Build test suite
            testParse('a', [
                { uri:'a', method:'get' }
            ]);
            testParse('a/b/c', [
                { uri:'a/b/c', method:'get' }
            ]);
            testParse('#a/b/c', [
                { uri:'#a/b/c', method:'get' }
            ]);
            testParse('http://google.com', [
                { uri:'http://google.com', method:'get' }
            ]);
            testParse('post a/b/c', [
                { uri:'a/b/c', method:'post' }
            ]);
            testParse('post #a/b/c', [
                { uri:'#a/b/c', method:'post' }
            ]);
            testParse('post http://google.com', [
                { uri:'http://google.com', method:'post' }
            ]);
            testParse('put a/b/c --pragma=test', [
                { uri:'a/b/c', method:'put', pragma:'test' }
            ]);
            testParse('put a/b/c --pragma="test"', [
                { uri:'a/b/c', method:'put', pragma:'test' }
            ]);
            testParse('put a/b/c --pragma=test --key=value', [
                { uri:'a/b/c', method:'put', pragma:'test', key:'value' }
            ]);
            testParse('a [b]', [
                { uri:'a', method:'get', accept:'b' }
            ]);
            testParse('a [b/c]', [
                { uri:'a', method:'get', accept:'b/c' }
            ]);
            testParse('a [ b/c ]', [
                { uri:'a', method:'get', accept:'b/c' }
            ]);
            testParse('a [ b/c ] d', [
                { uri:'a', method:'get', accept:'b/c' },
                { uri:'d', method:'post', 'content-type':'b/c' }
            ]);
            testParse('a/b [ c/d ] e/f', [
                { uri:'a/b', method:'get', accept:'c/d' },
                { uri:'e/f', method:'post', 'content-type':'c/d' }
            ]);
            testParse('a/b [ c/d ] e/f [g/h] i/j', [
                { uri:'a/b', method:'get', accept:'c/d' },
                { uri:'e/f', method:'post', 'content-type':'c/d', 'accept':'g/h' },
                { uri:'i/j', method:'post', 'content-type':'g/h' }
            ]);
            testParse('get a/b [ c/d ] put e/f', [
                { uri:'a/b', method:'get', accept:'c/d' },
                { uri:'e/f', method:'put', 'content-type':'c/d' }
            ]);
            testParse('get a/b --c=d --e="f" [ g/h ] put i/j --k=l', [
                { uri:'a/b', method:'get', accept:'g/h', c:'d', e:'f' },
                { uri:'i/j', method:'put', 'content-type':'g/h', k:'l'  }
            ]);

            // Send to process
            Request.batchDispatch(tests, null, function() {
                // Respond with report
                var getTestReport = new Request('get', suiteURI, { accept:'text/html', pragma:'partial' });
                getTestReport.pipeTo(orgRequest);
            });
        });
    };

    // Parser
    // ======
    CLI.prototype.parse = function(buffer) {
        this.parser.buffer = buffer;
        return this.parser.readCommand();
    };
    CLI.prototype.parser = { buffer:null, logging:false };
    CLI.prototype.parser.readCommand = function() {
        // command = request { content-type [ request ] } .
        // ================================================
        var requests = [], curMimeType, defaultMethod = 'get';
        this.log = ((this.logging) ? (function() { console.log.apply(console,arguments); }) : (function() {}));
        this.log('>> Parsing:',this.buffer);
        // Read requests, expecting mimetypes before each extra one
        while (true) {
            // Read request
            request = this.readRequest();
            if (!request) { break; }

            // Default request method
            if (!request.method()) {
                request.method(defaultMethod);
                this.log('Set request to default: ', defaultMethod);
            }
            
            // If previously given a mimetype, use it to describe the body of this request
            if (curMimeType) {
                request.header('content-type', curMimeType);
                this.log('Set content-type to ', curMimeType);
            }
            
            // Add to chain
            requests.push(request);
            
            // Read content type
            curMimeType = this.readContentType();
            if (!curMimeType) { break; }

            // Use to describe the expected response body
            requests[requests.length - 1].header('accept', curMimeType);
            this.log('Set accept to', curMimeType);

            // Switch default to POST from here on out
            defaultMethod = 'post';
        }
        if (requests.length == 0) {
            throw "Expected request";
        }
        this.log('<< Finished parsing:', requests);
        return requests;
    };
    CLI.prototype.parser.readRequest = function() {
        // request = [ method ] uri { header-flag } .
        // ==========================================
        var targetUri, method, headers = {};
        // Read till no more request features
        while (true) {
            var headerSwitch = this.readHeaderSwitch();
            if (headerSwitch) {
                // shouldn't come before method & uri
                if (!targetUri && !method) { throw "Unexpected header flag: " + headerSwitch; }
                headers[headerSwitch.key] = headerSwitch.value;
                continue;
            }
            var uri = this.readURI();
            if (uri) {
                if (method) {
                    // shouldn't have more tokens than method & uri
                    if (targetUri) { throw "Unexpected token: " + uri + ". (Method:" + method + ", Uri:" + targetUri + ")"; }
                    // have a method, set to uri now
                    targetUri = uri;
                } else {
                    // set to method first
                    method = uri;
                }
                continue;
            }
            break;
        }
        // No uri? method probably mistakenly got it
        if (method && !targetUri) {
            targetUri = method;
            method = null; // will need to designate a default elsewhere
        }
        // Return a request if we got a URI; otherwise, no match
        if (!targetUri) { return false; }
        var request = new Request(method, targetUri, headers);
        this.log(request);
        return request;
    };
    CLI.prototype.parser.readContentType = function() {
        // content-type = "[" [ token | string ] "]" .
        // ===========================================
        var match;
        
        // match opening bracket
        match = /^\s*\[\s*/.exec(this.buffer);
        if (!match) { return false; }
        this.moveBuffer(match[0].length);
        
        // read content-type
        match = /^[\w\/\*.0-9]+/.exec(this.buffer);
        if (!match) { throw "Content-type expected"; }
        var contentType = match[0];
        this.moveBuffer(match[0].length);
        
        // match closing bracket
        match = /^\s*\]\s*/.exec(this.buffer);
        if (!match) { throw "Closing bracket ']' expected after content-type"; }
        this.moveBuffer(match[0].length);

        this.log('Read mimetype:', contentType);
        return contentType;
    };
    CLI.prototype.parser.readHeaderSwitch = function() {
        // header-flag = "--" header-key "=" header-value .
        // ================================================
        var match;
    
        // match switch
        match = /^\s*--/.exec(this.buffer);
        if (!match) { return false; }
        this.moveBuffer(match[0].length);

        // match key
        var headerKey = this.readToken();
        if (!headerKey) { throw "Header name expected after '--' switch."; }

        // match '='
        match = /^\s*\=\s*/.exec(this.buffer);
        if (!match) { throw "Value expected for --" + headerKey; }
        this.moveBuffer(match[0].length);

        // match value
        var headerValue = this.readString() || this.readToken();
        if (!headerValue) { throw "Value expected for --" + headerKey; }

        var header = { key:headerKey, value:headerValue };
        this.log('Read header:', header);
        return header;
    };
    CLI.prototype.parser.readString = function() {
        var match;
        
        // match opening quote
        match = /^\s*[\"]/.exec(this.buffer);
        if (!match) { return false; }
        this.moveBuffer(match[0].length);

        // read the string till the next quote
        var string = '';
        while (this.buffer.charAt(0) != '"') {
            var c = this.buffer.charAt(0);
            this.moveBuffer(1);
            if (!c) { throw "String must be terminated by a second quote"; }
            string += c;
        }
        this.moveBuffer(1);

        this.log('Read string:', string);
        return string;
    };
    CLI.prototype.parser.readToken = function() {
        // read the token
        var match = /^\s*(\w+)/.exec(this.buffer);
        if (!match) { return false; }
        this.moveBuffer(match[0].length);
        this.log('Read token:', match[1]);
        return match[1];
    };
    CLI.prototype.parser.readURI = function() {
        var match = /^\s*([\w\/\#]\S*)/.exec(this.buffer);
        if (!match) { return false; }
        this.moveBuffer(match[0].length);
        this.log('Read URI:', match[1]);
        return match[1];
    };
    CLI.prototype.parser.moveBuffer = function(dist) {
        this.buffer = this.buffer.substring(dist);
        this.log('+', dist);
    };
    
    return CLI;
});