define(["require"], function(require) {
    // Ordered module list
    var appModules = [];
    // Function to dispatch requests to remote resources -- replace with your own method
    var remoteDispatcher = function(request, opt_cb) {
        console.log('Null remote dispatcher received request', request);
    };
    // Used to avoid duplicate hash-change handling
    var expectedHashchange = null;
    
    // Configures the module into the uri structure
    //  - maintains precedence in ordering according to the URI
    //    '#/a' is before '#/a/b' is before '#/a/b/c'
    //  - a duplicate is inserted after existing modules
    var addModule = function(uri, module) {
        // Find the last URI that fits inside or matches the new one
        var wasGettingMatches = true;
        for (var i=0; i < appModules.length; i++) {
            // Does this module's uri partially match the new one?
            var isPartialMatch = (appModules[i].uri().indexOf(uri) == 0);
            if (isPartialMatch) {
                wasGettingMatches = true; // now getting matches
            } 
            if (!isPartialMatch && wasGettingMatches) {
                break; // matches are finished, insert here
            }
        } // no match ever found? i=length, so add to the end:
        appModules.splice(i, 0, module);
    };
    
    // Finds modules by given URI, returns in an object using keyBuilder to create keys
    //  - if keyBuilder is not given, will use numeric indexes
    //  - keyBuilder is passed the results from the regexp exec
    var findModules = function(uriRegexp, opt_keyBuilder) {
        var matchedModules = {};
        // Make sure we have a regexp
        if (typeof(uriRegexp) == 'string') { uriRegexp = new RegExp(uriRegexp, 'i'); }
        for (var i=0; i < appModules.length; i++) {
            var module = appModules[i];
            // Does the module's uri match?
            var match = uriRegex.exec(module.uri());
            if (match) {
                // Generate the key & store
                var key = (opt_keyBuilder ? opt_keyBuilder(match) : i);
                matchedModules[key] = module;
            }
        }
        return matchedModules;
    };

    // Searches modules for handlers for the given request
    //  - returns an array of objects with the keys { cb, module, urimatch, matchParams }
    //  - returns the handlers in the order of module precedence
    var findHandlers = function(request) {
        var matchedHandlers = [];
        for (var i=0; i < appModules.length; i++) {
            var module = appModules[i];
            // See if the module's configured URI fits inside the request URI
            var relUriIndex = request.uri().indexOf(module.uri());
            if (relUriIndex != -1) {
                // It does-- pull out the remaining URI and use that to match the request
                var relUri = request.uri().substr(relUriIndex);
                var handlers = module.get_handlers();
                for (var j=0; j < handlers.length; j++) {
                    var handler = handlers[j];
                    var urimatch;
                    // Test URI first
                    if (handler.matchParams.uri) {
                        urimatch = handler.matchParams.uri.exec(relUri);
                        if (!urimatch) { continue; }
                    }
                    // Test the headers
                    if (!request.matches(handler.matchParams)) {
                        continue;
                    }
                    // A match, add to the list
                    matchedHandlers.push({
                        cb:handler.callback,
                        module:module,
                        urimatch:urimatch,
                        matchParams:handler.matchParams
                    });
                }
            }
        }
        return matchedHandlers;
    };
    
    // Sets up remote dispatcher and anything else to use the jquery instance passed
    var useJQuery = function($) {
        remoteDispatcher = function(request, opt_cb) {
            // :TODO:
            console.log('Todo-- jquery remote dispatcher');
        };
    };

    // Click interceptor -- handles links with requests within the application
    var windowClickHandler = function(e) {
        // Mark as recently clicked, if this (or a parent) is part of a form
        var node = e.target;
        while (node) {
            if (node.form) {
                for (var i=0; i < node.form.length; i++) {
                    node.form[i].setAttribute('clicked', null); // clear the others out, to be safe
                }
                node.setAttribute('clicked', '1');
                break;
            }
            node = node.parentNode;
        }
        
        // Don't handle if a remote link
        var target_uri = e.target.href;
        if (!target_uri || target_uri.charAt(0) != '#') { return; }
        e.preventDefault();
        if (e.stopPropagation) { e.stopPropagation(); }

        // Build request
        var Request = require('./request.js');
        var request = (new Request()).method('get').uri(target_uri).header({ accept:'text/html' });
        
        // Handle
        followRequest(request);
    };

    // Submit interceptor -- handles forms with requests within the application
    var windowSubmitHandler = function(e) {
        var form = e.target;
        var target_uri, enctype, method;

        // Serialize the data
        var data = {};
        for (var i=0; i < form.length; i++) {
            var elem = form[i];
            // If was recently clicked, pull its request attributes-- it's our submitter
            if (elem.getAttribute('clicked') == '1') {
                target_uri = elem.getAttribute('formaction');
                enctype = elem.getAttribute('formenctype');
                method = elem.getAttribute('formmethod');
                elem.setAttribute('clicked', '0');
            }
            if (elem.value) {
                data[elem.name] = elem.value;
            }
        }

        // If no element gave request attributes, pull them from the form
        if (!target_uri) { target_uri = form.action; }
        if (!enctype) { enctype = form.enctype; }
        if (!method) { method = form.method; }

        // No target uri means use the current URI
        var base_uri = form.baseURI;
        var hash_pos = form.baseURI.indexOf('#');
        if (hash_pos != -1) { target_uri = base_uri.substring(hash_pos); }
        
        // Default to the current resource
        if (!target_uri) { target_uri = window.location.hash; }
        
        // Don't handle if a remote link
        if (target_uri.charAt(0) != '#') { return; }
        e.preventDefault();
        if (e.stopPropagation) { e.stopPropagation(); }

        // Build the request
        var Request = require('./request.js');
        var request = (new Request).method(method).uri(target_uri);
        if (form.acceptCharset) { request.header({ 'accept': form.acceptCharset }); }

        // Build request body
        if (form.method == 'get') {
            var qparams = [];
            for (var k in data) {
                qparams.push(k + '=' + data[k]);
            }
            target_uri += '?' + qparams.join('&');
            request.uri(target_uri);
        } else {
            request.body(data, enctype);
        }
        
        // Handle
        followRequest(request);
    };
    
    // Hashchange interceptor -- handles changes to the hash with requests within the application
    var windowHashchangeHandler = function() {
        // Build the request from the hash
        var uri = window.location.hash;
        if (expectedHashchange == uri) {
            expectedHashchange = null; // do nothing if this has been handled elsewhere
            return;
        }
        expectedHashchange = null;
        if (uri == null || uri == '') { uri = '#'; }
        var Request = require('./request.js');
        followRequest((new Request()).method('get').uri(uri).header({ accept:'text/html' }));
    };

    // Dispatches a request, then renders it to the window on return
    var followRequest = function(request) {
        var Request = require('./request.js');
        request.dispatch(function(request, response) {
            // If a redirect, do that now
            if (response.code() >= 300 && response.code() < 400) {
                followRequest(
                    (new Request())
                        .method('get')
                        .uri(response.header('location'))
                        .header({ accept:'text/html' })
                );
                return;
            }
            // Render to window
            response.renderTo(document);
            // If not a 205 Reset Content, then change our hash
            if (response.code() != 205) {
                expectedHashchange = request.uri();
                window.location.hash = request.uri();
            }
        }, this);
    };
    
    // Registers event listeners to the window and handles the current URI
    var init = function() {
        // Register handlers
        document.onclick = windowClickHandler;
        document.onsubmit = windowSubmitHandler;
        window.onhashchange = windowHashchangeHandler;
    
        // Now follow the current hash's uri
        var uri = window.location.hash;
        var Request = require('./request.js');
        if (uri == null || uri == '') { uri = '#'; }
        followRequest((new Request()).method('get').uri(uri).header({ accept:'text/html' }));
    };

    // Exports
    return {
        addModules:addModules,
        findModules:findModules,
        findHandlers:findHandlers,
        remoteDispatcher:remoteDispatcher,
        useJQuery:useJQuery,
        init:init
    };
});