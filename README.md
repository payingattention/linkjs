# LinkJS

A Javascript mediator framework designed for composability in browser applications using the REST style.

### [Click here for a live demo (todo)](#todo)

## Usage

Modules export routes for handling HTTP-style requests:

```javascript
    // typical constructor
    var AccountModule = function() {
        this.messages = [];
    };
    // `cb` is the handler, and everything else is used to match the request to the route
    AccountModule.prototype.routes = [
        { cb:'dashboard', uri:'^/?$', method:'get' accept:'text/html' },
        { cb:'message', uri:'^/message/([0-9]+)/?$' },
        { cb:'messageReply', uri:'^/message/([0-9]+/reply?$', method:'post' }
    ];
```

The modules are then configured into a URI structure to compose the application:

```javascript
    var app = new Link.Mediator();
    app.addModule('#', new StoreModule());
    app.addModule('#/account', new AccountModule());
    app.addModule('#/cart', new CartModule());
    // the modules' routes operate relative to their configured URIs
    Link.attachToWindow(app);
```

Link intercepts `<a>` clicks and `<form>` submits. If their targets start with a hash (#), Link routes the
request through the configured modules, then renders the response. This allows you to build client-side apps
as if they were remote websites, possibly without ever accessing the DOM directly.

Modules can also send their own requests:

```javascript
    // get users
    this.mediator.dispatch({ method:'get', uri:this.users_link, accept:'js/array' }, function(response) {
        if (response.code == 200) { this.users = response.body; }
    }, this);
```

Responses are returned by handlers:

```javascript
    // `/users`
    UsersModule.prototype.usersHandler = function(request) {
        return { code:200, body:this.activeUsers, 'content-type':'js/array' };
        // it may be wise to clone activeUsers before responding with it
    });
```

If some async work must be done first, the handler can return a `Promise`, and Link will pause the handler chain until
the promise is fulfilled:


```javascript
    UsersModule.prototype.usersHandler = function(request) {
        var promise = new Link.Promise();
        this.someAsyncAction(function(data) {
            promise.fulfill({ code:200, body:data, 'content-type':'js/array' })
        });
        return promise;
    });
```

The vision for Link is to create applications which are easy to extend due to the constraints of the
interfaces. For instance, an inbox application could use a single REST API for messaging services, then consume
any number of services which employ the API, allowing direct integration from multiple different sources. This is
exemplified in the inbox demo, which can be found in `/examples`.

## The Inbox Example

:TODO: a detailed explanation of how the inbox example works

## Response Composition

:TODO: update this to match the current API

Multiple handlers can be configured to match the same route. In that event, they are added into a
handler chain which respects the order of declaration:

```javascript
    UsersModule.get({ uri:'^/feed/?$', accept:'text/html' }, function(request) {
        request.respond(200, this.buildFeedHtml(this.feed), 'text/html');
    });
    UsersModule.get({ uri:'.*', accept:'text/html' }, function(request, response) {
        // `response` is provided from the last handler
        response.body(this.buildHtmlLayout(response.body())); // Wrap the response body with our layout
        request.respond(response);
    });
```

If handlers from multiple modules match a request, then precedence is enforced by the depth of the module
URIs. That is, the handlers for a module at '#/a' would be called before the handlers for a module at
'#/a/b'.

Like DOM events, you can also choose to handle the bubble phase of the request if you want
the callback to run at the end of the chain. This allows code like the previous example to work
across modules.

```javascript
    // Configured to '#'
    MainModule.get({ uri:'.*', accept:'text/html', bubble:true }, function(request, response) {
        // Bubble handlers are FILO; this is guaranteed to run after all sub-module handlers
        response.body(this.buildHtmlLayout(response.body()));
        request.respond(response);
    });
    // Configured to '#/users'
    UsersModule.get({ uri:'^/feed/?$', accept:'text/html' }, function(request) {
        request.respond(200, this.buildFeedHtml(this.feed), 'text/html');
    });
```

## Remote Requests

:TODO:

## API

:TODO:

# License

Link is released under the MIT License (found in the LICENSE file).