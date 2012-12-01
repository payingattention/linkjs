function noop() {}
var Link = {};

// Core
// ====
(function(exports) {
	// stores local server functions
	var httpl_registry = {};

	// request()
	// =========
	// EXPORTED
	// HTTP request dispatcher
	// - requires `method` and the target url
	// - target url can be passed in options as `url`, or generated from `host` and `path`
	// - query parameters may be passed in `query`
	// - extra request headers may be specified in `headers`
	// - on success (status code 2xx), `okCb` is called with (payload, headers)
	// - on failure (status code 4xx,5xx), `failCb` is called with (payload, headers)
	// - all protocol (status code 1xx,3xx) is handled internally :TODO:
	function request(payload, options, okCb, failCb, cbContext) {
		// were we passed (options, okCb, errCb, context)?
		if (typeof payload === 'function') {
			options = arguments[0];
			okCb    = arguments[1];
			errCb   = arguments[2];
			context = arguments[3];
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
		if (urld.protocol == 'httpl') {
			__requestLocal(payload, urld, options, okCb, failCb, cbContext);
		} else {
			__requestRemote(payload, urld, options, okCb, failCb, cbContext);
		}
	}

	// registerLocal()
	// ===============
	// EXPORTED
	// adds a server to the httpl registry
	function registerLocal(domain, server) {
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
		httpl_registry[urld.host] = server;
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

	// executes a request locally
	function __requestLocal(payload, urld, options, okCb, failCb, cbContext) {
		// find the local server
		var server = httpl_registry[urld.host];
		if (!server) {
			return failCb.call(cbContext, null, { status:404, reason:'server not found' });
		}

		// build the request
		var request = {
			path    : urld.path,
			method  : options.method,
			query   : options.query || {},
			headers : options.headers || {},
			body    : payload
		};

		// if the urld has query parameters, mix them into the request's query object
		if (urld.query) {
			var q = Link.contentTypes.deserialize(urld.query, 'text/url-query');
			for (var k in q) {
				request.query[k] = q[k];
			}
		}

		// pass on to the server
		server(request, function(responsePayload, responseHeaders) {
			// validate response
			if (typeof responseHeaders !== 'object') { responseHeaders = {}; }
			if (!responseHeaders.status) {
				responseHeaders.status = 500;
				responseHeaders.reason = 'malformed response';
			}

			if (responseHeaders.status >= 200 && responseHeaders.status < 300) {
				okCb.call(cbContext, responsePayload, responseHeaders);
			} else if (responseHeaders.status >= 400 && responseHeaders.status < 600) {
				failCb.call(cbContext, responsePayload, responseHeaders);
			} else {
				// :TODO: protocol handling
			}
		});
	}

	// executes a request remotely
	function __requestRemote(payload, urld, options, okCb, failCb, cbContext) {

		// if a query was given in the options, add it to the urld
		if (request.query) {
			// :TODO: move to contentTypes.serialize
			var q = [];
			for (var k in request.query) {
				q.push(k+'='+request.query[k]);
			}
			if (q.length) {
				q = q.join('&');
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
			__requestRemoteBrowser(payload, urld, options, okCb, failCb, cbContext);
		} else {
			__requestRemoteNodejs(payload, urld, options, okCb, failCb, cbContext);
		}
	}

	// executes a remote request in the browser
	function __requestRemoteBrowser(payload, urld, options, okCb, failCb, cbContext) {

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
		xhrRequest.open(options.method, target_uri, true);
		for (var k in options.headers) {
			if (options.headers[k] === null) { continue; }
			xhrRequest.setRequestHeader(k, options.headers[k]);
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
					okCb.call(cbContext, responsePayload, responseHeaders);
				} else if (responseHeaders.status >= 400 && responseHeaders.status < 600) {
					failCb.call(cbContext, responsePayload, responseHeaders);
				} else {
					// :TODO: protocol handling
				}
			}
		};
		xhrRequest.send(payload);
	}

	// executes a remote request in a nodejs process
	function __requestRemoteNodejs(payload, urld, options, okCb, failCb, cbContext) {
		throw "request() has not yet been implemented for nodejs";
	}

	function __joinUrl() {
		var parts = Array.prototype.map.call(arguments, function(arg) {
			var lo = 0, hi = arg.length;
			if (arg.charAt(0) === '/')      { lo += 1; }
			if (arg.charAt(hi - 1) === '/') { hi -= 1; }
			return arg.substring(lo, hi);
		});
		return parts.join('/');
	}

	exports.request       = request;
	exports.registerLocal = registerLocal;
})(Link);

// Navigator
// =========
/*
:TODO:
- handle relative URIs
*/
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
	NavigatorContext.prototype.resolve    = function(url) {
		this.error = null;
		this.resolveState = NavigatorContext.RESOLVED;
		this.url = url;
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
		// were we passed okCb, errCb?
		if (typeof payload === 'function') {
			okCb = arguments[0];
			errCb = arguments[1];
		}
		// were we passed payload, okCb, errCb?
		else if (typeof headers === 'function') {
			okCb = arguments[1];
			errCb = arguments[2];
		}
		// sane defaults
		okCb  = okCb  || noop;
		errCb = errCb || noop;

		// are we a bad context?
		if (this.context.isBad()) {
			return errCb.call(this, null, this.context.getError());
		}

		// are we an unresolved relation?
		if (this.context.isResolved() === false && this.context.isRelative()) {
			// yes, ask our parent to resolve us
			this.parentNavigator.__resolve(this,
				function() { this.request(payload, headers, okCb, errCb); }, // we're resolved, start over
				function() { errCb.call(this, null, this.context.getError()); }
			);
			return;
		}
		// :NOTE: an unresolved absolute context doesnt need prior resolution, as the request is what will resolve/mark bad

		var onRequestSucceed = function(payload, headers) {
			// we can now consider ourselves resolved (if we hadnt already)
			this.context.resolveState = NavigatorContext.RESOLVED;
			// cache the links
			if (headers.link) {
				this.links = Link.parse.linkHeader(header.link);
			} else {
				this.links = []; // the resource doesn't give links -- cache an empty list so we dont keep trying during resolution
			}
			// pass back to caller
			okCb.call(this, payload, headers);
		};

		var onRequestFail = function(payload, headers) {
			// is the context bad?
			if (headers.status === 404) {
				// store that knowledge
				this.context.resolveState = NavigatorContext.NOTFOUND;
				this.context.error        = headers;
			}
			// pass back to caller
			errCb.call(this, payload, headers);
		};

		// make http request
		options.url = this.context.getUrl();
		Link.request(payload, options, onRequestSucceed, onRequestFail, this);
	};

	// follows a link relation from our context, generating a new navigator
	Navigator.prototype.relation = function Navigator__relation(rel, param, extra) {
		// build params with the main param mapping to the rel name
		// eg: rel=collection -> params.collection = param
		var params = extra;
		extra[rel] = param.toLowerCase();

		return new Navigator(new NavigatorContext(rel, params), this);
	};

	// resolves a child navigator's context relative to our own
	Navigator.prototype.__resolve = function Navigator__resolve(childNav, okCb, errCb) {
		var self = this;
		var restartResolve = function() { self.__resolve(childNav, cb); }; // used when we have to handle something async before proceeding
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
			return Link.format.uriTemplate(match, context.relparams);
		}
		return null;
	};

	// add navigator request sugars
	NAV_REQUEST_FNS.forEach(function (m) {
		Navigator.prototype[m] = function(payload, headers, okCb, errCb) {
			headers.method = m;
			this.request(payload, headers, okCb, errCb);
		};
	});

	// add navigator relation sugars
	NAV_RELATION_FNS.forEach(function (r) {
		var safe_r = /-/g.replace(r, '_');
		Navigator.prototype[safe_r] = function(param, extra) {
			this.relation(r, param, extra);
		};
	});

	// exports
	exports.Navigator = Navigator;
})(Link);

// Helpers
// =======
(function(exports) {
	var format = {
		uriTemplate : format__uriTemplate
	};
	var parse = {
		linkHeader : parse__linkHeader,
		url        : parse__url
	};
	var contentTypes = {
		serialize   : contentTypes__serialize,
		deserialize : contentTypes__deserialize,
		register    : contentTypes__register
	};

	function format__uriTemplate() {
		// :TODO:
	}

	function parse__linkHeader() {
		// :TODO:
	}

	function parse__url() {
		// :TODO:
	}

	function contentTypes__serialize() {
		// :TODO:
	}

	function contentTypes__deserialize() {
		// :TODO:
	}

	function contentTypes__register() {
		// :TODO:
	}

	exports.format       = format;
	exports.parse        = parse;
	exports.contentTypes = contentTypes;
})(Link);