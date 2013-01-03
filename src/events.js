// Events
// ======
// :NOTE: currently, Chrome does not support event streams with CORS
(function(exports) {

	// subscribe()
	// =========
	// EXPORTED
	// Establishes a connection and begins an event stream
	// - sends a GET request with 'text/event-stream' as the Accept header
	// - `req` param:
	//   - requires the target url
	//   - target url can be passed in req as `url`, or generated from `host` and `path`
	// - returns a `EventStream` object
	function subscribe(req) {

		if (!req) { throw "no options provided to subscribe"; }
		if (typeof req == 'string') {
			req = { url:req };
		}

		// parse the url
		if (req.url) {
			req.urld = Link.parse.url(req.url);
		} else {
			req.urld = Link.parse.url(__joinUrl(req.host, req.path));
		}
		if (!req.urld) {
			throw "no URL or host/path provided to subscribe";
		}

		// execute according to protocol
		if (req.urld.protocol == 'httpl') {
			return __subscribeLocal(req);
		} else {
			return __subscribeRemote(req);
		}
	}

	// subscribes to a local host
	function __subscribeLocal(req) {

		// initiate the event stream
		var stream = new LocalEventStream(Link.request({
			method  : 'get',
			url     : 'httpl://' + req.urld.authority + req.urld.relative,
			headers : { accept : 'text/event-stream' },
			stream  : true
		}));
		return stream;
	}

	// subscribes to a remote host
	function __subscribeRemote(req) {
		if (window) {
			return __subscribeRemoteBrowser(req);
		} else {
			return __subscribeRemoteNodejs(req);
		}
	}

	// subscribes to a remote host in the browser
	function __subscribeRemoteBrowser(req) {

		// assemble the final url
		var url = (req.urld.protocol || 'http') + '://' + req.urld.authority + req.urld.relative;

		// initiate the event stream
		return new BrowserRemoteEventStream(url);
	}

	// subscribes to a remote host in a nodejs process
	function __subscribeRemoteNodejs(req) {
		throw "subscribe() has not yet been implemented for nodejs";
	}

	// EventStream
	// ===========
	// INTERNAL
	// Provided by subscribe() to manage the events
	function EventStream() {
		Link.EventEmitter.call(this);
		this.isConnOpen = true;
	}
	EventStream.prototype = Object.create(Link.EventEmitter.prototype);
	EventStream.prototype.close = function() {
		this.isConnOpen = false;
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
	function LocalEventStream(resPromise) {
		EventStream.call(this);

		// wait for the promise
		var self = this;
		resPromise
			.then(function(response) {
				// begin emitting
				response.on('data', function(payload) {
					self.__emitEvent(payload);
				});
				response.on('end', function() {
					self.close();
				});
			})
			.except(function(err) {
				// fail town
				self.__emitError({ event:'error', data:err });
				self.close();
			});
	}
	LocalEventStream.prototype = Object.create(EventStream.prototype);
	LocalEventStream.prototype.close = function() {
		this.__emitError({ event:'error', data:undefined }); // :NOTE: emulating the behavior of EventSource
		// :TODO: would be great if close didn't emit the above error
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
		if (Array.isArray(type)) {
			type.forEach(function(t) { this.addListener(t, listener); }, this);
			return;
		}
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