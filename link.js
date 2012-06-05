(function() {
    // Set up our namespace
    var Link;
    if (typeof exports != 'undefined') {
        Link = exports;
    } else {
        Link = this.Link = {};
    }

    // Structure
    // =========
    // passes requests/responses around a uri structure of modules
    var Structure = function _Structure(id) {
        this.id = id;
        this.modules = [];
    };

    // Configures the module into the uri structure
    //  - maintains precedence in ordering according to the URI
    //    '#/a' is before '#/a/b' is before '#/a/b/c'
    //  - a duplicate URI is inserted after existing modules
    Structure.prototype.addModule = function(new_uri, module) {
        // Find the last URI that fits inside or matches the new one
        var new_uri_len = new_uri.length;
        for (var i=0; i < this.modules.length; i++) {
            // Lower URI? done
            var existing_uri = this.modules[i].uri;
            if ((existing_uri.indexOf(new_uri) == 0) && (new_uri_len < existing_uri.length)) {
                break;
            }
        }
        this.modules.splice(i, 0, { uri:new_uri, inst:module });
    };

    // Searches modules for handlers for the given request
    //  - returns an array of objects with the keys { cb, module, match, route }
    //  - returns the handlers in the order of module precedence
    Structure.prototype.findHandler = function(request) {
        for (var i=0; i < this.modules.length; i++) {
            var module = this.modules[i];
            // See if the module's configured URI fits inside the request URI
            var rel_uri_index = request.uri.indexOf(module.uri);
            if (rel_uri_index != -1) {
                // It does-- pull out the remaining URI and use that to match the request
                var rel_uri = request.uri.substr(module.uri.length);
                if (rel_uri.charAt(0) != '/') { rel_uri = '/' + rel_uri; } // prepend the leading slash, for consistency
                // Look for the handler
                for (var handlerName in module.inst.routes) {
                    var route = module.inst.routes[handlerName]
                    var match, matches = {};
                    // Test route params
                    for (var k in route) {
                        match = true;
                        // key exists
                        if (!(k in request)) {
                            match = false;
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
                            if (route[k] != reqVal) { match = false; break; }
                            matches[k] = reqVal;
                        }
                    }
                    // Ended the loop because it wasn't a match?
                    if (!match) { continue; }
                    // A match, get the cb
                    var cb = module.inst[handlerName];
                    if (!cb) { throw "Handler callback '" + handlerName + "' not found in object"; }
                    return {
                        cb:cb,
                        context:module.inst,
                        match:matches
                    };
                }
            }
        }
        return null;
    };

    // (ASYNC) Finds a handler from the request, then runs
    //  - When finished, calls the given cb with the response
    //  - If the request target URI does not start with a hash, will run the remote handler
    var cur_mid = 1;
    Structure.prototype.dispatch = function(request, opt_cb, opt_context) {
        // Assign an id, for debugging
        Object.defineProperty(request, '__mid', { value:cur_mid++, writable:true });
        // Log
        if (logMode('traffic')) {
            console.log(this.id ? this.id+'|req' : 'req', request.__mid, request.uri, request.accept ? '['+request.accept+']' : '', request);
        }
        // If in browser & no hash, use ajax
        if (typeof window !== 'undefined' && request.uri.charAt(0) != '#') {
            __sendAjaxRequest(request, opt_cb, opt_context);
            return;
        }
        // Pull the query params out, if present
        __processQueryParams(request);
        // Find the handler
        var handler = this.findHandler(request);
        // Store the dispatcher handler
        var dispatchPromise = new Promise();
        opt_cb && dispatchPromise.then(opt_cb, opt_context);
        // Handle next tick, to guarantee async
        var self = this;
        setTimeout(function() {
            // Run the cb
            var response;
            if (handler) { response = handler.cb.call(handler.context, request, handler.match); }
            else { response = { code:404, reason:'not found' }; }
            // Log
            if (logMode('traffic')) {
                console.log(this.id ? this.id+'|res' : 'res', request.__mid, request.uri, response['content-type'] ? '['+response['content-type']+']' : '', response);
            }            
            // When the promise is fulfilled, pass on to the dispatcher promise
            Promise.when(response, function(response) {
                dispatchPromise.fulfill(response);
            }, this);
        }, 0);
        return dispatchPromise;
    };

    // Dispatch sugars
    Structure.prototype.get = function(request, opt_cb, opt_context) {
        request.method = 'get';
        return this.dispatch(request, opt_cb, opt_context);
    };
    Structure.prototype.post = function(request, opt_cb, opt_context) {
        request.method = 'post';
        return this.dispatch(request, opt_cb, opt_context);
    };

    // Pulls the query params into the request.query object
    var __processQueryParams = function(request) {
        if (request.uri && request.uri.indexOf('?') != -1) {
            request.query = [];
            // pull uri out
            var parts = request.uri.split('?');
            request.uri = parts.shift();
            // iterate the values
            parts = parts.join('').split('&');
            for (var i=0; i < parts.length; i++) {
                var kv = parts[i].split('=');
                request.query[kv[0]] = kv[1];
            }
        }
    }

    // Type Interfaces
    // ===============
    // stores the prototypes for interfaces to mimetypes
    var mime_iface_prototypes = {};

    // Interface object builder
    // - creates prototype chain of 'a'=a, 'a/b'=a->b, 'a/c+b'=a->b->c
    //   (which stays true to how mimetypes describe parenthood)
    var __ensureInterface = function(mimetype) {
        // pull out the names
        var re = new RegExp('([^/]+)(?:/([^+]+)(?:[+](.*))?)?','i');
        var match = re.exec(mimetype);
        var a = match[1];
        var ab = (match[3] ? a + '/' + match[3] : null);
        if (!ab && match[2]) { ab = a + '/' + match[2]; }
        var abc = mimetype;
        // build as needed
        var ctor = function() {};
        if (a && !(a in mime_iface_prototypes)) {            
            ctor.prototype = mime_iface_prototypes['*'];
            mime_iface_prototypes[a] = new ctor();
            mime_iface_prototypes[a].mimetype = a;
        }
        if (ab && !(ab in mime_iface_prototypes)) {
            ctor.prototype = mime_iface_prototypes[a];
            mime_iface_prototypes[ab] = new ctor();
            mime_iface_prototypes[ab].mimetype = ab;
        }
        if (abc && !(abc in mime_iface_prototypes)) {
            ctor.prototype = mime_iface_prototypes[ab];
            mime_iface_prototypes[abc] = new ctor();
            mime_iface_prototypes[abc].mimetype = abc;
        }
        return mime_iface_prototypes[mimetype];
    };

    // Get/create an interface
    var getTypeInterface = function(mimetype, data) {
        // if no mimetype is given, default it
        var datatype = typeof data;
        if (!mimetype) {
            if (datatype != 'undefined') {
                mimetype = (datatype == 'string') ? 'text/plain' : 'js/object';
            } else {
                return null; // null in, null out
            }
        }
        // strip off any extraneous data in the type
        var index = mimetype.indexOf(';');
        if (index != -1) { mimetype = mimetype.substring(0, index); }
        // get prototype
        var prototype = __ensureInterface(mimetype);
        // Instantiate a copy of the interface, to protect it from outsiders
        var Interface = function(data) { this.setData(data); }
        Interface.prototype = prototype;
        return new Interface(data);
    };

    // Add members to the interface
    var addToType = function(mimetype, obj, opt_force_overwrite) {
        // get prototype
        var proto = __ensureInterface(mimetype);
        // blend in new members
        for (var k in obj) {
            if (!opt_force_overwrite && proto.hasOwnProperty(k)) { continue; }
            proto[k] = obj[k];
        }
    };

    // Default Interfaces
    // ==================
    addToType('*', {
        setData:function(data) { this.data = data; return this; },
        getData:function() { return this.data; },
        toObject:function() { return this.getData(); },
        toString:function() { return this.getData().toString(); },
        convertToType:function(type) {
            // this is very imprecise; override with your type's needs
            if (!type || type == this.mimetype || type == '*/*') { return this.getData(); }
            if (type.indexOf('html') != -1) { return this.toHtml ? this.toHtml() : this.toString(); }
            if (type.indexOf('json') != -1) { return this.toJson ? this.toJson() : this.toString(); }
            if (type.indexOf('js') != -1 && type.indexOf('object') != -1) { return this.toObject ? this.toObject() : this.getData(); }
            if (type.indexOf('text') != -1) { return this.toString(); }
            return null;
        }
    });
    addToType('js/object', {
        setData:function(new_data) {
            this.data = (typeof new_data != 'object') ? { value:new_data } : new_data;
            return this;
        },
        toHtml:function() { return objToHtml(this.data); },
        toJson:function() { return JSON.stringify(this.data); },
        toObject:function() { return this.data; },
        toString:function() { return this.data.toString(); }
    });
    addToType('application/json', {
        setData:function(data) {
            this.data = (typeof data != 'string') ? JSON.stringify(data) : data;
            return this;
        },
        toHtml:function() { return '<span class="linkjs-json">'+this.data+'</span>'; }, // :TODO: prettify?
        toJson:function() { return this.data; },
        toObject:function() { return JSON.parse(this.data); },
        toString:function() { return this.data; }
    });
    addToType('text', {
        setData:function(data) {
            this.data = (typeof data != 'string') ? data.toString() : data;
            return this;
        },
        toHtml:function() { return '<span class="linkjs-text">'+this.data+'</span>'; },
        toJson:function() { return JSON.stringify({ text:this.data }); },
        toObject:function() { return { text:this.data }; },
        toString:function() { return this.data; }
    });
    addToType('text/html', {
        setData:function(data) {
            this.data = (typeof data != 'string') ? data.toString() : data;
            return this;
        },
        toHtml:function() { return this.data; },
        toJson:function() { return JSON.stringify({ html:this.data }); },
        toObject:function() { return { html:this.data }; }
    });
    addToType('application/x-www-form-urlencoded', {
        setData:function(data) {
            if (typeof data == 'object') {
                var parts = [];
                for (var k in data) {
                    parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(data[k]));
                }
                this.data = parts.join('&');
            }
            else {
                this.data = '' + data;
            }
            return this;
        },
        toHtml:function() { return '<span class="linkjs-x-www-form-urlencoded">'+this.data+'</span>'; },
        toJson:function() { return JSON.stringify(this.toObject()); },
        toObject:function() {
            var obj = {};
            var parts = this.data.split('&');
            for (var i=0; i < parts.length; i++) {
                var kv = parts[i].split('=');
                obj[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1]);
            }
            return obj;
        },
        toString:function() { return this.data; }
    });
    
    // Helpers
    // =======
    var objToHtml = function(obj) {
        var html = ['<ul class="linkjs-object">'];
        for (var k in obj) {
            html.push('<li><strong>', k, '</strong>:');
            if (typeof obj[k] == 'function') {
                html.push('[Function]');
            } else if (typeof obj[k] == 'object') {
                html.push(objToHtml(obj[k]));
            } else {
                html.push(obj[k]);
            }
            html.push('</li>');
        }
        html.push('</ul>');
        return html.join('');
    };
    
    // Promise
    // =======
    // a value which can defer fulfillment; used for conditional async
    var Promise = function _Promise() {
        this.is_fulfilled = false;
        this.value = null;
        this.then_cbs = [];
    };

    // Runs any `then` callbacks with the given value
    Promise.prototype.fulfill = function(value) {
        if (this.is_fulfilled) { return; }
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
    // Structure listening to window events
    var window_structure = null;
    // Handler for window responses
    var window_handler = { cb:null, context:null };
    // Used to avoid duplicate hash-change handling
    var expected_hashchange = null;
    // Hash of enabled logging mods
    var active_log_modes = {};
    // Configures remote requests in the browser (proxy)
    var ajax_config = {
        proxy:null,
        proxy_header:'x-proxy-dest',
    };
    
    // Hash of active logging modes
    var logMode = function(k, v) {
        if (v === undefined) { return active_log_modes[k]; }
        active_log_modes[k] = v;
        return v;
    };

    // Ajax config accessor
    var ajaxConfig = function(k, v) {
        if (v == undefined) { return ajax_config[k]; }
        ajax_config[k] = v;
        return v;
    };

    // Helper to send ajax requests
    var __sendAjaxRequest = function(request, opt_cb, opt_context) {
        // Create remote request
        var xhrRequest = new XMLHttpRequest();
        var target_uri = request.uri;
        // Use the proxy, if enabled
        if (ajax_config.proxy) {
            request[ajax_config.proxy_header] = request.uri;
            target_uri = ajax_config.proxy;
        }
        xhrRequest.open(request.method, target_uri, true);
        for (var k in request) {
            if (k == 'method' || k == 'uri' || k == 'body') { continue; }
            if (k.indexOf('__') == 0) { continue; }
            var header = request[k];
            if (header == 'object') {
                if (header.length) { header = header.join(' '); }
                else { header = header.toString(); }
            }
            xhrRequest.setRequestHeader(k, header);
        }
        xhrRequest.onreadystatechange = function() {
            // Response received:
            if (xhrRequest.readyState == 4) {
                // Parse headers
                var headers = {};
                var headers_parts = xhrRequest.getAllResponseHeaders().split("\n");
                // :NOTE: a bug in firefox causes getAllResponseHeaders to return an empty string on CORS
                // we either need to bug them, or iterate the headers we care about with getResponseHeader
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
                    console.log(this.id ? this.id+'|res' : 'res', request.__mid, request.uri, xhrResponse['content-type'] ? '['+xhrResponse['content-type']+']' : '', xhrResponse);
                }
                // Pass on
                opt_cb.call(opt_context, xhrResponse);
            }
        };
        xhrRequest.send(request.body);
    };

    // Click interceptor -- helps with form submissions
    var __windowClickHandler = function(e) {
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
    };

    // Submit interceptor -- handles forms with requests within the application
    var __windowSubmitHandler = function(e) {
        var form = e.target;
        var target_uri, enctype, method;

        // :NOTE: a lot of default browser behaviour has to (?) be emulated here

        // Serialize the data
        var data = {};
        for (var i=0; i < form.length; i++) {
            var elem = form[i];
            // Pull value if it has one
            if (elem.value) {
                // don't pull from buttons unless recently clicked
                if (elem.tagName == 'button' || (elem.tagName == 'input' && (elem.type == 'button' || elem.type == 'submit')) ){
                    if (elem.getAttribute('clicked')) {
                        data[elem.name] = elem.value;
                    }
                } else {
                    data[elem.name] = elem.value;
                }
            }
            // If was recently clicked, pull its request attributes-- it's our submitter
            if (elem.getAttribute('clicked') == '1') {
                target_uri = elem.getAttribute('formaction');
                enctype = elem.getAttribute('formenctype');
                method = elem.getAttribute('formmethod');
                elem.setAttribute('clicked', '0');
            }
        }

        // If no element gave request attributes, pull them from the form
        if (!target_uri) { target_uri = form.action; }
        if (!enctype) { enctype = form.enctype; }
        if (!method) { method = form.method; }

        // Convert the data to the given enctype
        if (!enctype) { enctype = 'js/object'; }
        data = getTypeInterface(enctype, data).getData();
        
        // Strip the base URI
        var base_uri = window.location.href.split('#')[0];
        if (target_uri.indexOf(base_uri) != -1) {
            target_uri = target_uri.substring(base_uri.length);
        }
        
        // Default to the current resource
        if (!target_uri) { target_uri = window.location.hash; }
        
        // Don't handle if a remote link
        //if (target_uri.charAt(0) != '#') { return; }
        e.preventDefault();
        if (e.stopPropagation) { e.stopPropagation(); }

        // Build the request
        var request = {
            method:method,
            uri:target_uri,
            accept:'text/html'
        };
        if (form.acceptCharset) { request.accept = form.acceptCharset; }

        // Build request body
        if (form.method == 'get') {
            var qparams = [];
            for (var k in data) {
                qparams.push(k + '=' + data[k]);
            }
            if (qparams.length) {
                target_uri += '?' + qparams.join('&');
                request.uri = target_uri;
            }
        } else {
            request.body = data;
            request['content-type'] = enctype;
        }
        
        // Handle
        followRequest(request);
    };
    
    // Hashchange interceptor -- handles changes to the hash with requests within the application
    var __windowHashchangeHandler = function() {
        // Build the request from the hash
        var uri = window.location.hash;
        if (expected_hashchange == uri || (expected_hashchange == '#' && uri == '')) {
            expected_hashchange = null; // do nothing if this has been handled elsewhere
            return;
        }
        expected_hashchange = null;
        if (uri == null || uri == '') { uri = '#'; }
        followRequest({ method:'get', uri:uri, accept:'text/html' });
    };

    // Dispatches a request, then renders it to the window on return
    var followRequest = function(request) {
        window_structure.dispatch(request, function(response) {
            // If a redirect, do that now
            if (response.code >= 300 && response.code < 400) {
                followRequest({ method:'get', uri:response.location, accept:'text/html' });
                return;
            }
            // Pass on to handler
            if (window_handler.cb) {
                window_handler.cb.call(window_handler.context, request, response);
            }
            // If not a 205 Reset Content, then change our hash
            if (response.code != 205) {
                var uri = request.uri;
                if (response['content-location']) { uri = response['content-location']; }
                if (uri.charAt(0) != '#') { uri = '#' + uri; }
                expected_hashchange = uri;
                window.location.hash = uri;
            }
        }, this);
    };
    
    // Registers event listeners to the window and handles the current URI
    var attachToWindow = function(structure, opt_response_cb, opt_response_cb_context) {
        window_structure = structure;
        window_handler = { cb:opt_response_cb, context:opt_response_cb_context };
        
        // Register handlers
        document.onclick = __windowClickHandler;
        document.onsubmit = __windowSubmitHandler;
        window.onhashchange = __windowHashchangeHandler;
    
        // Now follow the current hash's uri
        var uri = window.location.hash;
        if (uri == null || uri == '') { uri = '#'; }
        followRequest({ method:'get', uri:uri, accept:'text/html' });
    };
    
    // Exports
    // =======
    Link.Promise          = Promise;
    Link.Structure        = Structure;
    Link.addToType        = addToType;
    Link.getTypeInterface = getTypeInterface;
    Link.logMode          = logMode;
    Link.ajaxConfig       = ajaxConfig;
    Link.attachToWindow   = attachToWindow;
}).call(this);