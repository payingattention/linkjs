// Core
// ====
(function(exports) {
	// stores local server functions
	var httpl_registry = {};
	// keeps the current message id, used for tracking messages
	var cur_mid = 1;
	function gen_mid() { return cur_mid++; }

	// request()
	// =========
	// EXPORTED
	// HTTP request dispatcher
	// - all parameters except `options` are optional
	// - `options` param:
	//   - requires `method` and the target url
	//   - target url can be passed in options as `url`, or generated from `host` and `path`
	//   - query parameters may be passed in `query`
	//   - extra request headers may be specified in `headers`
	//   - if `stream` is true, the callbacks will be called as soon as headers are received
	// - on success (status code 2xx), `okCb` is called with (payload, headers)
	// - on failure (status code 4xx,5xx), `errCb` is called with (payload, headers)
	// - all protocol (status code 1xx,3xx) is handled internally
	function request(payload, options, okCb, errCb, cbContext) {

		// were we passed (options, okCb, errCb, context)?
		if (typeof payload === 'function') {
			options = arguments[0];
			okCb    = arguments[1];
			errCb   = arguments[2];
			context = arguments[3];
			payload = null;
		}
		if (!options) { throw "no options provided to request"; }

		// sane defaults
		okCb  = okCb  || noop;
		errCb = errCb || noop;
		options.headers = options.headers || {};

		// parse the url
		var urld;
		if (options.url) {
			urld = Link.parse.url(options.url);
		} else {
			urld = Link.parse.url(__joinUrl(options.host, options.path));
		}
		if (!urld) {
			throw "no URL or host/path provided in request options";
		}

		// execute according to protocol
		options.mid = gen_mid();
		if (urld.protocol == 'httpl') {
			__requestLocal(payload, urld, options, okCb, errCb, cbContext);
		} else {
			__requestRemote(payload, urld, options, okCb, errCb, cbContext);
		}
	}

	function subscribe(options, okCb, errCb, cbContext) {
		// :TODO:
	}

	// executes a request locally
	function __requestLocal(payload, urld, options, okCb, errCb, cbContext) {

		// find the local server
		var server = httpl_registry[urld.host];
		if (!server) {
			return errCb.call(cbContext, null, { status:404, reason:'server not found' }, false);
		}

		// build the request
		var request = {
			mid     : options.mid,
			path    : urld.path,
			method  : options.method,
			query   : options.query || {},
			headers : options.headers || {},
			body    : payload
		};

		// if the urld has query parameters, mix them into the request's query object
		if (urld.query) {
			var q = Link.contentTypes.deserialize(urld.query, 'application/x-www-form-urlencoded');
			for (var k in q) {
				request.query[k] = q[k];
			}
		}

		// pass on to the server
		var response = new ServerResponse({ okCb:okCb, errCb:errCb, cbContext:cbContext, stream:options.stream });
		server.fn.call(server.context, request, response);
	}

	// executes a request remotely
	function __requestRemote(payload, urld, options, okCb, errCb, cbContext) {

		// if a query was given in the options, add it to the urld
		if (request.query) {
			var q = Link.contentTypes.serialize(request.query, 'application/x-www-form-urlencoded');
			if (q) {
				if (urld.query) {
					urld.query    += '&' + q;
					urld.relative += '&' + q;
				} else {
					urld.query     =  q;
					urld.relative += '?' + q;
				}
			}
		}

		if (window) {
			__requestRemoteBrowser(payload, urld, options, okCb, errCb, cbContext);
		} else {
			__requestRemoteNodejs(payload, urld, options, okCb, errCb, cbContext);
		}
	}

	// executes a remote request in the browser
	function __requestRemoteBrowser(payload, urld, options, okCb, errCb, cbContext) {

		// assemble the final url
		var url = (urld.protocol || 'http') + '://' + urld.authority + urld.relative;

		// make sure our payload is serialized
		if (payload) {
			options.headers['content-type'] = options.headers['content-type'] || 'application/json';
			if (typeof payload !== 'string') {
				payload = Link.contentTypes.serialize(payload, options.headers['content-type']);
			}
		}

		// create the request
		var xhrRequest = new XMLHttpRequest();
		xhrRequest.open(options.method, url, true);

		for (var k in options.headers) {
			if (options.headers[k] !== null) {
				xhrRequest.setRequestHeader(k, options.headers[k]);
			}
		}

		xhrRequest.onreadystatechange = function() {
			if (xhrRequest.readyState == 4) {
				var responseHeaders = {
					status:xhrRequest.status,
					reason:xhrRequest.statusText
				};
				// :NOTE: a bug in firefox causes getAllResponseHeaders to return an empty string on CORS
				// we either need to bug them, or iterate the headers we care about with getResponseHeader
				xhrRequest.getAllResponseHeaders().split("\n").forEach(function(h) {
					if (!h) { return; }
					var kv = h.toLowerCase().replace('\r','').split(': ');
					responseHeaders[kv[0]] = kv[1];
				});

				var responsePayload = Link.contentTypes.deserialize(xhrRequest.responseText, responseHeaders['content-type']);

				if (responseHeaders.status >= 200 && responseHeaders.status < 300) {
					okCb.call(cbContext, responsePayload, responseHeaders, false);
				} else if (responseHeaders.status >= 400 && responseHeaders.status < 600) {
					errCb.call(cbContext, responsePayload, responseHeaders, false);
				} else {
					// :TODO: protocol handling
				}
			}
		};
		xhrRequest.send(payload);
	}

	// executes a remote request in a nodejs process
	function __requestRemoteNodejs(payload, urld, options, okCb, errCb, cbContext) {
		throw "request() has not yet been implemented for nodejs";
	}

	// ServerResponse
	// ==============
	// INTERNAL
	// Interface for responding to requests
	// - generated internally and given to document-local servers
	// - not given to clients; instead, will run client's callbacks as appropriate
	// - reasons this exists:
	//     1) to make it easier to reuse nodejs server code in local servers
    //     2) for streaming, which requires some tracked state
	function ServerResponse(options) {
		Link.EventEmitter.call(this);

		this.cb          = options.cb    || noop;
		this.okCb        = options.okCb  || noop;
		this.errCb       = options.errCb || noop;
		this.cbContext   = options.cbContext;
		this.isStreaming = options.stream;
		this.isOpen      = true;

		this.headers = {};
		this.statusCode = 0;
		this.payload = '';
	}
	ServerResponse.prototype = Object.create(Link.EventEmitter.prototype);

	// writes the header to the response
	// if streaming, will notify the client
	ServerResponse.prototype.writeHead = function(status, reason, headers) {
		this.statusCode = status;
		for (var k in headers) {
			this.setHeader(k, headers[k]);
		}
		this.headers.status = status;
		this.headers.reason = reason;
		if (this.isStreaming) {
			this.__notify();
		}
	};

	// header access/mutation fns
	ServerResponse.prototype.setHeader    = function(k, v) { this.headers[k] = v; };
	ServerResponse.prototype.getHeader    = function(k) { return this.headers[k]; };
	ServerResponse.prototype.removeHeader = function(k) { delete this.headers[k]; };

	// writes data to the response
	// if streaming, will notify the client
	ServerResponse.prototype.write = function(data) {
		if (typeof data === 'string') {
			// add to the buffer if its a string
			this.payload += data;
		} else {
			// overwrite otherwise
			this.payload = data;
		}
		if (this.isStreaming) {
			this.__notify();
		}
	};

	// ends the response, optionally writing any final data
	ServerResponse.prototype.end = function(data) {
		// write any remaining data
		if (data) { this.write(data); }

		// now that we have it all, try to deserialize the payload
		this.payload = Link.contentTypes.deserialize(this.payload, this.headers['content-type']);

		this.isOpen = false;
		this.__notify();
		this.emit('close');

		// unbind all listeners
		this.cb = this.okCb = this.errCb = noop;
	};

	// internal, runs the callbacks provided during construction
	ServerResponse.prototype.__notify = function() {
		if (!this.headers) { throw "Must write headers to response before ending"; }
		this.cb.call(this.cbContext, this.payload, this.headers, this.isOpen);
		if (this.headers.status >= 200 && this.headers.status < 300) {
			this.okCb.call(this.cbContext, this.payload, this.headers, this.isOpen);
		} else if (this.headers.status >= 400 && this.headers.status < 600) {
			this.errCb.call(this.cbContext, this.payload, this.headers, this.isOpen);
		} else {
			// :TODO: protocol handling
		}
	};

	// functions added just to compat with nodejs
	ServerResponse.prototype.writeContinue = noop;
	ServerResponse.prototype.addTrailers   = noop;
	ServerResponse.prototype.sendDate      = noop; // :TODO: is this useful?

	// joins url segments while avoiding double slashes
	function __joinUrl() {
		var parts = Array.prototype.map.call(arguments, function(arg) {
			var lo = 0, hi = arg.length;
			if (arg.charAt(0) === '/')      { lo += 1; }
			if (arg.charAt(hi - 1) === '/') { hi -= 1; }
			return arg.substring(lo, hi);
		});
		return parts.join('/');
	}

	// registerLocal()
	// ===============
	// EXPORTED
	// adds a server to the httpl registry
	function registerLocal(domain, server, serverContext) {
		var urld = Link.parse.url(domain);
		if (urld.protocol && urld.protocol !== 'httpl') {
			throw "registerLocal can only add servers to the httpl protocol";
		}
		if (!urld.host) {
			throw "invalid domain provided to registerLocal";
		}
		if (httpl_registry[urld.host]) {
			throw "server already registered at domain given to registerLocal";
		}
		httpl_registry[urld.host] = { fn:server, context:serverContext };
	}

	// unregisterLocal()
	// =================
	// EXPORTED
	// removes a server from the httpl registry
	function unregisterLocal(domain) {
		var urld = Link.parse.url(domain);
		if (!urld.host) {
			throw "invalid domain provided toun registerLocal";
		}
		if (httpl_registry[urld.host]) {
			delete httpl_registry[urld.host];
		}
		
	}

	exports.request       = request;
	exports.registerLocal = registerLocal;
})(Link);