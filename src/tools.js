// Tools
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
})(Link);