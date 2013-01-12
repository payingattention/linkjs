// Helpers
// =======
(function(exports) {

	// Headerer
	// ========
	// EXPORTED
	// a utility for building request and response headers
	// - may be passed to `response.writeHead()`
	function Headerer(init) {
		// copy out any initial values
		if (init && typeof init == 'object') {
			for (var k in init) {
				if (init.hasOwnProperty(k)) {
					this[k] = init[k];
				}
			}
		}
	}

	// adds an entry to the Link header
	// - `href` may be a relative path for the context's domain
	// - `rel` should be a value found in http://www.iana.org/assignments/link-relations/link-relations.xml
	// - `rel` may contain more than on value, separated by spaces
	// - `other` is an optional object of other KVs for the header
	Headerer.prototype.addLink = function(href, rel, other) {
		var entry = other || {};
		entry.href = href;
		entry.rel = rel;
		if (!this.link) {
			this.link = [];
		}
		this.link.push(entry);
		return this;
	};

	// sets the Authorization header
	// - `auth` must include a `scheme`, and any other vital parameters for the given scheme
	Headerer.prototype.addAuth = function(auth) {
		this.authorization = auth;
		return this;
	};

	// converts the headers into string forms for transfer over HTTP
	Headerer.prototype.serialize = function() {
		if (this.link && Array.isArray(this.link)) {
			// :TODO:
		}
		if (this.authorization && typeof this.authorization == 'object') {
			if (!this.authorization.scheme) { throw "`scheme` required for auth headers"; }
			var auth;
			switch (this.authorization.scheme.toLowerCase()) {
				case 'basic':
					auth = 'Basic '+btoa(this.authorization.name+':'+this.authorization.password);
					break;
				case 'persona':
					auth = 'Persona name='+this.authorization.name+' assertion='+this.authorization.assertion;
					break;
				default:
					throw "unknown auth sceme: "+this.authorization.scheme;
			}
			this.authorization = auth;
		}
		return this;
	};

	// wrap helper
	function headerer(h) {
		return (h instanceof Headerer) ? h : new Headerer(h);
	}

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
				return '';
			}
		},
		function (str) {
			try {
				return JSON.parse(str);
			} catch (e) {
				return null;
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

	exports.Headerer     = Headerer;
	exports.headerer     = headerer;
	exports.format       = format;
	exports.parse        = parse;
	exports.contentTypes = contentTypes;
})(Link);