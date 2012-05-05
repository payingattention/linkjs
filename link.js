(function() {
    // Set up our namespace
    // (from the backbone guys)
    var Link;
    if (typeof exports != 'undefined') {
        Link = exports;
    } else {
        Link = this.Link = {};
    }

    // ModuleMediator
    // ==============
    // passes requests/responses around a uri structure of modules
    var ModuleMediator = function _ModuleMediator(id) {
        this.id = id;
        this.app_modules = [];
        this.child_mediators = {};
    };
    
    // Creates a child mediator structure
    // - used for browser frames
    ModuleMediator.prototype.addFrame = function(name) {
        if (name in this.child_mediators) { return this.child_mediators[name]; }
        this.child_mediators[name] = new ModuleMediator(name);        
    };
    
    // Get a child frame
    ModuleMediator.prototype.getFrame = function(name) {
        return this.child_mediators[name];
    };

    // Configures the module into the uri structure
    //  - maintains precedence in ordering according to the URI
    //    '#/a' is before '#/a/b' is before '#/a/b/c'
    //  - a duplicate URI is inserted after existing modules
    ModuleMediator.prototype.addModule = function(new_uri, module) {
        // Find the last URI that fits inside or matches the new one
        module.uri = new_uri;
        var new_uri_len = new_uri.length;
        for (var i=0; i < this.app_modules.length; i++) {
            // Lower URI? done
            var existing_uri = this.app_modules[i].uri;
            if ((existing_uri.indexOf(new_uri) == 0) && (new_uri_len < existing_uri.length)) {
                break;
            }
        }
        this.app_modules.splice(i, 0, module);
    };

    // Gives URIs to modules that match the given regex
    // - if opt_key_index is given, the corresponding group in the regex will be used as they key of
    //   the returned object
    ModuleMediator.prototype.findModules = function(re, opt_key_index) {
        var matched_modules = {};
        // Make sure we have a regexp
        if (typeof(re) == 'string') { re = new RegExp(re, 'i'); }
        for (var i=0; i < this.app_modules.length; i++) {
            var module = this.app_modules[i];
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
    //  - returns an array of objects with the keys { cb, module, urimatch, route }
    //  - returns the handlers in the order of module precedence
    ModuleMediator.prototype.findHandlers = function(request) {
        var matched_handlers = [];
        for (var i=0; i < this.app_modules.length; i++) {
            var module = this.app_modules[i];
            // See if the module's configured URI fits inside the request URI
            var rel_uri_index = request.uri.indexOf(module.uri);
            if (rel_uri_index != -1) {
                // It does-- pull out the remaining URI and use that to match the request
                var rel_uri = request.uri.substr(module.uri.length);
                for (var j=0; j < module.routes.length; j++) {
                    var route = module.routes[j]
                    var urimatch;
                    // Test URI first
                    if (route.uri) {
                        urimatch = route.uri.exec(rel_uri);
                        if (!urimatch) { continue; }
                    }
                    // Test the rest
                    var no_match = false;
                    for (var k in route) {
                        if (k == 'uri') { continue; }
                        if (route[k] instanceof RegExp) {
                            if (!route[k].test(request[k])) {
                                no_match = true;
                                break;
                            }
                        } else {
                            if (route[k] != request[pk]) {
                                no_match = true;
                                break;
                            }
                        }
                    }
                    if (no_match) { continue; }
                    // A match, add to the list
                    var cb = route.handler;
                    if (typeof(cb) == 'string') {
                        cb = module[cb];
                    }
                    matched_handlers.push({
                        cb:cb,
                        module:module,
                        urimatch:urimatch,
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
    ModuleMediator.prototype.dispatch = function(request, opt_cb, opt_context) {
        // Assign an id, for debugging
        request.__mid = cur_mid++;
        // Log
        if (linkApp.logMode('traffic')) {
            console.log('[traffic]', request.mid, request, request.uri, request.accept ? '['+request.accept+']' : '');
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
        this.__dispatcher_handler = { cb:opt_cb, context:opt_context };
        // Begin handling next tick
        var self = this;
        setTimeout(function() { self.runHandlers(request); }, 0);
    };

    // Dispatch sugars
    ModuleMediator.prototype.get = function(request, opt_cb, opt_context) {
        request.method = 'get';
        this.dispatch(request, opt_cb, opt_context);
    };
    ModuleMediator.prototype.post = function(request, opt_cb, opt_context) {
        request.method = 'post';
        this.dispatch(request, opt_cb, opt_context);
    };
    
    // (ASYNC) Responds to `dest_request` with the response from `src_request`
    ModuleMediator.prototype.pipe = function(src_request, dest_request) {
        this.dispatch(src_request, function(response) {
            var handler = dest_request.__dispatcher_handler;
            if (handler) {
                handler.cb.call(handler.context, response);
            }
        });
    };
        
    // Processes the request's handler chain
    ModuleMediator.prototype.runHandlers = function(request, opt_cur_response) {
        // Find next handler
        var handler = request.__capture_handlers.shift();
        if (!handler) { handler = request.__bubble_handlers.shift(); }
        if (!handler) {
            handler = request.__dispatcher_handler;
            // Last callback-- create a response if we dont have one
            if (!response) { response = { code:404 }; }
            // Log
            if (logMode('traffic')) {
                console.log('[traffic]', request.mid, response, request.uri, response.contenttype ? '['+response.contenttype+']' : '');
            }
        }
        if (!handler || !handler.cb) {
            this.renderResponse(request, opt_cur_response);
            return;
        } // we're done
        // Run the handler
        var promise = handler.cb.call(handler.context, request, opt_cur_response, handler.urimatch);
        var self = this;
        Promise.when(promise, function(response) {
            self.runHandlers(request, response);
        });
    };

    // Renders the response to the mediator's element, if it exists
    ModuleMediator.prototype.renderResponse = function(request, response) {
        // Find target element
        var elem = (this.id ? document.getElementById(this.id) : document.body);
        if (!elem) { return; }

        // Set the frame data
        if (request) {
            elem.setAttribute('data-frame-uri', request.uri);
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
        this.lies_remaining = fulfill_count;
    };

    // Are we still lying?
    Promise.prototype.isStillLies = function() {
        return (this.lies_remaining > 0);
    };

    // Helper to register a then if the given value is a promise (or call immediately if it's another value)
    Promise.when = function(value, cb, opt_context) {
        if (value instanceof Promise) {
            promise.then(cb, opt_context);
        } else {
            cb.call(opt_context, value);
        }
    };    

    // Window Behavior
    // ===============
    // The top-level mediator for the app
    var main_frame = new ModuleMediator();
    // Used to avoid duplicate hash-change handling
    main_frame.expected_hashchange = null;
    // Hash of enabled logging mods
    main_frame.activeLogModes = {};
    
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
    var sendAjaxRequest = function(request, opt_cb, opt_cb_context) {
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
                if (linkApp.logMode('traffic')) {
                    console.log('[traffic]', request.__mid, xhrResponse, request.uri, xhrResponse.contenttype ? '['+xhrResponse.contenttype+']' : '');
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
            request.contenttype = enctype;
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
        main_frame.dispatch(request, function(response) {
            // If a redirect, do that now
            if (response.code >= 300 && response.code < 400) {
                followRequest({ method:'get', uri:response.location, accept:'text/html' });
                return;
            }
            // Render to window
            // :TODO: move to the frame
            //renderResponse(document.body);
            // If not a 205 Reset Content, then change our hash
            if (response.code() != 205) {
                expected_hashchange = request.uri;
                window.location.hash = request.uri;
            }
        }, this);
    };
    
    // Registers event listeners to the window and handles the current URI
    var attachToWindow = function() {
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
    // Promises
    Link.Promise        = Promise;
    // Frames
    Link.addFrame       = main_frame.addFrame;
    Link.getFrame       = main_frame.getFrame;
    // Modules
    Link.addModule      = main_frame.addModule;
    Link.findModules    = main_frame.findModules;
    // Requests
    Link.dispatch       = main_frame.dispatch;
    Link.get            = main_frame.get;
    Link.post           = main_frame.post;
    Link.pipe           = main_frame.pipe;
    // Util
    Link.addStylesheet  = addStyleSheet;
    Link.logMode        = logMode;
    // Window
    Link.attachToWindow = attachToWindow;
}).call(this);