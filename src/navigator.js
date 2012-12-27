// Navigator
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
		this.rel           = rel;
		this.relparams     = relparams;
		this.url           = url;

		this.resolveState  = NavigatorContext.UNRESOLVED;
		this.errorResponse = null;
	}
	NavigatorContext.UNRESOLVED = 0;
	NavigatorContext.RESOLVED   = 1;
	NavigatorContext.NOTFOUND   = 2;
	NavigatorContext.prototype.isResolved = function() { return this.resolveState === NavigatorContext.RESOLVED; };
	NavigatorContext.prototype.isBad      = function() { return this.resolveState > 1; };
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
		this.errorResponse = null;
		this.resolveState  = NavigatorContext.RESOLVED;
		this.url           = url;
		var urld           = Link.parse.url(this.url);
		this.host          = (urld.protocol || 'http') + '://' + urld.authority;
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

	me.get(function(res) {
		// -> HEAD https://api.github.com
		// -> HEAD https://api.github.com/users
		// -> GET  https://api.github.com/users/pfraze

		this.patch({ email:'pfrazee@gmail.com' });
		// -> PATCH https://api.github.com/users/pfraze { email:'pfrazee@gmail.com' }

		github.collection('users', { since:profile.id }).get(function(res2) {
			// -> GET https://api.github.com/users?since=123
			//...
		});
	});
	*/
	function Navigator(context, parentNavigator) {
		this.context         = context         || null;
		this.parentNavigator = parentNavigator || null;
		this.links           = null;

		// were we passed a url?
		if (typeof this.context == 'string') {
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
	Navigator.prototype.request = function Navigator__request(req, okCb, errCb) {
		if (!req || !req.method) { throw "request options not provided"; }

		// sane defaults
		okCb  = okCb  || noop;
		errCb = errCb || noop;

		// are we a bad context?
		if (this.context.isBad()) {
			return errCb.call(this, this.context.errorResponse);
		}

		// are we an unresolved relation?
		if (this.context.isResolved() === false && this.context.isRelative()) {
			// yes, ask our parent to resolve us
			this.parentNavigator.__resolve(this,
				function() { this.request(req, okCb, errCb); }, // we're resolved, start over
				function() { errCb.call(this, this.context.errorResponse); }
			);
			return this;
		}
		// :NOTE: an unresolved absolute context doesnt need prior resolution, as the request is what will resolve it

		// make http request
		req.url = this.context.getUrl();
		var self = this;
		Link.request(req)
			.then(function(res) {
				// we can now consider ourselves resolved (if we hadnt already)
				self.context.resolveState = NavigatorContext.RESOLVED;
				// cache the links
				if (res.headers.link) {
					self.links = Link.parse.linkHeader(res.headers.link);
				} else {
					self.links = self.links || []; // the resource doesn't give links -- cache an empty list so we dont keep trying during resolution
				}
				// pass back to caller
				okCb.call(self, res);
			})
			.except(function(res) {
				// is the context bad?
				if (res.status === 404) {
					// store that knowledge
					self.context.resolveState  = NavigatorContext.NOTFOUND;
					self.context.errorResponse = res;
				}
				// pass back to caller
				errCb.call(self, res);
			});

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
			childNav.context.resolveState  = self.context.resolveState;
			childNav.context.errorResponse = self.context.errorResponse;
			errCb.call(childNav);
		};

		// how can you remove the mote of dust...
		// (before we can resolve the child's context, we need to ensure our own context is valid)
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
			childNav.context.resolveState  = NavigatorContext.NOTFOUND;
			childNav.context.errorResponse = new ClientResponse(404, 'Link relation not found');
			childNav.context.errorResponse.end();
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
		Navigator.prototype[m] = function(req, okCb, errCb) {
			// were we passed (okCb, errCb)?
			if (typeof req === 'function') {
				okCb  = arguments[0];
				errCb = arguments[1];
				req   = {};
			}
			req = req || {};
			req.method = m;
			this.request(req, okCb, errCb);
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
})(Link);