# LinkJS

LinkJS is an Ajax library that allows local functions to respond to requests.

**Why?** It allows local code to behave like remote servers. HTML links and forms can target in-document scripts, and isolated modules can route messages via URLs and other REST features.

Other Features:

 - Event subscription to servers
   - If the connection is remote, events and implemented using the [server-sent events protocol](https://developer.mozilla.org/en-US/docs/Server-sent_events/Using_server-sent_events)
 - Navigator interface
 - EventEmitter API (mimics NodeJS' EventEmitter)

## Basic Usage

Local server registration:

```javascript
// registers to httpl://localserver.api
Link.registerLocal('localserver.api', function(request, response) {
	if (request.path === '/' && request.method === 'get') {
		if (request.accept === 'text/html') {
			// `response` mimics NodeJS' `ServerResponse` API
			response.writeHead(200, 'ok', { 'content-type':'text/html' });
			response.end('<h1>Hello, World!</h1>');
		} else if (request.accept === 'text/event-stream') {
			// event subscription
			response.writeHead(200, 'ok', { 'content-type':'text/event-stream' });
			response.write({ event:'hello', data:'world' }); // send an event
			response.end({ event:'bye' }); // close the stream
		}
	}
});
//...
```

From a client:

```javascript
// dispatch a GET request
Link.dispatch({ method:'get', url:'httpl://localserver.api', accept:'text/html' })
	// responses are handled via promises:
	.then(function(response) {
		myDiv.innerHTML = response.body;
	})
	.except(function(err) {
		myDiv.innerText = err.message;
	});

// subscribe to an event stream
var events = Link.subscribe({ url:'httpl://localserver.api' });
stream.on('hello', log); // => { event:'hello' data:'world' }
stream.on('bye', log); // => { event:'bye' data:undefined }
```

## Navigator Usage

The Navigator provides an interface to HTTP servers which behaves somewhat like a browser. It follows the links given in the response's 'Link' header to arrive at data. Links are followed according to their 'rel' attributes. 

```javascript
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
```

## Further Documentation

Can be found at [http://grimwire.com/local/docs.html#lib/linkjs.md](http://grimwire.com/local/docs.html#lib/linkjs.md)
