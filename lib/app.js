define(["./request", "./response"], function(Request, Response) {
    // Ordered module list
    var appModules = [];
    // Used to avoid duplicate hash-change handling
    var expectedHashchange = null;
    // Hash of enabled logging mods
    var activeLogModes = {};
    
    // Configures the module into the uri structure
    //  - maintains precedence in ordering according to the URI
    //    '#/a' is before '#/a/b' is before '#/a/b/c'
    //  - a duplicate URI is inserted after existing modules
    var addModule = function(module) {
        // Find the last URI that fits inside or matches the new one
        var wasGettingMatches = true;
        var newUri = module.uri(), newUriLength = newUri.length;
        for (var i=0; i < appModules.length; i++) {
            // Lower URI? done
            var existingUri = appModules[i].uri();
            var newUriMatchesLower = (existingUri.indexOf(newUri) == 0) && (newUriLength < existingUri.length);
            if (newUriMatchesLower) {
                break;
            }
        } // no match ever found? i=length, so add to the end:
        appModules.splice(i, 0, module);
    };
    
    // Finds module resources by given regexp, returns an array of matches
    var findResources = function(uriRegexp) {
        var matches = [];
        // Make sure we have a regexp
        if (typeof(uriRegexp) == 'string') { uriRegexp = new RegExp(uriRegexp, 'i'); }
        for (var i=0; i < appModules.length; i++) {
            var module = appModules[i];
            for (var resourceUri in module.resources) {
                var match = uriRegexp.exec(module.uri() + resourceUri);
                if (match) { matches.push(match); }
            }
        }
        return matches;
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
                var relUri = request.uri().substr(module.uri().length);
                for (var j=0; j < module.routes.length; j++) {
                    var route = module.routes[j]
                    var urimatch;
                    // Test URI first
                    if (route.matchParams.uri) {
                        urimatch = route.matchParams.uri.exec(relUri);
                        if (!urimatch) { continue; }
                    }
                    // Test the headers
                    if (!request.matches(route.matchParams)) {
                        continue;
                    }
                    // A match, add to the list
                    var cb = route.handler;
                    if (typeof(cb) == 'string') {
                        cb = module[cb];
                    }
                    matchedHandlers.push({
                        cb:cb,
                        module:module,
                        urimatch:urimatch,
                        matchParams:route.matchParams
                    });
                }
            }
        }
        return matchedHandlers;
    };

    // Adds a style-sheet to the document
    var addStylesheet = function(url) {
        // :TODO: track added style sheets to avoid duplicates
        // Attach element to head
        if (document.createStyleSheet) {
            document.createStyleSheet(url);
        } else {
            var elem = document.createElement('link');
            elem.href = url;
            elem.rel = "stylesheet";
            elem.media = "screen"; // :TODO: make an option?
            document.head.appendChild(elem);
        }
    };

    // Hash of active logging modes
    var logMode = function(k, v) {
        if (v === undefined) { return activeLogModes[k]; }
        activeLogModes[k] = v;
        return v;
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
        var request = new Request('get', target_uri, { accept:'text/html' });
        
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
        var request = new Request(method, target_uri);
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
        followRequest(new Request('get', uri, { accept:'text/html' }));
    };

    // Dispatches a request, then renders it to the window on return
    var followRequest = function(request) {
        request.dispatch(function(request, response) {
            // If a redirect, do that now
            if (response.code() >= 300 && response.code() < 400) {
                followRequest(new Request('get', response.header('location'), { accept:'text/html' }));
                return;
            }
            // Render to window
            response.renderTo(document.body);
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
        if (uri == null || uri == '') { uri = '#'; }
        followRequest(new Request('get', uri, { accept:'text/html' }));
    };

    // Exports
    return {
        addModule:addModule,
        findResources:findResources,
        findHandlers:findHandlers,
        addStylesheet:addStylesheet,
        logMode:logMode,
        init:init
    };
});