# LinkJS

LinkJS provides event- and request-messaging between objects using HTTP as an underlying protocol. 

Features:

 - Abstraction over local and remote connections 
   - Local services use httpl:// (l for local)
   - All other protocols use ajax or node's request api
 - Events and requests using one API
   - If the connection is remote, events and implemented using the [server-sent events protocol](https://developer.mozilla.org/en-US/docs/Server-sent_events/Using_server-sent_events)
 - Simplified request/response API with a wrapper system based on Web Intents

## Basic Usage

First, during init:

```javascript
// add document-local servers
Link.register('localstorage.api', myLocalstorageServer);
Link.register('user-session.api', myUserSessionServer);
Link.register('navigation.ui', myNavUIServer);
//...
```

A consumer would then:

```javascript
// establish a session with the target
var localStorage = Link.session(this, 'httpl://localstorage.api', { events:true }); // events=true tells us to support events

// event listening
localStorage.on('localstorage-event', function(data) {
	//...
});

// requests
localStorage.request('post', { path:'/settings/myapp', 'content-type':'application/json', body:somedata })
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

// event publishing
server.notify('localstorage-event', { foo:'bar' });
server.on('subscribe', function(client) {
	server.notify('another-localstorage-event', { foo:'bar' }, client);
});

// request handling
server.handle('post', { path:new RegExp('^/settings/(.*)/?$','i') }, function(request, match) {
	// ...
});
```