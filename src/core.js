// Core
// ====
// :NOTE: currently, Firefox is not able to retrieve response headers over CORS
(function(exports) {
	// stores local server functions
	var httpl_registry = {};
	// request dispatcher func
	// - used in workers to transport requests to the parent for routing
	var customRequestDispatcher = null;

	// custom error type, for promises
	// EXPORTED
	function ResponseError(response) {
		this.message  = ''+response.status+': '+response.reason;
		this.response = response;
	}
	ResponseError.prototype = new Error();

	// request()
	// =========
	// EXPORTED
	// HTTP request dispatcher
	// - `req` param:
	//   - requires `method`, `body`, and the target url
	//   - target url can be passed in options as `url`, or generated from `host` and `path`
	//   - query parameters may be passed in `query`
	//   - extra request headers may be specified in `headers`
	//   - if `stream` is true, the ClientResponse 'data' events will be called as soon as headers or data are received
	// - returns a `Promise` object
	//   - on success (status code 2xx), the promise is fulfilled with a `ClientResponse` object
	//   - on failure (status code 4xx,5xx), the promise is rejected with a `ClientResponse` object
	//   - all protocol (status code 1xx,3xx) is handled internally
	function request(req) {
		// sanity check
		if (!req) { throw "no req param provided to request"; }

		// sane defaults
		req.headers = req.headers || {};

		// dispatch behavior override
		// (used by workers to send requests to the parent document for routing)
		if (customRequestDispatcher) {
			return customRequestDispatcher(req);
		}

		// parse the url
		// (urld = url description)
		if (req.url) {
			req.urld = Link.parse.url(req.url);
		} else {
			req.urld = Link.parse.url(__joinUrl(req.host, req.path));
		}
		if (!req.urld) {
			throw "no URL or host/path provided in request";
		}

		// execute according to protocol (asyncronously)
		var resPromise = promise();
		if (req.urld.protocol == 'httpl') {
			setTimeout(function() { __requestLocal(req, resPromise); }, 0);
		} else {
			setTimeout(function() { __requestRemote(req, resPromise); }, 0);
		}
		return resPromise;
	}

	// executes a request locally
	function __requestLocal(req, resPromise) {

		// find the local server
		var server = httpl_registry[req.urld.host];
		if (!server) {
			var res = new ClientResponse(404, 'server not found');
			resPromise.reject(new ResponseError(res));
			res.end();
			return;
		}

		// rebuild the request
		// :NOTE: could just pass `req`, but would rather be explicit about what a local server receives
		var req2 = {
			path    : req.urld.path,
			method  : req.method,
			query   : req.query || {},
			headers : req.headers || {},
			body    : req.body
		};

		// if the urld has query parameters, mix them into the request's query object
		if (req.urld.query) {
			var q = Link.contentTypes.deserialize(req.urld.query, 'application/x-www-form-urlencoded');
			for (var k in q) {
				req2.query[k] = q[k];
			}
		}

		// pass on to the server
		server.fn.call(server.context, req2, new ServerResponse(resPromise, req.stream));
	}

	// executes a request remotely
	function __requestRemote(req, resPromise) {

		// if a query was given in the options, mix it into the urld
		if (req.query) {
			var q = Link.contentTypes.serialize(req.query, 'application/x-www-form-urlencoded');
			if (q) {
				if (req.urld.query) {
					req.urld.query    += '&' + q;
					req.urld.relative += '&' + q;
				} else {
					req.urld.query     =  q;
					req.urld.relative += '?' + q;
				}
			}
		}

		if (window) {
			__requestRemoteBrowser(req, resPromise);
		} else {
			__requestRemoteNodejs(req, resPromise);
		}
	}

	// executes a remote request in the browser
	// :TODO: streaming
	function __requestRemoteBrowser(req, resPromise) {

		// assemble the final url
		var url = (req.urld.protocol || 'http') + '://' + req.urld.authority + req.urld.relative;

		// make sure our payload is serialized
		if (req.body) {
			req.headers['content-type'] = req.headers['content-type'] || 'application/json';
			if (typeof req.body !== 'string') {
				req.body = Link.contentTypes.serialize(req.body, req.headers['content-type']);
			}
		}

		// create the request
		var xhrRequest = new XMLHttpRequest();
		xhrRequest.open(req.method, url, true);

		for (var k in req.headers) {
			if (req.headers[k] !== null) {
				xhrRequest.setRequestHeader(k, req.headers[k]);
			}
		}

		xhrRequest.onreadystatechange = function() {
			if (xhrRequest.readyState == 4) {
				var response = new ClientResponse(xhrRequest.status, xhrRequest.statusText);

				// :NOTE: a bug in firefox causes getAllResponseHeaders to return an empty string on CORS
				// we either need to bug them, or iterate the headers we care about with getResponseHeader
				xhrRequest.getAllResponseHeaders().split("\n").forEach(function(h) {
					if (!h) { return; }
					var kv = h.toLowerCase().replace('\r','').split(': ');
					response.headers[kv[0]] = kv[1];
				});

				response.body = Link.contentTypes.deserialize(xhrRequest.responseText, response.headers['content-type']);

				if (response.status >= 200 && response.status < 300) {
					resPromise.fulfill(response);
				} else if (response.status >= 400 && response.status < 600) {
					resPromise.reject(new ResponseError(response));
				} else {
					// :TODO: protocol handling
				}

				response.write(response.body);
				response.end();
			}
		};
		xhrRequest.send(req.body);
	}

	// executes a remote request in a nodejs process
	function __requestRemoteNodejs(req, resPromise) {
		var res = new ClientResponse(0, 'request() has not yet been implemented for nodejs');
		resPromise.reject(res);
		res.end();
	}

	// EXPORTED
	// allows the API consumer to dispatch requests with their own code
	// - mainly for workers to submit requests to the document for routing
	function setRequestDispatcher(fn) {
		customRequestDispatcher = fn;
	}

	// ClientResponse
	// ==============
	// EXPORTED
	// Interface for receiving responses
	// - generated internally and returned by `request`
	// - emits 'data' events when a streaming request receives data
	// - emits an 'end' event when the connection is ended
	// - if the request is not streaming, the response body will be present in `body` (and no 'end' event is needed)
	function ClientResponse(status, reason) {
		Link.EventEmitter.call(this);

		this.status = status;
		this.reason = reason;
		this.headers = {};
		this.body = null;
		this.isConnOpen = true;
	}
	ClientResponse.prototype = Object.create(Link.EventEmitter.prototype);
	ClientResponse.prototype.write = function(data) {
		if (typeof data == 'string' && typeof this.body == 'string') {
			// add to the buffer if its a string
			this.body += data;
		} else {
			// overwrite otherwise
			this.body = data;
		}
		this.emit('data', this.body);
	};
	ClientResponse.prototype.end = function() {
		// now that we have it all, try to deserialize the payload
		this.__deserialize();
		this.isConnOpen = false;
		this.emit('end');
	};
	// this helper is called when the data finishes coming down
	ClientResponse.prototype.__deserialize = function() {
		// convert from string to an object (if we have a deserializer available)
		if (typeof this.body == 'string')
			this.body = Link.contentTypes.deserialize(this.body, this.headers['content-type']);
	};

	// ServerResponse
	// ==============
	// EXPORTED
	// Interface for responding to requests
	// - generated internally and given to document-local servers
	// - not given to clients; instead, will run client's callbacks as appropriate
	function ServerResponse(resPromise, isStreaming) {
		Link.EventEmitter.call(this);

		this.resPromise  = resPromise;
		this.isStreaming = isStreaming;
		this.clientResponse = new ClientResponse();
	}
	ServerResponse.prototype = Object.create(Link.EventEmitter.prototype);

	// writes the header to the response
	// if streaming, will notify the client
	ServerResponse.prototype.writeHead = function(status, reason, headers) {
		// setup client response
		this.clientResponse.status = status;
		this.clientResponse.reason = reason;
		for (var k in headers) {
			this.setHeader(k, headers[k]);
		}

		// fulfill/reject
		if (this.isStreaming) { this.__fulfillPromise(); }
	};

	// header access/mutation fns
	ServerResponse.prototype.setHeader    = function(k, v) { this.clientResponse.headers[k] = v; };
	ServerResponse.prototype.getHeader    = function(k) { return this.clientResponse.headers[k]; };
	ServerResponse.prototype.removeHeader = function(k) { delete this.clientResponse.headers[k]; };

	// writes data to the response
	// if streaming, will notify the client
	ServerResponse.prototype.write = function(data) {
		this.clientResponse.write(data);
	};

	// ends the response, optionally writing any final data
	ServerResponse.prototype.end = function(data) {
		// write any remaining data
		if (data) { this.write(data); }

		// fulfill/reject now if we had been buffering the response
		if (!this.isStreaming) {
			this.clientResponse.__deserialize(); // go ahead and deserialize
			this.__fulfillPromise();
		}

		this.clientResponse.end();
		this.emit('close');

		// unbind all listeners
		this.removeAllListeners('close');
		this.clientResponse.removeAllListeners('data');
		this.clientResponse.removeAllListeners('end');
	};

	// fills the response promise with our clientResponse interface
	ServerResponse.prototype.__fulfillPromise = function() {
		if (this.clientResponse.status >= 200 && this.clientResponse.status < 300) {
			this.resPromise.fulfill(this.clientResponse);
		} else if (this.clientResponse.status >= 400 && this.clientResponse.status < 600) {
			this.resPromise.reject(new ResponseError(this.clientResponse));
		} else {
			// :TODO: protocol handling
		}
	}

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

	exports.ResponseError        = ResponseError;
	exports.request              = request;
	exports.registerLocal        = registerLocal;
	exports.unregisterLocal      = unregisterLocal;
	exports.setRequestDispatcher = setRequestDispatcher;
	exports.ClientResponse       = ClientResponse;
	exports.ServerResponse       = ServerResponse;
})(Link);