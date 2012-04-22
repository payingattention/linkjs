define(['./app.js', './response.js'], function(LinkApp, Response) {
    // Request
    // =======
    // A self-descriptive message for communicating between modules
    // Usage:
    //   var getRequest = new Request('get', '#/target/uri', { 'accept':'text/html' });
    //   var postRequest = new Request('post', '#/target/uri', { 'accept':'application/json' }, 'var1=value1&var2=value2', 'application/x-www-form-urlencoded');

    // Constructor
    var Request = function(opt_method, opt_uri, opt_headers, opt_body, opt_contenttype) {
        opt_method      && this.method(opt_method);
        opt_uri         && this.uri(opt_uri);
        opt_headers     && this.header(opt_headers);
        opt_body        && this.body(opt_body);
        opt_contenttype && this.header({ 'content-type':opt_contenttype });
        this.__capture_handlers = [];
        this.__bubble_handlers = [];
        this.__dispatcher_handler = null;
    };

    // Get/sets
    // uri('#/a/b/c') -> this; uri() -> '#/a/b/c'
    Request.prototype.uri = function(opt_uri) {
        if (opt_uri) { this.__uri = opt_uri; return this; }
        return this.__uri;
    };
    // method('post') -> this; method() -> 'post'
    Request.prototype.method = function(opt_method) {
        if (opt_method) { this.__method = opt_method; return this; }
        return this.__method;
    };
    // header({ 'accept':'text/html' }) -> this; header('accept') -> 'text/html'
    Request.prototype.header = function(key_or_headerKVs) {
        if (!key_or_headerKVs) { console.log('Warning: Request.header() called with empty parameter'); return null; } // shouldn't happen, need to let people know
        if (typeof(key_or_headerKVs) == 'object') {
            for (var k in key_or_headerKVs) { this.__headers[k] = key_or_headerKVs[k]; }
            return this;
        }
        return this.__headers[key_or_headerKVs];
    };
    // body('<html />', 'text/html') -> this;  body() -> '<html />';
    Request.prototype.body = function(opt_body, opt_contentype) {
        if (!opt_body && !opt_contenttype) { return opt_body; }
        this.__body = opt_body;
        opt_contenttype && this.header({ 'content-type':opt_contenttype });
        return this;
    };
    
    // Tests if the given parameters match against the request
    Request.prototype.matches = function(matchParams) {
        for (var key in matchParams) {
            var prop = matchParams[key];
            //if (key == 'uri' && prop != this.__uri) { return false; }
            if (key == 'method' && prop != this.__method) { return false; }
            // :TODO: better content type matching
            if (key == 'accept' && this.__headers['accept'] && this.__headers['accept'].indexOf(prop) == -1) { return false; }
            if (this.__headers[key] && prop != this.__headers[key]) { return false; }
        }
        return true;
    };
    
    // (ASYNC) Builds the handler chain from the app then runs
    //  - When finished, calls the given cb
    //  - If the request target URI does not start with a hash, will run the remote handler
    Request.prototype.dispatch = function(opt_cb, opt_context) {
        // If remote, use the remote dispatcher
        if (this.__uri.charAt(0) != '#') {
            return LinkApp.remoteDispatcher(this, function(response) {
                opt_cb.call(opt_context, this, response);
            });
        }
        // Build the handler chain
        var handlers = LinkApp.findHandlers(this);
        for (var i=0; i < handlers.length; i++) {
            if (handlers.matchParams.bubble) {
                // Bubble handlers are FILO, so we prepend
                this.prependHandler(handlers[i].cb, handlers[i].module, handlers[i].urimatch, true);
            } else {
                this.appendHandler(handlers[i].cb, handlers[i].module, handlers[i].urimatch, false);
            }
        }
        // Store the dispatcher handler
        this.__dispatcher_handler = { cb:opt_cb, context:opt_context };
        // Begin handling next tick
        setTimeout(function() { this.nextHandler(); }, 0);
    };
    
    // Adds a handler to the beginning of the current chain
    Request.prototype.appendHandler = function(cb, opt_context, opt_urimatch, opt_bubble) {
        var handler = { cb:cb, context:opt_context, urimatch:opt_urimatch };
        if (opt_bubble) { this.__bubble_handlers.unshift(handler); }
        else { this.__capture_handlers.unshift(handler); }
    };
    
    // Adds a handler to the end of the current chain (but never before the original dispatcher's cb)
    Request.prototype.prependHandler = function(cb, opt_context, opt_urimatch, opt_bubble) {
        var handler = { cb:cb, context:opt_context, urimatch:opt_urimatch };
        if (opt_bubble) { this.__bubble_handlers.push(handler); }
        else { this.__capture_handlers.push(handler); }
    };
        
    // Removes all remaining handlers; the dispatcher cb is all that remains
    Request.prototype.clearHandlers = function() {
        this.__capture_handlers.length = 0;
        this.__bubble_handlers.length = 0;
    };
        
    // Shifts the next handler off the chain, then calls it
    Request.prototype.nextHandler = function(response) {
        var handler = this.__capture_handlers.shift();
        if (!handler) { handler = this.__bubble_handlers.shift(); }
        if (!handler) { handler = this.__dispatcher_handler; }
        handler.cb.call(handler.context, this, response, handler.urimatch);
    };
        
    // Builds a response, then calls nextHandler with it
    Request.prototype.respond = function(code, body, contenttype, headers) {
        this.nextHandler((new Response()).code(code).body(body, contenttype).header(headers));
    };

    // Runs the given array of Requests; calls finish_cb with all responses when they finish
    Request.batchDispatch = function(requests, opt_response_cb, opt_finish_cb, opt_context) {
        var responseCount = 0, requestCount = requests.length;
        var reqResps = [];
        for (var i=0; i < requestCount; i++) {
            requests[i].dispatch(function(request, response) {
                // Individual response cb
                responseCount++;
                opt_response_cb && opt_response_cb.call(opt_context, request, response);
                reqResps.push({ request:request, response:response });
                // Finish cb
                if (responseCount == requestCount) {
                    opt_finish_cb && opt_finish_cb.call(opt_context, reqResps);
                }
            }, this);
        }
    };

    // Provides a function to instantiate a request with the given template
    Request.factory = function(opt_method, opt_uri, opt_headers, opt_body, opt_contenttype) {
        return function(opt_rootUri) {
            if (!opt_uri) { opt_uri = ''; }
            if (opt_rootUri) { opt_uri = opt_rootUri.toString() + opt_uri; }
            return new Request(opt_method, opt_uri, opt_headers, opt_body, opt_contenttype);
        }
    }
    
    // :TODO: uri_param()
    
    return Request;
});