if (typeof define !== 'function') { var define = require('amdefine')(module) }
define(function() {
    // deep copy helper
    // http://keithdevens.com/weblog/archive/2007/Jun/07/javascript.clone
    var deepCopy = function _clone(obj) {
        if (!obj || typeof obj != 'object') { return obj; }
        var c = new obj.constructor();
        for (var k in obj) { c[k] = deepCopy(obj[k]); }
        return c;
    };

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
        var new_uri_slashes = new_uri.split('/').length;
        for (var i=0; i < this.modules.length; i++) {
            // Lower URI? done
            var existing_uri = this.modules[i].uri;
            if ((existing_uri.indexOf(new_uri) == 0) && (new_uri_slashes < existing_uri.split('/').length)) {
                break;
            }
        }
        this.modules.splice(i, 0, { uri:new_uri, inst:module });
    };

    // Removes all matching modules from the structure
    //  - non-regexp `uri` must be an exact match
    Structure.prototype.removeModules = function(uri) {
        if (!(uri instanceof RegExp)) { uri = new RegExp('^'+uri+'$', 'i'); }
        this.modules.forEach(function(m, i) {
            if (uri.test(m.uri)) {
                this.modules.splice(i, 1);
            }
        }, this);
    };

    // Searches modules for handlers for the given request
    //  - returns an array of objects with the keys { cb, module, match, route }
    //  - returns the handlers in the order of module precedence
    Structure.prototype.findHandlers = function(request) {
        var matched_handlers = [];
        for (var i=0; i < this.modules.length; i++) {
            var module = this.modules[i];
            // See if the module's configured URI fits inside the request URI
            var rel_uri_index = request.uri.indexOf(module.uri);
            if (rel_uri_index == 0) {
                // It does-- pull out the remaining URI and use that to match the request
                var rel_uri = request.uri.substr(module.uri.length);
                if (rel_uri.charAt(0) != '/') { rel_uri = '/' + rel_uri; } // prepend the leading slash, for consistency
                // Look for the handler
                for (var j=0; j < module.inst.routes.length; j++) {
                    var route = module.inst.routes[j];
                    var match, matches = {};
                    // Test route params
                    for (var k in route.match) {
                        match = true;
                        // key exists
                        if (!(k in request)) {
                            log('routing', ' > ',module.inst,route.cb,'MISS ('+k+')');
                            match = false;
                            break;
                        }
                        var reqVal = (k == 'uri' ? rel_uri : request[k]);
                        // convert strings to regexps
                        if (typeof(route.match[k]) == 'string') { route.match[k] = new RegExp(route.match[k], 'i'); }
                        // regexp test
                        if (route.match[k] instanceof RegExp) {
                            match = route.match[k].exec(reqVal)
                            if (!match) { 
                                log('routing', ' > ',module.inst,route.cb,'MISS ('+k+' "'+reqVal+'")');
                                break; 
                            }
                            matches[k] = match;
                        }
                        // standard equality
                        else {
                            if (route.match[k] != reqVal) { 
                                log('routing', ' > ',module.inst,route.cb,'MISS ('+k+' "'+reqVal+'")');
                                match = false; break; 
                            }
                            matches[k] = reqVal;
                        }
                    }
                    // Ended the loop because it wasn't a match?
                    if (!match) { continue; }
                    // A match, get the cb
                    log('routing', ' > ',module.inst,route.cb,'MATCH');
                    var cb = module.inst[route.cb];
                    if (!cb) {
                        console.log("Handler callback '" + route.cb + "' not found in object");
                        continue;
                    }
                    matched_handlers.push({
                        cb:cb,
                        context:module.inst,
                        match:matches,
                        bubble:route.bubble
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
    Structure.prototype.dispatch = function(request, opt_cb, opt_context) {
        // Duplicate the request object
        // :TODO: not sure if I want this (complicates obj ref sharing within the browser)
        request = deepCopy(request);
        // Assign an id, for debugging
        Object.defineProperty(request, '__mid', { value:cur_mid++, writable:true });
        // Make any auto-corrections
        if (request.uri.charAt(0) != '/' && /:\/\//.test(request.uri) == false) {
            request.uri = '/' + request.uri;
        }
        // Log
        log('traffic', this.id ? this.id+'|req' : '|> ', request.__mid, request.uri, request.accept ? '['+request.accept+']' : '', request);
        // Pull the query params out, if present
        __processQueryParams(request);
        // Build the handler chain
        var handlers = this.findHandlers(request);        
        Object.defineProperty(request, '__bubble_handlers', { value:[], writable:true });
        Object.defineProperty(request, '__capture_handlers', { value:[], writable:true });
        for (var i=0; i < handlers.length; i++) {
            if (handlers[i].bubble) {
                // Bubble handlers are FILO, so we prepend
                request.__bubble_handlers.unshift(handlers[i]);
            } else {
                request.__capture_handlers.push(handlers[i]);
            }
        }
        // Store the dispatcher handler
        var dispatchPromise = new Promise();
        opt_cb && dispatchPromise.then(opt_cb, opt_context);
        Object.defineProperty(request, '__dispatch_promise', { value:dispatchPromise });
        // Begin handling next tick
        var self = this;
        setTimeout(function() { self.runHandlers(request, mkresponse(0)); }, 0);
        return dispatchPromise;
    };

    // Processes the request's handler chain
    Structure.prototype.runHandlers = function _runHandlers(request, response) {
        // Find next handler
        var handler = request.__capture_handlers.shift();
        if (!handler) { handler = request.__bubble_handlers.shift(); }
        if (handler) {
            // Run the cb
            var promise = handler.cb.call(handler.context, request, handler.match, response);
            when(promise, function(response) {
                this.runHandlers(request, response);
            }, this);
        } else {
            // Out of callbacks -- create a response if we dont have one
            if (!response) { response = mkresponse(404); }
            else if (response.code == 0) { response.code = 404; response.reason = 'not found'; }
            // 404? check remote
            if (response.code == 404) { 
                __dispatchRemote(request);
                return;
            }
            // Log
            log('traffic', this.id ? this.id+'|res' : ' >|', request.__mid, request.uri, response['content-type'] ? '['+response['content-type']+']' : '', response);
            // Decode to object form
            response.body = decodeType(response.body, response['content-type']);
            // Send to original promise
            request.__dispatch_promise.fulfill(response);
        }
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
    };

    // Builds a route object
    var mkroute = function _route(cb, match, bubble) {
        return { cb:cb, match:match, bubble:bubble };
    };

    // Builds a response object
    var mkresponse = function _response(code, body, contenttype, headers) {
        var response = headers || {};
        response.code = code;
        response.body = body || '';
        response['content-type'] = contenttype || '';
        return response;
    };
    
    // Type En/Decoding
    // ================
    var typeEncoders = {};
    var typeDecoders = {};
    // Converts objs/strings to from objs/strings
    var encodeType = function _encodeType(obj, type) {
        // sanity
        if (obj == null || typeof(obj) != 'object' || type == null) {
            return obj;
        }
        // find encoder
        var encoder = __findCoder(typeEncoders, type);
        if (!encoder) { 
            log('err_types', 'Unable to encode', type, '(no encoder found)');
            return obj; 
        }
        // run
        return encoder(obj);
    };
    var decodeType = function _decodeType(str, type) {
        // sanity
        if (str == null || typeof(str) != 'string' || type == null) {
            return str;
        }
        // find decoder
        var decoder = __findCoder(typeDecoders, type);
        if (!decoder) { 
            log('err_types', 'Unable to decode', type, '(no decoder found)');
            return str; 
        }
        // run
        return decoder(str);
    };
    // Adds en/decoders to the registries
    var setTypeEncoder = function _setTypeEncoder(type, fn) {
        typeEncoders[type] = fn;
    };
    var setTypeDecoder = function _setTypeDecoder(type, fn) {
        typeDecoders[type] = fn;
    };
    // Takes a mimetype (text/asdf+html), puts out the applicable types ([text/asdf+html, text/html,text])
    function __mkTypesList(type) {
        // for now, dump the encoding
        var parts = type.split(';');
        var t = parts[0];
        parts = t.split('/');
        if (parts[1]) {
            var parts2 = parts[1].split('+');
            if (parts2[1]) { 
                return [t, parts[0] + '/' + parts2[1], parts[0]];
            }
            return [t, parts[0]];
        }
        return [t];
    };
    // Takes a registry and type, finds the best matching en/decoder
    function __findCoder(registry, type) {
        var types = __mkTypesList(type);
        for (var i=0; i < types.length; i++) {
            if (types[i] in registry) { return registry[types[i]]; }
        }
        return null;
    };
    // Default en/decoders
    setTypeEncoder('application/json', function(obj) {
        return JSON.stringify(obj);
    });
    setTypeDecoder('application/json', function(str) {
        return JSON.parse(str);
    });
    
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
        return this;
    };

    // Helper to register a then if the given value is a promise (or call immediately if it's another value)
    var when = function _when(value, cb, opt_context) {
        if (value instanceof Promise) {
            value.then(cb, opt_context);
        } else {
            cb.call(opt_context, value);
        }
    };

    // Helper to handle multiple promises in one when statement
    var whenAll = function _whenAll(values, cb, opt_context) {
        var total = values.length, fulfilled = 0;
        // if no length, presume an empty array and call back immediately
        if (!total) { return cb.call(opt_context, []); }
        // wait for all to finish
        for (var i=0; i < total; i++) {
            Link.Promise.when(values[i], function(v) {
                values[this.i] = v; // replace with result
                if (++fulfilled == total) {
                    cb.call(opt_context, values);
                }
            }, { i:i });
        }
    };

    // Ajax and Util
    // =============
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

    // Custom logger
    var log = function(channel) {
        if (logMode(channel)) {
            var args = Array.prototype.slice.call(arguments, 1);
            console.log.apply(console, args);
        }
    };

    // Ajax config accessor
    var ajaxConfig = function(k, v) {
        if (v == undefined) { return ajax_config[k]; }
        ajax_config[k] = v;
        return v;
    };

    // Helper to send ajax requests
    var __dispatchRemote = function(request) {
        if (typeof window != 'undefined') {
            __sendAjaxRequest(request);
        }
    };
    var __sendAjaxRequest = function(request) {
        // Create remote request
        var xhrRequest = new XMLHttpRequest();
        var target_uri = request.uri;
        // Use the proxy, if enabled
        if (ajax_config.proxy) {
            request[ajax_config.proxy_header] = request.uri;
            target_uri = ajax_config.proxy;
        }
        // Add the query
        if (request.query) {
            var q = [];
            for (var k in request.query) {
                q.push(k+'='+request.query[k]);
            }
            if (q.length) {
                target_uri += '?' + q.join('&');
            }
        }
        // Encode the body
        request.body = encodeType(request.body, request['content-type']);
        xhrRequest.open(request.method, target_uri, true);
        // Set the request headers
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
                var hp = xhrRequest.getAllResponseHeaders().split("\n");
                var hpp;
                // :NOTE: a bug in firefox causes getAllResponseHeaders to return an empty string on CORS
                // we either need to bug them, or iterate the headers we care about with getResponseHeader
                for (var i=0; i < hp.length; i++) {
                    if (!hp[i]) { continue; }
                    hpp = hp[i].toLowerCase().replace('\r','').split(': ');
                    headers[hpp[0]] = hpp[1];
                }
                // Build the response
                var xhrResponse = headers;
                xhrResponse.code = xhrRequest.status;
                xhrResponse.reason = xhrRequest.statusText;
                xhrResponse.body = xhrRequest.responseText;
                // Decode into an object (if possible)
                xhrResponse.body = decodeType(xhrResponse.body, xhrResponse['content-type']);
                // Log
                log('traffic', this.id ? this.id+'|res' : ' >|', request.__mid, request.uri, xhrResponse['content-type'] ? '['+xhrResponse['content-type']+']' : '', xhrResponse);
                // Send to original promise
                request.__dispatch_promise.fulfill(xhrResponse);
            }
        };
        xhrRequest.send(request.body);
    };

    // Exports
    // =======
    return {
        Promise        : Promise,
        when           : when,
        whenAll        : whenAll,
        Structure      : Structure,
        setTypeEncoder : setTypeEncoder,
        setTypeDecoder : setTypeDecoder,
        encodeType     : encodeType,
        decodeType     : decodeType,
        route          : mkroute,
        response       : mkresponse,
        logMode        : logMode,
        log            : log,
        ajaxConfig     : ajaxConfig
    };
});
