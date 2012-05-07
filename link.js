(function() {
    // Set up our namespace
    // (from the backbone guys)
    var Link;
    if (typeof exports != 'undefined') {
        Link = exports;
    } else {
        Link = this.Link = {};
    }

    // Mediator
    // ========
    // passes requests/responses around a uri structure of modules
    var Mediator = function _Mediator(id) {
        this.id = id;
        this.modules = [];
    };

    // Configures the module into the uri structure
    //  - maintains precedence in ordering according to the URI
    //    '#/a' is before '#/a/b' is before '#/a/b/c'
    //  - a duplicate URI is inserted after existing modules
    Mediator.prototype.addModule = function(new_uri, module) {
        module.uri = new_uri;
        module.mediator = this;
        // Find the last URI that fits inside or matches the new one
        var new_uri_len = new_uri.length;
        for (var i=0; i < this.modules.length; i++) {
            // Lower URI? done
            var existing_uri = this.modules[i].uri;
            if ((existing_uri.indexOf(new_uri) == 0) && (new_uri_len < existing_uri.length)) {
                break;
            }
        }
        this.modules.splice(i, 0, module);
    };

    // Gives URIs to modules that match the given regex
    // - if opt_key_index is given, the corresponding group in the regex will be used as they key of
    //   the returned object
    Mediator.prototype.findModules = function(re, opt_key_index) {
        var matched_modules = {};
        // Make sure we have a regexp
        if (typeof(re) == 'string') { re = new RegExp(re, 'i'); }
        for (var i=0; i < this.modules.length; i++) {
            var module = this.modules[i];
            // Does the module's uri match?
            var match = re.exec(module.uri);
            if (match) {
                // Generate the key & store
                var key = (opt_key_index !== undefined ? match[opt_key_index] : i);
                matched_modules[key] = module.uri;
            }
        }
        return matched_modules;
    };

    // Searches modules for handlers for the given request
    //  - returns an array of objects with the keys { cb, module, match, route }
    //  - returns the handlers in the order of module precedence
    Mediator.prototype.findHandlers = function(request) {
        var matched_handlers = [];
        for (var i=0; i < this.modules.length; i++) {
            var module = this.modules[i];
            // See if the module's configured URI fits inside the request URI
            var rel_uri_index = request.uri.indexOf(module.uri);
            if (rel_uri_index != -1) {
                // It does-- pull out the remaining URI and use that to match the request
                var rel_uri = request.uri.substr(module.uri.length);
                for (var j=0; j < module.routes.length; j++) {
                    var route = module.routes[j]
                    var match, matches = {};
                    // Test route params
                    for (var k in route) {
                        match = null;
                        if (k == 'cb' || k == 'bubble') { continue; }
                        // key exists
                        if (!(k in request)) {
                            break;
                        }
                        var reqVal = (k == 'uri' ? rel_uri : request[k]);
                        // convert strings to regexps
                        if (typeof(route[k]) == 'string') { route[k] = new RegExp(route[k], 'i'); }
                        // regexp test
                        if (route[k] instanceof RegExp) {
                            match = route[k].exec(reqVal)
                            if (!match) { break; }
                            matches[k] = match;
                        }
                        // standard equality
                        else {
                            if (route[k] != reqVal) { break; }
                            matches[k] = reqVal;
                            match = true;
                        }
                    }
                    // If match is not truthy, the break condition was a nonmatch
                    if (!match) { continue; }
                    // A match, add to the list
                    var cb = module[route.cb];
                    if (typeof(cb) == 'string') {
                        cb = module[cb];
                    }
                    if (!cb) {
                        throw "Handler callback not found for route";
                    }
                    matched_handlers.push({
                        cb:cb,
                        context:module,
                        match:matches,
                        route:route
                    });
                }
            }
        }
        return matched_handlers;
    };

    // (ASYNC) Builds the handler chain from the request, then runs
    //  - When finished, calls the given cb with the response
    //  - If the request target URI does not start with a hash, will run the remote handler
    var cur_mid = 1;
    Mediator.prototype.dispatch = function(request, opt_cb, opt_context) {
        // Clone the request
        var req_clone = {};
        for (var k in request) {
            req_clone[k] = request[k];
        }
        request = req_clone;
        // Assign an id, for debugging
        request.__mid = cur_mid++;
        // Log
        if (logMode('traffic')) {
            console.log(this.id ? this.id+'|request' : 'request', request.__mid, request.uri, request.accept ? '['+request.accept+']' : '', request);
        }
        // If remote, use ajax
        if (request.uri.charAt(0) != '#') {
            sendAjaxRequest(request, opt_cb, opt_context);
            return;
        }
        // Build the handler chain
        request.__bubble_handlers = [];
        request.__capture_handlers = [];
        var handlers = this.findHandlers(request);
        for (var i=0; i < handlers.length; i++) {
            if (handlers[i].route.bubble) {
                // Bubble handlers are FILO, so we prepend
                request.__bubble_handlers.unshift(handlers[i]);
            } else {
                request.__capture_handlers.push(handlers[i]);
            }
        }
        // Store the dispatcher handler
        request.__dispatcher_handler = { cb:opt_cb, context:opt_context };
        // Begin handling next tick
        var self = this;
        setTimeout(function() { self.runHandlers(request); }, 0);
    };

    // Dispatch sugars
    Mediator.prototype.get = function(request, opt_cb, opt_context) {
        request.method = 'get';
        this.dispatch(request, opt_cb, opt_context);
    };
    Mediator.prototype.post = function(request, opt_cb, opt_context) {
        request.method = 'post';
        this.dispatch(request, opt_cb, opt_context);
    };
    
    // (ASYNC) Responds to `dest_request` with the response from `src_request`
    Mediator.prototype.pipe = function(src_request, dest_request) {
        this.dispatch(src_request, function(response) {
            var handler = dest_request.__dispatcher_handler;
            if (handler) {
                handler.cb.call(handler.context, response);
            }
        });
    };
        
    // Processes the request's handler chain
    Mediator.prototype.runHandlers = function(request, response) {
        // Find next handler
        var handler = request.__capture_handlers.shift();
        if (!handler) { handler = request.__bubble_handlers.shift(); }
        if (handler) {
            // Run the handler
            var promise = handler.cb.call(handler.context, request, response, handler.match);
            Promise.when(promise, function(response) {
                this.runHandlers(request, response);
            }, this);
        } else {
            // Last callback-- create a response if we dont have one
            if (!response) { response = { code:404 }; }
            // Log
            if (logMode('traffic')) {
                console.log(this.id ? this.id+'|response' : 'response', request.__mid, request.uri, response['content-type'] ? '['+response['content-type']+']' : '', response);
            }
            // Send to dispatcher
            handler = request.__dispatcher_handler;
            if (handler && handler.cb) {
                handler.cb.call(handler.context, response);
            }
        }
    };

    // Renders the response to the mediator's element, if it exists
    Mediator.prototype.renderResponse = function(request, response) {
        // Find target element
        var elem = (this.id ? document.getElementById(this.id) : document.body);
        if (!elem) { return; }

        // Set the frame data
        if (request) {
            elem.setAttribute('data-uri', request.uri);
        }
        
        // Render
        if (response) {
            if (response.code != 204 && response.code != 205) {
                elem.innerHTML = response.body;
            }
        }
    };

    // Promise
    // =======
    // a value which can defer fulfillment; used for conditional async
    var Promise = function _Promise() {
        this.is_fulfilled = false;
        this.value = null;
        this.lies_remaining = 0;
        this.then_cbs = [];
    };

    // Runs any `then` callbacks with the given value
    Promise.prototype.fulfill = function(value) {
        // Wait until the lies are over
        if (this.lies_remaining > 0) {
            this.lies_remaining--;
            return;
        }
        this.is_fulfilled = true;
        // Store
        this.value = value;
        // Call thens
        for (var i=0; i < this.then_cbs.length; i++) {
            var cb = this.then_cbs[i];
            cb.func.call(cb.context, value);
        }
    };

    // Adds a callback to be run when the promise is fulfilled
    Promise.prototype.then = function(cb, opt_context) {
        if (!this.is_fulfilled) {
            // Queue for later
            this.then_cbs.push({ func:cb, context:opt_context });
        } else {
            // Call now
            cb.call(opt_context, this.value);
        }
    };
    
    // Tells the promise to ignore `fulfill()` calls until the given number
    // - useful for batch async, when you want to run `then` after they all complete
    Promise.prototype.isLiesUntil = function(fulfill_count) {
        this.lies_remaining = fulfill_count - 1;
    };

    // Will the next `fulfill()` execute the callbacks?
    Promise.prototype.stillLying = function() {
        return (this.lies_remaining > 0);
    };

    // Helper to register a then if the given value is a promise (or call immediately if it's another value)
    Promise.when = function(value, cb, opt_context) {
        if (value instanceof Promise) {
            value.then(cb, opt_context);
        } else {
            cb.call(opt_context, value);
        }
    };    

    // Window Behavior
    // ===============
    // Mediator listening to window events
    var window_mediator = null;
    // Used to avoid duplicate hash-change handling
    var expected_hashchange = null;
    // Hash of enabled logging mods
    var activeLogModes = {};
    
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

    // Helper to send ajax requests
    var sendAjaxRequest = function(request, opt_cb, opt_context) {
        // Create remote request
        var xhrRequest = new XMLHttpRequest();
        xhrRequest.open(request.method, request.uri, true);
        xhrRequest.onreadystatechange = function() {
            // Response received:
            if (xhrRequest.readyState == 4) {
                // Parse headers
                var headers = {};
                var headers_parts = xhrRequest.getAllResponseHeaders().split("\n");
                for (var i=0; i < headers_parts.length; i++) {
                    if (!headers_parts[i]) { continue; }
                    var header_parts = headers_parts[i].toLowerCase().split(': ');
                    headers[header_parts[0]] = header_parts[1];
                }
                // Build the response
                var xhrResponse = headers;
                xhrResponse.code = xhrRequest.status;
                xhrResponse.reason = xhrRequest.statusText;
                xhrResponse.body = xhrRequest.responseText;
                if (logMode('traffic')) {
                    console.log(this.id ? this.id+'|response' : 'response', request.__mid, request.uri, xhrResponse['content-type'] ? '['+xhrResponse['content-type']+']' : '', xhrResponse);
                }
                // Pass on
                opt_cb.call(opt_context, xhrResponse);
            }
        };
        xhrRequest.send(request.body);
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
        var request = {
            method:method,
            uri:target_uri
        };
        if (form.acceptCharset) { request.accept = form.acceptCharset; }

        // Build request body
        if (form.method == 'get') {
            var qparams = [];
            for (var k in data) {
                qparams.push(k + '=' + data[k]);
            }
            target_uri += '?' + qparams.join('&');
            request.uri = target_uri;
        } else {
            request.body = data;
            request['content-type'] = enctype;
        }
        
        // Handle
        followRequest(request);
    };
    
    // Hashchange interceptor -- handles changes to the hash with requests within the application
    var windowHashchangeHandler = function() {
        // Build the request from the hash
        var uri = window.location.hash;
        if (expected_hashchange == uri) {
            expected_hashchange = null; // do nothing if this has been handled elsewhere
            return;
        }
        expected_hashchange = null;
        if (uri == null || uri == '') { uri = '#'; }
        followRequest({ method:'get', uri:uri, accept:'text/html' });
    };

    // Dispatches a request, then renders it to the window on return
    var followRequest = function(request) {
        window_mediator.dispatch(request, function(response) {
            // If a redirect, do that now
            if (response.code >= 300 && response.code < 400) {
                followRequest({ method:'get', uri:response.location, accept:'text/html' });
                return;
            }
            // Render
            window_mediator.renderResponse(request, response);
            // If not a 205 Reset Content, then change our hash
            if (response.code != 205) {
                expected_hashchange = request.uri;
                window.location.hash = request.uri;
            }
        }, this);
    };
    
    // Registers event listeners to the window and handles the current URI
    var attachToWindow = function(mediator) {
        window_mediator = mediator;
        
        // Register handlers
        document.onclick = windowClickHandler;
        document.onsubmit = windowSubmitHandler;
        window.onhashchange = windowHashchangeHandler;
    
        // Now follow the current hash's uri
        var uri = window.location.hash;
        if (uri == null || uri == '') { uri = '#'; }
        followRequest({ method:'get', uri:uri, accept:'text/html' });
    };
    
    // Exports
    // =======
    Link.Promise         = Promise;
    Link.Mediator        = Mediator;
    Link.logMode         = logMode;
    Link.addStylesheet   = addStylesheet;
    Link.attachToWindow  = attachToWindow;
}).call(this);