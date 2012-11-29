# LinkJS

LinkJS provides event- and request-messaging between objects using HTTP as an underlying protocol. 


Top-level (document / process) initialization:

```javascript
// add a server
Link.register('localstorage.api', myLocalstorageServer);

// decide who can open sessions
Link.on('session:localstorage.api', function(client, session) {
	if (isTrusted(client)) {
		session.allow();
	}
});
// or, if you don't care...
Link.on('session', function(_, session) { session.allow(); });

// import a set of intent handlers
Link.implement('http://intent-registry.com/', Link.commonIntentHandlers);
```

The consumer:

```javascript
// establish a session with the target
var localStorage = Link.session(this, 'localstorage.api', { events:true });

// standard pubsub
localStorage.on('localstorage-event', function(data) {
	//...
});

// request according to an intent spec
localStorage.using('http://intent-registry.com/');
localStorage('/collections/list', { collection:'settings', filters:{ app:'myapp' }})
	.then(function(settings) {
		//...
	}, function(error) {
		//...
	});

// request by standard http
localStorage.using(null);
localStorage('post', { path:'/settings/myapp', 'content-type':'application/json', body:somedata })
	.then(function(response) {
		//...
	}, function(error) {
		//...
	});
```

The server:

```javascript
// create the server
var server = Link.server();

// standard pubsub
server.publish('localstorage-event', { foo:'bar' });
server.on('subscribe', function(client) {
	server.publish('another-localstorage-event', { foo:'bar' }, client);
});

// handler according to an intent sec
server.using('http://intent-registry.com/');
server.handle('/collections/list', { collection:localStorage.hasCollection } function(params) {
	return localStorage.getCollection(params.collection); //...
});

// handler using standard http
// (:NOTE: may overlap with an intent's implementation, as intents are still http request handlers)
server.using(null);
server.handle('post', { path:new RegExp('^/settings/(.*)/?$','i') }, function(request, match) {
	// ...
});
```

A sample intent handler:

```javascript
Link.commonIntentHandlers = {
	'/collections/list':{
		toHTTP:function(obj) {
			return validate(function(v) {
				var request = {
					method:'get',
					path:'/'+v(obj.collection, 'collection', v.NotNull, v.IsString),
					accept:v(obj.accept||'application/json', 'accept', v.NotNull, v.IsString)
				};
				if (obj.filters) {
					request.query = v(obj.filters, 'filters', v.IsObject);
				}
				return request;
			});
		},
		fromHTTP:function(request) {
			return validate(function(v) {
				v(request.method, 'method', v.Equals('get'));
				var object = {
					collection:v(request.path.substr(1), 'path', v.NotNull, v.IsString),
					accept:request.accept||'application/json'
				};
				if (request.query) {
					object.filters = request.query;
				}
				return object;
			});
		}
	}
}
```