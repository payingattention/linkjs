// Events
// ======
// :NOTE: currently, Chrome does not support event streams with CORS
(function(exports) {

	// subscribe()
	// =========
	// EXPORTED
	// Establishes a connection and begins an event stream
	// - sends a GET request with 'text/event-stream' as the Accept header
	// - `options` param:
	//   - requires the target url
	//   - target url can be passed in options as `url`, or generated from `host` and `path`
	// - on success (status code 2xx), `okCb` is called with (payload, headers)
	// - on failure (status code 4xx,5xx), `errCb` is called with (payload, headers)
	function subscribe(options) {

		if (!options) { throw "no options provided to subscribe"; }

		// parse the url
		var urld;
		if (options.url) {
			urld = Link.parse.url(options.url);
		} else {
			urld = Link.parse.url(__joinUrl(options.host, options.path));
		}
		if (!urld) {
			throw "no URL or host/path provided in subscribe options";
		}

		// execute according to protocol
		if (urld.protocol == 'httpl') {
			return __subscribeLocal(urld, options);
		} else {
			return __subscribeRemote(urld, options);
		}
	}

	// subscribes to a local host
	function __subscribeLocal(urld, options) {

		// set up options
		var reqOpts = {
			method  : 'get',
			url     : (urld.protocol || 'http') + '://' + urld.authority + urld.relative,
			headers : { accept : 'text/event-stream' },
			stream  : true
		};

		// initiate the event stream
		var stream = new LocalEventStream();
		Link.request(null, reqOpts, stream.okCb, stream.errCb, stream);
		return stream;
	}

	// subscribes to a remote host
	function __subscribeRemote(urld, options) {
		if (window) {
			return __subscribeRemoteBrowser(urld, options);
		} else {
			return __subscribeRemoteNodejs(urld, options);
		}
	}

	// subscribes to a remote host in the browser
	function __subscribeRemoteBrowser(urld, options) {

		// assemble the final url
		var url = (urld.protocol || 'http') + '://' + urld.authority + urld.relative;

		// initiate the event stream
		return new BrowserRemoteEventStream(url);
	}

	// subscribes to a remote host in a nodejs process
	function __requestRemoteNodejs(urld, options, okCb, errCb, cbContext) {
		throw "request() has not yet been implemented for nodejs";
	}

	// EventStream
	// ===========
	// INTERNAL
	// Provided by subscribe() to manage the events
	function EventStream() {
		Link.EventEmitter.call(this);
		this.isOpen = true;
	}
	EventStream.prototype = Object.create(Link.EventEmitter.prototype);
	EventStream.prototype.close = function() {
		this.isOpen = false;
		this.removeAllListeners();
	};
	EventStream.prototype.__emitError = function(e) {
		this.emit('message', e);
		this.emit('error', e);
	};
	EventStream.prototype.__emitEvent = function(e) {
		this.emit('message', e);
		this.emit(e.event, e);
	};

	// LocalEventStream
	// ================
	// INTERNAL
	// Descendent of EventStream
	function LocalEventStream() {
		EventStream.call(this);

		// :TODO:
	}
	LocalEventStream.prototype = Object.create(EventStream.prototype);
	LocalEventStream.prototype.okCb = function(payload, headers, isConnOpen) {
		if (!isConnOpen) {
			this.close();
		}
		else if (payload && typeof payload === 'object') {
			this.__emitEvent(payload);
		}
	};
	LocalEventStream.prototype.errCb = function(payload, headers, isConnOpen) {
		if (payload && typeof payload === 'object') {
			this.__emitError({ event:'error', data:undefined });
		}
		this.close();
	};
	LocalEventStream.prototype.close = function() {
		this.__emitError({ event:'error', data:undefined });
		EventStream.prototype.close.call(this);
	};

	// BrowserRemoteEventStream
	// ========================
	// INTERNAL
	// Descendent of EventStream, abstracts over EventSource
	function BrowserRemoteEventStream(url) {
		EventStream.call(this);

		// establish the connection to the remote source
		this.eventSource = new EventSource(url);
		// wire it up to our functions
		var self = this;
		this.eventSource.onerror = function(e) { self.close(); };
	}
	BrowserRemoteEventStream.prototype = Object.create(EventStream.prototype);
	BrowserRemoteEventStream.prototype.addListener = function(type, listener) {
		if (!this._events[type]) {
			// if this is the first add to the event stream, register our interest with the event source
			var self = this;
			this.eventSource.addEventListener(type, function(e) {
				var data = e.data;
				try { data = JSON.parse(data); } catch(err) {}
				self.__emitEvent({ event:e.type, data:data });
			});
		}
		Link.EventEmitter.prototype.addListener.call(this, type, listener);
	};
	BrowserRemoteEventStream.prototype.on = BrowserRemoteEventStream.prototype.addListener;
	BrowserRemoteEventStream.prototype.close = function() {
		this.eventSource.close();
		this.eventSource.onerror = null;
		this.eventSource = null;
		EventStream.prototype.close.call(this);
	};

	exports.subscribe       = subscribe;
})(Link);