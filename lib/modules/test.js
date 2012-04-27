define(['link/module', 'link/response'], function(Module, Response) {
    // Test
    // ===
    // Run HTTP requests in the command line
    var Test = Module(function() {
        this.suites = [];
    });

    // Suites
    // ======
    // Create suite
    Test.post({ uri:'^/suite/?$' }, function(request) {
        // New suite
        this.suites.push({
            name: request.body(),
            tests: []
        });
        var id = (this.suites.length - 1);
        request.respond(200, id, 'jso/int');
    });
    // Suite match preprocessor
    Test.route({ uri:'^/suite/([0-9]+)/?' }, function(request, response, urimatch) {
        // Get the suite
        var suite = this.suites[urimatch[1]];
        if (!suite) {
            request.clearHandlers();
            return request.respond(404, 'Suite '+urimatch[1]+' not found');
        }
        request.suite = suite;
        request.nextHandler();
    });
    // Get suite report
    Test.get({ uri:'^/suite/([0-9]+)/?$', accept:'text/html' }, function(request, response, urimatch) {
        // Build html
        var html = '';
        if (request.suite.name) {
            html += '<p><strong>Testing: ' + request.suite.name + '</strong></p>';
        }
        for (var i=0; i < request.suite.tests.length; i++) {
            var test = request.suite.tests[i];
            if (test.passed) {
                html += '<p style="color:#693">&#10004; ' + test.message + '</p>'
            } else {
                html += '<p style="color:#930">&times; ' + test.message + '</p>';
            }
        }
        request.respond(200, html, 'text/html');
    });

    // Individual Tests
    // ================
    Test.post({ uri:'^/suite/([0-9]+)/isok/?$', 'content-type':'jso/array' }, function(request) {
        var param = request.body();
        this.testResult(request, !!param[0], param[0] + " isok" );
    });
    Test.post({ uri:'^/suite/([0-9]+)/fails/?$', 'content-type':'jso/array' }, function(request) {
        var param = request.body();
        this.testResult(request, !param[0], param[0] + " fails");
    });
    Test.post({ uri:'^/suite/([0-9]+)/equals/?$', 'content-type':'jso/array' }, function(request) {
        var param = request.body();
        if (param[0] != param[1]) {
            this.testResult(request, false, param[0] + " != " + param[1]);
        } else {
            this.testResult(request, true, param[0] + " == " + param[1]);
        }
    });
    Test.post({ uri:'^/suite/([0-9]+)/matches/?$', 'content-type':'jso/array' }, function(request) {
        // Request / Response matching
        var param = request.body()
        , testArray = param[0]
        , matchArray = param[1];
        if (!Array.isArray(testArray)) { testArray = [testArray]; }
        if (!Array.isArray(matchArray)) { matchArray = [matchArray]; }
        // # of tested objects match?
        if (testArray.length != matchArray.length) {
            return this.testResult(request, false, "matches (expected:" + matchArray.length + " objects, given: " + testArray.length + ")");
        }
        // Objects match?
        for (var i = 0; i < matchArray.length; i++) {
            var matchObj = matchArray[i], testObj = testArray[i];
            for (var prop in matchObj) {
                // Get value
                var testValue;
                if (prop == 'uri') { testValue = testObj.uri(); }
                else if (prop == 'method') { testValue = testObj.method(); }
                else if (prop == 'code') { testValue = testObj.code(); }
                else { testValue = testObj.header(prop); }
                // Test
                if (testValue != matchObj[prop]) {
                    return this.testResult(request, false, "matches (test." + prop + " = " + testValue + ", match." + prop + " = " + matchObj[prop] + ")");
                }
            }
        }
        this.testResult(request, true, "matches");
    });
    Test.post({ uri:'^/suite/([0-9]+)/' }, function(request, response) {
        // Add the header title to all test messages, if given
        if (response && response.ok() && request.header('message')) {
            request.suite.tests[response.body()].message += ' &middot; ' + request.header('message');
        }
        request.respond(response);
    });
    Test.prototype.testResult = function(request, passed, message) {
        request.suite.tests.push({ passed:passed, message:message });
        request.respond(200, request.suite.tests.length - 1, 'jso/int');
    };
        
            

    return Test;
});