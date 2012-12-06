function noop() {}
var Link = {};// Tools
// =====
(function(exports) {

	// EventEmitter
	// ============
	// EXPORTED
	// A minimal event emitter, based on the NodeJS api
	// initial code borrowed from https://github.com/tmpvar/node-eventemitter (thanks tmpvar)
	function EventEmitter() {
		this._events = {};
	}

	EventEmitter.prototype.emit = function(type) {
		var handlers = this._events[type];
		if (!handlers) return false;

		var args = Array.prototype.slice.call(arguments, 1);
		for (var i = 0, l = handler.length; i < l; i++) {
			handler[i].apply(this, args);
		}
		return true;
	};

	EventEmitter.prototype.addListener = function(type, listener) {
		if ('function' !== typeof listener) {
			throw new Error('addListener only takes instances of Function');
		}

		// To avoid recursion in the case that type == "newListeners"! Before
		// adding it to the listeners, first emit "newListeners".
		this.emit('newListener', type, listener);

		if (!this._events[type]) {
			this._events[type] = [listener];
		} else {
			this._events[type].push(listener);
		}

		return this;
	};

	EventEmitter.prototype.on = EventEmitter.prototype.addListener;

	EventEmitter.prototype.once = function(type, listener) {
		var self = this;
		self.on(type, function g() {
			self.removeListener(type, g);
			listener.apply(this, arguments);
		});
	};

	EventEmitter.prototype.removeListener = function(type, listener) {
		if ('function' !== typeof listener) {
			throw new Error('removeListener only takes instances of Function');
		}
		if (!this._events[type]) return this;

		var list = this._events[type];
		var i = list.indexOf(listener);
		if (i < 0) return this;
		list.splice(i, 1);
		if (list.length === 0) {
			delete this._events[type];
		}

		return this;
	};

	EventEmitter.prototype.removeAllListeners = function(type) {
		if (type && this._events[type]) this._events[type] = null;
		return this;
	};

	EventEmitter.prototype.listeners = function(type) {
		return this._events[type];
	};

	// Notifier
	// ========
	// EXPORTED
	// Manages a set of callbacks
	// :TODO: remove?
	function Notifier() {
		this.__streams = [];
	}

	// adds a stream to the list of receivers
	Notifier.prototype.addStream = function(stream) {
		if (!(stream instanceof Stream)) {
			throw "Stream type must be passed to Notifier.addStream";
		}
		this.__streams.push(stream);
	};

	// broadcasts an event
	Notifier.prototype.broadcast = function(event, data) {
		var chunk = { event:event };
		if (data) { chunk.data = data; }
		for (var i=0; i < this.__streams.length; i++) {
			this.__streams[i].write(chunk);
		}
	};

	// broadcasts an event to a particular stream
	Notifier.prototype.broadcastTo = function(stream, event, data) {
		var chunk = { event:event };
		if (data) { chunk.data = data; }
		stream.write(chunk);
	};

	// exports
	exports.EventEmitter  = EventEmitter;
	exports.Notifier = Notifier;
})(Link);// Core
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
})(Link);// Navigator
// =========
(function(exports) {
	// navigator sugar functions
	// =========================
	// these constants specify which sugars to add to the navigator
	var NAV_REQUEST_FNS = ['head','get','post','put','patch','delete'];
	// http://www.iana.org/assignments/link-relations/link-relations.xml
	// (I've commented out the relations which are probably not useful enough to make sugars for)
	var NAV_RELATION_FNS = [
		'alternate', /*'appendix', 'archives',*/ 'author', /*'bookmark', 'canonical', 'chapter',*/ 'collection',
		/*'contents', 'copyright',*/ 'current', 'describedby', /*'disclosure', 'duplicate', 'edit', 'edit-media',
		'enclosure',*/ 'first', /*'glossary', 'help', 'hosts', 'hub', 'icon',*/ 'index', 'item', 'last',
		'latest-version', /*'license', 'lrdd',*/ 'monitor', 'monitor-group', 'next', 'next-archive', /*'nofollow',
		'noreferrer',*/ 'payment', 'predecessor-version', /*'prefetch',*/ 'prev', /*'previous',*/ 'prev-archive',
		'related', 'replies', 'search',	/*'section',*/ 'self', 'service', /*'start', 'stylesheet', 'subsection',*/
		'successor-version', /*'tag',*/ 'up', 'version-history', 'via', 'working-copy', 'working-copy-of'
	];

	// NavigatorContext
	// ================
	// INTERNAL
	// the URI that a navigator represents
	//  - may exist in an "unresolved" state until the URI is confirmed by a response from the server
	//  - may exist in a "bad" state if an attempt to resolve the link failed
	//  - may be "relative" if described by a relation from another context
	//  - may be "absolute" if described by a URI
	// :NOTE: absolute contexts may have a URI without being resolved, so don't take the presence of a URI as a sign that the resource exists
	function NavigatorContext(rel, relparams, url) {
		this.rel          = rel;
		this.relparams    = relparams;
		this.url          = url;

		this.resolveState = NavigatorContext.UNRESOLVED;
		this.error        = null;
	}
	NavigatorContext.UNRESOLVED = 0;
	NavigatorContext.RESOLVED   = 1;
	NavigatorContext.NOTFOUND   = 2;
	NavigatorContext.prototype.isResolved = function() { return this.resolveState === NavigatorContext.RESOLVED; };
	NavigatorContext.prototype.isBad      = function() { return this.resolveState > 1; };
	NavigatorContext.prototype.getError   = function() { return this.error; };
	NavigatorContext.prototype.isRelative = function() { return (!this.url && !!this.rel); };
	NavigatorContext.prototype.isAbsolute = function() { return (!!this.url); };
	NavigatorContext.prototype.getUrl     = function() { return this.url; };
	NavigatorContext.prototype.getHost    = function() {
		if (!this.host) {
			if (!this.url) { return null; }
			var urld  = Link.parse.url(this.url);
			this.host = (urld.protocol || 'http') + '://' + urld.authority;
		}
		return this.host;
	};
	NavigatorContext.prototype.resolve    = function(url) {
		this.error        = null;
		this.resolveState = NavigatorContext.RESOLVED;
		this.url          = url;
		var urld          = Link.parse.url(this.url);
		this.host         = (urld.protocol || 'http') + '://' + urld.authority;
	};

	// Navigator
	// =========
	// EXPORTED
	// API to follow resource links (as specified by the response Link header)
	//  - uses the rel attribute to type its navigations
	//  - uses URI templates to generate URIs
	//  - queues link navigations until a request is made, to decrease on the amount of async calls required
	//
	// example usage:
	/*
	var github = new Navigator('https://api.github.com');
	var me = github.collection('users').item('pfraze');

	me.get(function(profile) {
		// -> HEAD https://api.github.com
		// -> HEAD https://api.github.com/users
		// -> GET  https://api.github.com/users/pfraze

		this.patch({ email:'pfrazee@gmail.com' });
		// -> PATCH https://api.github.com/users/pfraze { email:'pfrazee@gmail.com' }

		github.collection('users', { since:profile.id }).get(function(users) {
			// -> GET https://api.github.com/users?since=123
			//...
		});
	});

	// alternative: if / provides a Link: </{collection}/{item}>; rel=item
	me = github.item('pfraze', { collection:'users' }));
	*/
	function Navigator(context, parentNavigator) {
		this.context         = context         || null;
		this.parentNavigator = parentNavigator || null;
		this.links           = null;

		// were we passed a url?
		if (typeof this.context === 'string') {
			// absolute context
			this.context = new NavigatorContext(null, null, context);
		} else {
			// relative context
			if (!parentNavigator) {
				throw "parentNavigator is required for navigators with relative contexts";
			}
		}
	}

	// executes an HTTP request to our context
	Navigator.prototype.request = function Navigator__request(payload, options, okCb, errCb) {
		// were we passed (options, okCb, errCb)?
		if (typeof options !== 'object') {
			options = arguments[0];
			okCb    = arguments[1];
			errCb   = arguments[2];
			payload = null;
		}
		if (!options || !options.method) { throw "request options not provided"; }
		// sane defaults
		okCb  = okCb  || noop;
		errCb = errCb || noop;

		// are we a bad context?
		if (this.context.isBad()) {
			return errCb.call(this, null, this.context.getError(), false);
		}

		// are we an unresolved relation?
		if (this.context.isResolved() === false && this.context.isRelative()) {
			// yes, ask our parent to resolve us
			this.parentNavigator.__resolve(this,
				function() { this.request(payload, options, okCb, errCb); }, // we're resolved, start over
				function() { errCb.call(this, null, this.context.getError(), false); }
			);
			return this;
		}
		// :NOTE: an unresolved absolute context doesnt need prior resolution, as the request is what will resolve it

		var firstResponse = true;
		var onRequestSucceed = function(payload, headers, connIsOpen) {
			if (firstResponse) {
				// we can now consider ourselves resolved (if we hadnt already)
				this.context.resolveState = NavigatorContext.RESOLVED;
				// cache the links
				if (headers.link) {
					this.links = Link.parse.linkHeader(headers.link);
				} else {
					this.links = []; // the resource doesn't give links -- cache an empty list so we dont keep trying during resolution
				}
				firstResponse = false;
			}
			// pass back to caller
			okCb.call(this, payload, headers, connIsOpen);
		};

		var onRequestFail = function(payload, headers, connIsOpen) {
			if (firstResponse) {
				// is the context bad?
				if (headers.status === 404) {
					// store that knowledge
					this.context.resolveState = NavigatorContext.NOTFOUND;
					this.context.error        = headers;
				}
			}
			// pass back to caller
			errCb.call(this, payload, headers, connIsOpen);
		};

		// make http request
		options.url = this.context.getUrl();
		Link.request(payload, options, onRequestSucceed, onRequestFail, this);

		return this;
	};

	// follows a link relation from our context, generating a new navigator
	Navigator.prototype.relation = function Navigator__relation(rel, param, extra) {
		// build params with the main param mapping to the rel name
		// eg: rel=collection -> params.collection = param
		var params = extra || {};
		params[rel] = (param || '').toLowerCase();

		return new Navigator(new NavigatorContext(rel, params), this);
	};

	// resolves a child navigator's context relative to our own
	Navigator.prototype.__resolve = function Navigator__resolve(childNav, okCb, errCb) {
		var self = this;
		var restartResolve = function() { self.__resolve(childNav, okCb, errCb); }; // used when we have to handle something async before proceeding
		var failResolve = function() {
			// we're bad, and all children are bad as well
			childNav.context.resolveState = self.context.resolveState;
			childNav.context.error        = self.context.error;
			errCb.call(childNav);
		};

		// how can you remove the mote of dust... (before we can resolve the child's context, we need to ensure our own context is valid)
		// are we a bad context?
		if (this.context.isBad()) {
			return failResolve();
		}
		// are we an unresolved relation?
		if (this.context.isResolved() === false && this.context.isRelative()) {
			return this.parentNavigator.__resolve(this, restartResolve, failResolve);
		}
		// are we an unresolved absolute? || do we need to fetch our links?
		if ((this.context.isResolved() === false && this.context.isAbsolute()) || (this.links === null)) {
			// make a head request (the `request` function will resolve us on success and mark us bad on failure)
			return this.head(restartResolve, failResolve);
		}

		// ok, our context is good -- lets resolve the child
		var url = this.__lookupLink(childNav.context);
		if (url) {
			childNav.context.resolve(url);
			okCb.call(childNav);
		} else {
			childNav.context.resolveState = NavigatorContext.NOTFOUND;
			childNav.context.error        = { status:404, reason:'Link relation not found' };
			errCb.call(childNav);
		}
	};

	// looks up a link in the cache and generates the URI
	//  - first looks for a matching rel and title
	//    eg item('foobar') -> Link: <http://example.com/some/foobar>; rel="item"; title="foobar" -> http://example.com/some/foobar
	//  - then looks for a matching rel with no title and uses that to generate the link
	//    eg item('foobar') -> Link: <http://example.com/some/{item}>; rel="item" -> http://example.com/some/foobar
	Navigator.prototype.__lookupLink = function Navigator__lookupLink(context) {
		// try to find the link with a title equal to the param we were given
		var match;
		for (var i=0, ii=this.links.length; i < ii; i++) {
			var link = this.links[i];
			// find all links with a matching rel
			if (link.rel && link.rel.indexOf(context.rel) !== -1) {
				// look for a title match to the primary parameter
				if (link.title) {
					if (link.title.toLowerCase() === context.relparams[context.rel]) {
						match = link;
						break; 
					}
				} else {
					// no title attribute -- it's the template URI, so hold onto it
					match = link;
				}
			}
		}
		
		if (match) {
			var url = Link.format.uriTemplate(match.href, context.relparams);
			var urld = Link.parse.url(url);
			if (!urld.host) { // handle relative URLs
				url = this.context.getHost() + urld.relative;
			}
			return url;
		}
		return null;
	};

	// add navigator request sugars
	NAV_REQUEST_FNS.forEach(function (m) {
		Navigator.prototype[m] = function(payload, options, okCb, errCb) {
			// were we passed (okCb, errCb)?
			if (typeof payload === 'function') {
				okCb    = arguments[0];
				errCb   = arguments[1];
				payload = null;
				options = {};
			}
			// were we passed (payload, okCb, errCb)?
			else if (typeof options === 'function') {
				okCb    = arguments[1];
				errCb   = arguments[2];
				options = {};
			}
			options = options || {};
			options.method = m;
			this.request(payload, options, okCb, errCb);
		};
	});

	// add navigator relation sugars
	NAV_RELATION_FNS.forEach(function (r) {
		var safe_r = r.replace(/-/g, '_');
		Navigator.prototype[safe_r] = function(param, extra) {
			return this.relation(r, param, extra);
		};
	});

	// exports
	exports.Navigator = Navigator;
})(Link);// Helpers
// =======
(function(exports) {
	// format
	// ======
	// EXPORTED
	// string formatting according to various schemas
	var format = {
		uriTemplate : format__uriTemplate
	};

	// http://tools.ietf.org/html/rfc6570
	function format__uriTemplate(template, params) {
		return Link.UriTemplate.parse(template).expand(params);
	}

	// parse
	// =====
	// EXPORTED
	// string parsing according to various schemas
	var parse = {
		linkHeader : parse__linkHeader,
		url        : parse__url
	};

	// EXPORTED
	// breaks a link header into a javascript object
	function parse__linkHeader(headerStr) {
		if (typeof headerStr !== 'string') {
			return headerStr;
		}
		// '</foo/bar>; rel="baz"; title="blah", </foo/bar>; rel="baz"; title="blah", </foo/bar>; rel="baz"; title="blah"'
		return headerStr.split(',').map(function(linkStr) {
			// ['</foo/bar>; rel="baz"; title="blah"', '</foo/bar>; rel="baz"; title="blah"']
			var link = {};
			linkStr.trim().split(';').forEach(function(attrStr) {
				// ['</foo/bar>', 'rel="baz"', 'title="blah"']
				attrStr = attrStr.trim();
				if (attrStr.charAt(0) === '<') {
					// '</foo/bar>'
					link.href = attrStr.trim().slice(1, -1);
				} else {
					var attrParts = attrStr.split('=');
					// ['rel', '"baz"']
					var k = attrParts[0].trim();
					var v = attrParts[1].trim().slice(1, -1);
					link[k] = v;
				}
			});
			return link;
		});
	}

	// EXPORTED
	// parseUri 1.2.2, (c) Steven Levithan <stevenlevithan.com>, MIT License
	function parse__url(str) {
		var	o   = parse__url.options,
			m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
			uri = {},
			i   = 14;

		while (i--) uri[o.key[i]] = m[i] || "";

		uri[o.q.name] = {};
		uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
			if ($1) uri[o.q.name][$1] = $2;
		});

		return uri;
	}

	parse__url.options = {
		strictMode: false,
		key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
		q:   {
			name:   "queryKey",
			parser: /(?:^|&)([^&=]*)=?([^&]*)/g
		},
		parser: {
			strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
			loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
		}
	};

	// contentTypes
	// ============
	// EXPORTED
	// provides serializers and deserializers for MIME types
	var contentTypes = {
		serialize   : contentTypes__serialize,
		deserialize : contentTypes__deserialize,
		register    : contentTypes__register
	};
	var contentTypes__registry = {};

	// EXPORTED
	// serializes an object into a string
	function contentTypes__serialize(obj, type) {
		if (!obj || typeof(obj) != 'object' || !type) {
			return obj;
		}
		var fn = contentTypes__find(type, 'serializer');
		if (!fn) {
			console.log('Unable to serialize', type, '(no serializer found)');
			return obj;
		}
		return fn(obj);
	}

	// EXPORTED
	// deserializes a string into an object
	function contentTypes__deserialize(str, type) {
		if (!str || typeof(str) != 'string' || !type) {
			return str;
		}
		var fn = contentTypes__find(type, 'deserializer');
		if (!fn) {
			console.log('Unable to deserialize', type, '(no deserializer found)');
			return str;
		}
		return fn(str);
	}

	// EXPORTED
	// adds a type to the registry
	function contentTypes__register(type, serializer, deserializer) {
		contentTypes__registry[type] = {
			serializer   : serializer,
			deserializer : deserializer
		};
	}

	// INTERNAL
	// takes a mimetype (text/asdf+html), puts out the applicable types ([text/asdf+html, text/html, text])
	function contentTypes__mkTypesList(type) {
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
	}

	// INTERNAL
	// finds the closest-matching type in the registry and gives the request function
	function contentTypes__find(type, fn) {
		var types = contentTypes__mkTypesList(type);
		for (var i=0; i < types.length; i++) {
			if (types[i] in contentTypes__registry) {
				return contentTypes__registry[types[i]][fn];
			}
		}
		return null;
	}

	// default types
	contentTypes__register('application/json',
		function (obj) {
			try {
				return JSON.stringify(obj);
			} catch (e) {
				console.log('Failed to serialize json', obj, e);
				return '';
			}
		},
		function (str) {
			try {
				return JSON.parse(str);
			} catch (e) {
				console.log('Failed to deserialize json', str, e);
			}
		}
	);
	contentTypes__register('application/x-www-form-urlencoded',
		function (obj) {
			var enc = encodeURIComponent;
			var str = [];
			for (var k in obj) {
				if (obj[k] === null) {
					str.push(k+'=');
				} else if (Array.isArray(obj[k])) {
					for (var i=0; i < obj[k].length; i++) {
						str.push(k+'[]='+enc(obj[k][i]));
					}
				} else if (typeof obj[k] == 'object') {
					for (var k2 in obj[k]) {
						str.push(k+'['+k2+']='+enc(obj[k][k2]));
					}
				} else {
					str.push(k+'='+enc(obj[k]));
				}
			}
			return str.join('&');
		},
		function (params) {
			// thanks to Brian Donovan
			// http://stackoverflow.com/a/4672120
			var pairs = params.split('&'),
			result = {};

			for (var i = 0; i < pairs.length; i++) {
				var pair = pairs[i].split('='),
				key = decodeURIComponent(pair[0]),
				value = decodeURIComponent(pair[1]),
				isArray = /\[\]$/.test(key),
				dictMatch = key.match(/^(.+)\[([^\]]+)\]$/);

				if (dictMatch) {
					key = dictMatch[1];
					var subkey = dictMatch[2];

					result[key] = result[key] || {};
					result[key][subkey] = value;
				} else if (isArray) {
					key = key.substring(0, key.length-2);
					result[key] = result[key] || [];
					result[key].push(value);
				} else {
					result[key] = value;
				}
			}

			return result;
		}
	);

	exports.format       = format;
	exports.parse        = parse;
	exports.contentTypes = contentTypes;
})(Link);// UriTemplate
// ===========
// https://github.com/fxa/uritemplate-js
// Copyright 2012 Franz Antesberger, MIT License
(function (exports){
	"use strict";

	// http://blog.sangupta.com/2010/05/encodeuricomponent-and.html
	//
	// helpers
	//
	function isArray(value) {
		return Object.prototype.toString.apply(value) === '[object Array]';
	}

	// performs an array.reduce for objects
	function objectReduce(object, callback, initialValue) {
		var
			propertyName,
			currentValue = initialValue;
		for (propertyName in object) {
			if (object.hasOwnProperty(propertyName)) {
				currentValue = callback(currentValue, object[propertyName], propertyName, object);
			}
		}
		return currentValue;
	}

	// performs an array.reduce, if reduce is not present (older browser...)
	function arrayReduce(array, callback, initialValue) {
		var
			index,
			currentValue = initialValue;
		for (index = 0; index < array.length; index += 1) {
			currentValue = callback(currentValue, array[index], index, array);
		}
		return currentValue;
	}

	function reduce(arrayOrObject, callback, initialValue) {
		return isArray(arrayOrObject) ? arrayReduce(arrayOrObject, callback, initialValue) : objectReduce(arrayOrObject, callback, initialValue);
	}

	/**
	 * Detects, whether a given element is defined in the sense of rfc 6570
	 * Section 2.3 of the RFC makes clear defintions:
	 * * undefined and null are not defined.
	 * * the empty string is defined
	 * * an array ("list") is defined, if it contains at least one defined element
	 * * an object ("map") is defined, if it contains at least one defined property
	 * @param object
	 * @return {Boolean}
	 */
	function isDefined (object) {
		var
			index,
			propertyName;
		if (object === null || object === undefined) {
			return false;
		}
		if (isArray(object)) {
			for (index = 0; index < object.length; index +=1) {
				if(isDefined(object[index])) {
					return true;
				}
			}
			return false;
		}
		if (typeof object === "string" || typeof object === "number" || typeof object === "boolean") {
			// even the empty string is considered as defined
			return true;
		}
		// else Object
		for (propertyName in object) {
			if (object.hasOwnProperty(propertyName) && isDefined(object[propertyName])) {
				return true;
			}
		}
		return false;
	}

	function isAlpha(chr) {
		return (chr >= 'a' && chr <= 'z') || ((chr >= 'A' && chr <= 'Z'));
	}

	function isDigit(chr) {
		return chr >= '0' && chr <= '9';
	}

	function isHexDigit(chr) {
		return isDigit(chr) || (chr >= 'a' && chr <= 'f') || (chr >= 'A' && chr <= 'F');
	}

	var pctEncoder = (function () {

		// see http://ecmanaut.blogspot.de/2006/07/encoding-decoding-utf8-in-javascript.html
		function toUtf8 (s) {
			return unescape(encodeURIComponent(s));
		}

		function encode(chr) {
			var
				result = '',
				octets = toUtf8(chr),
				octet,
				index;
			for (index = 0; index < octets.length; index += 1) {
				octet = octets.charCodeAt(index);
				result += '%' + octet.toString(16).toUpperCase();
			}
			return result;
		}

		function isPctEncoded (chr) {
			if (chr.length < 3) {
				return false;
			}
			for (var index = 0; index < chr.length; index += 3) {
				if (chr.charAt(index) !== '%' || !isHexDigit(chr.charAt(index + 1) || !isHexDigit(chr.charAt(index + 2)))) {
					return false;
				}
			}
			return true;
		}

		function pctCharAt(text, startIndex) {
			var chr = text.charAt(startIndex);
			if (chr !== '%') {
				return chr;
			}
			chr = text.substr(startIndex, 3);
			if (!isPctEncoded(chr)) {
				return '%';
			}
			return chr;
		}

		return {
			encodeCharacter: encode,
			decodeCharacter: decodeURIComponent,
			isPctEncoded: isPctEncoded,
			pctCharAt: pctCharAt
		};
	}());


	/**
	 * Returns if an character is an varchar character according 2.3 of rfc 6570
	 * @param chr
	 * @return (Boolean)
	 */
	function isVarchar(chr) {
		return isAlpha(chr) || isDigit(chr) || chr === '_' || pctEncoder.isPctEncoded(chr);
	}

	/**
	 * Returns if chr is an unreserved character according 1.5 of rfc 6570
	 * @param chr
	 * @return {Boolean}
	 */
	function isUnreserved(chr) {
		return isAlpha(chr) || isDigit(chr) || chr === '-' || chr === '.' || chr === '_' || chr === '~';
	}

	/**
	 * Returns if chr is an reserved character according 1.5 of rfc 6570
	 * @param chr
	 * @return {Boolean}
	 */
	function isReserved(chr) {
		return chr === ':' || chr === '/' || chr === '?' || chr === '#' || chr === '[' || chr === ']' || chr === '@' || chr === '!' || chr === '$' || chr === '&' || chr === '(' ||
			chr === ')' || chr === '*' || chr === '+' || chr === ',' || chr === ';' || chr === '=' || chr === "'";
	}

	function encode(text, passReserved) {
		var
			result = '',
			index,
			chr = '';
		if (typeof text === "number" || typeof text === "boolean") {
			text = text.toString();
		}
		for (index = 0; index < text.length; index += chr.length) {
			chr = pctEncoder.pctCharAt(text, index);
			if (chr.length > 1) {
				result += chr;
			}
			else {
				result += isUnreserved(chr) || (passReserved && isReserved(chr)) ? chr : pctEncoder.encodeCharacter(chr);
			}
		}
		return result;
	}

	function encodePassReserved(text) {
		return encode(text, true);
	}

	var
		operators = (function () {
			var
				bySymbol = {};
			function create(symbol) {
				bySymbol[symbol] = {
					symbol: symbol,
					separator: (symbol === '?') ? '&' : (symbol === '' || symbol === '+' || symbol === '#') ? ',' : symbol,
					named: symbol === ';' || symbol === '&' || symbol === '?',
					ifEmpty: (symbol === '&' || symbol === '?') ? '=' : '',
					first: (symbol === '+' ) ? '' : symbol,
					encode: (symbol === '+' || symbol === '#') ? encodePassReserved : encode,
					toString: function () {return this.symbol;}
				};
			}
			create('');
			create('+');
			create('#');
			create('.');
			create('/');
			create(';');
			create('?');
			create('&');
			return {valueOf: function (chr) {
				if (bySymbol[chr]) {
					return bySymbol[chr];
				}
				if ("=,!@|".indexOf(chr) >= 0) {
					throw new Error('Illegal use of reserved operator "' + chr + '"');
				}
				return bySymbol[''];
			}};
		}());

	function UriTemplate(templateText, expressions) {
		this.templateText = templateText;
		this.expressions = expressions;
	}

	UriTemplate.prototype.toString = function () {
		return this.templateText;
	};

	UriTemplate.prototype.expand = function (variables) {
		var
			index,
			result = '';
		for (index = 0; index < this.expressions.length; index += 1) {
			result += this.expressions[index].expand(variables);
		}
		return result;
	};

	function encodeLiteral(literal) {
		var
			result = '',
			index,
			chr = '';
		for (index = 0; index < literal.length; index += chr.length) {
			chr = pctEncoder.pctCharAt(literal, index);
			if (chr.length > 0) {
				result += chr;
			}
			else {
				result += isReserved(chr) || isUnreserved(chr) ? chr : pctEncoder.encodeCharacter(chr);
			}
		}
		return result;
	}

	function LiteralExpression(literal) {
		this.literal = encodeLiteral(literal);
	}

	LiteralExpression.prototype.expand = function () {
		return this.literal;
	};

	LiteralExpression.prototype.toString = LiteralExpression.prototype.expand;

	function VariableExpression(templateText, operator, varspecs) {
		this.templateText = templateText;
		this.operator = operator;
		this.varspecs = varspecs;
	}

	VariableExpression.prototype.toString = function () {
		return this.templateText;
	};
	
	VariableExpression.prototype.expand = function expandExpression(variables) {
		var
			result = '',
			index,
			varspec,
			value,
			valueIsArr,
			isFirstVarspec = true,
			operator = this.operator;

		// callback to be used within array.reduce
		function reduceUnexploded(result, currentValue, currentKey) {
			if (isDefined(currentValue)) {
				if (result.length > 0) {
					result += ',';
				}
				if (!valueIsArr) {
					result += operator.encode(currentKey) + ',';
				}
				result += operator.encode(currentValue);
			}
			return result;
		}

		function reduceNamedExploded(result, currentValue, currentKey) {
			if (isDefined(currentValue)) {
				if (result.length > 0) {
					result += operator.separator;
				}
				result += (valueIsArr) ? encodeLiteral(varspec.varname) : operator.encode(currentKey);
				result += '=' + operator.encode(currentValue);
			}
			return result;
		}

		function reduceUnnamedExploded(result, currentValue, currentKey) {
			if (isDefined(currentValue)) {
				if (result.length > 0) {
					result += operator.separator;
				}
				if (!valueIsArr) {
					result += operator.encode(currentKey) + '=';
				}
				result += operator.encode(currentValue);
			}
			return result;
		}

		// expand each varspec and join with operator's separator
		for (index = 0; index < this.varspecs.length; index += 1) {
			varspec = this.varspecs[index];
			value = variables[varspec.varname];
			if (!isDefined(value)) {
				continue;
			}
			if (isFirstVarspec)  {
				result += this.operator.first;
				isFirstVarspec = false;
			}
			else {
				result += this.operator.separator;
			}
			valueIsArr = isArray(value);
			if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
				value = value.toString();
				if (this.operator.named) {
					result += encodeLiteral(varspec.varname);
					if (value === '') {
						result += this.operator.ifEmpty;
						continue;
					}
					result += '=';
				}
				if (varspec.maxLength && value.length > varspec.maxLength) {
					value = value.substr(0, varspec.maxLength);
				}
				result += this.operator.encode(value);
			}
			else if (varspec.maxLength) {
				// 2.4.1 of the spec says: "Prefix modifiers are not applicable to variables that have composite values."
				throw new Error('Prefix modifiers are not applicable to variables that have composite values. You tried to expand ' + this + " with " + JSON.stringify(value));
			}
			else if (!varspec.exploded) {
				if (operator.named) {
					result += encodeLiteral(varspec.varname);
					if (!isDefined(value)) {
						result += this.operator.ifEmpty;
						continue;
					}
					result += '=';
				}
				result += reduce(value, reduceUnexploded, '');
			}
			else {
				// exploded and not string
				result += reduce(value, operator.named ? reduceNamedExploded : reduceUnnamedExploded, '');
			}
		}
		return result;
	};

	function parseExpression(outerText) {
		var
			text,
			operator,
			varspecs = [],
			varspec = null,
			varnameStart = null,
			maxLengthStart = null,
			index,
			chr;

		function closeVarname() {
			varspec = {varname: text.substring(varnameStart, index), exploded: false, maxLength: null};
			varnameStart = null;
		}

		function closeMaxLength() {
			if (maxLengthStart === index) {
				throw new Error("after a ':' you have to specify the length. position = " + index);
			}
			varspec.maxLength = parseInt(text.substring(maxLengthStart, index), 10);
			maxLengthStart = null;
		}

		// remove outer {}
		text = outerText.substr(1, outerText.length - 2);
		for (index = 0; index < text.length; index += chr.length) {
			chr = pctEncoder.pctCharAt(text, index);
			if (index === 0) {
				operator = operators.valueOf(chr);
				if (operator.symbol !== '') {
					// first char is operator symbol. so we can continue
					varnameStart = 1;
					continue;
				}
				// the first char was a regular varname char. We have simple strings and must go on.
				varnameStart = 0;
			}
			if (varnameStart !== null) {

				// the spec says: varname       =  varchar *( ["."] varchar )
				// so a dot is allowed except for the first char
				if (chr === '.') {
					if (varnameStart === index) {
						throw new Error('a varname MUST NOT start with a dot -- see position ' + index);
					}
					continue;
				}
				if (isVarchar(chr)) {
					continue;
				}
				closeVarname();
			}
			if (maxLengthStart !== null) {
				if (isDigit(chr)) {
					continue;
				}
				closeMaxLength();
			}
			if (chr === ':') {
				if (varspec.maxLength !== null) {
					throw new Error('only one :maxLength is allowed per varspec at position ' + index);
				}
				maxLengthStart = index + 1;
				continue;
			}
			if (chr === '*') {
				if (varspec === null) {
					throw new Error('explode exploded at position ' + index);
				}
				if (varspec.exploded) {
					throw new Error('explode exploded twice at position ' + index);
				}
				if (varspec.maxLength) {
					throw new Error('an explode (*) MUST NOT follow to a prefix, see position ' + index);
				}
				varspec.exploded = true;
				continue;
			}
			// the only legal character now is the comma
			if (chr === ',') {
				varspecs.push(varspec);
				varspec = null;
				varnameStart = index + 1;
				continue;
			}
			throw new Error("illegal character '" + chr + "' at position " + index);
		} // for chr
		if (varnameStart !== null) {
			closeVarname();
		}
		if (maxLengthStart !== null) {
			closeMaxLength();
		}
		varspecs.push(varspec);
		return new VariableExpression(outerText, operator, varspecs);
	}

	UriTemplate.parse = function parse(uriTemplateText) {
		// assert filled string
		var
			index,
			chr,
			expressions = [],
			braceOpenIndex = null,
			literalStart = 0;
		for (index = 0; index < uriTemplateText.length; index += 1) {
			chr = uriTemplateText.charAt(index);
			if (literalStart !== null) {
				if (chr === '}') {
					throw new Error('brace was closed in position ' + index + " but never opened");
				}
				if (chr === '{') {
					if (literalStart < index) {
						expressions.push(new LiteralExpression(uriTemplateText.substring(literalStart, index)));
					}
					literalStart = null;
					braceOpenIndex = index;
				}
				continue;
			}

			if (braceOpenIndex !== null) {
				// here just { is forbidden
				if (chr === '{') {
					throw new Error('brace was opened in position ' + braceOpenIndex + " and cannot be reopened in position " + index);
				}
				if (chr === '}') {
					if (braceOpenIndex + 1 === index) {
						throw new Error("empty braces on position " + braceOpenIndex);
					}
					expressions.push(parseExpression(uriTemplateText.substring(braceOpenIndex, index + 1)));
					braceOpenIndex = null;
					literalStart = index + 1;
				}
				continue;
			}
			throw new Error('reached unreachable code');
		}
		if (braceOpenIndex !== null) {
			throw new Error("brace was opened on position " + braceOpenIndex + ", but never closed");
		}
		if (literalStart < uriTemplateText.length) {
			expressions.push(new LiteralExpression(uriTemplateText.substr(literalStart)));
		}
		return new UriTemplate(uriTemplateText, expressions);
	};

	exports.UriTemplate = UriTemplate;
})(Link);// set up for node or AMD
if (typeof module !== "undefined") {
	module.exports = Link;
}
else if (typeof define !== "undefined") {
	define([], function() {
		return Link;
	});
}