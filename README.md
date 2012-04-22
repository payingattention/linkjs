# Link

A Javascript app framework designed for composability in browser applications. Functionality is
separated into modules which behave like REST resources and communicate using HTTP requests
(to local or remote targets). The goal is to create web apps which can be extended and customized
by adding new code on the client-side.

Link uses RequireJS but has no dependencies otherwise. It currently runs in-browser only; it'll
be factored for server-side as well in the near future. To see it in action, go to (some link)
or pull down a copy and open `examples/inbox/index.html`.

*Note, none of that second paragraph is currently true. I'm still finishing up the refactor.*

## Usage

In Link, Modules provide a set of routes:

```javascript
    // Declare attributes in the constructor
    var AccountModule = new Module({
        activeUsers:[],
        messages:[]
    });
    // Add routes
    AccountModule.get({ uri:'^/?$', accept:'text/html' },                        dashboardHandler);
    AccountModule.route({ uri:'^/message/([0-9]+)/?$' },                         messageHandler);
    AccountModule.get({ uri:'^/message/updates/?$', accept:'application/json' }, messageUpdatesHandler);
```

Which are instantiated into the URI structure during init:

```javascript
    ShopModule.addTo('#');
    AccountModule.addTo('#/account');
    CartModule.addTo('#/cart');
    // addTo() can be called any number of times; a new module will be instantiated for each
```

After `app.init()`, Link intercepts `<a>` clicks and `<form>` submits. If their targets start with
a hash (#), the modules' handlers will respond to the request. Those modules can also build their
own requests:

```javascript
    var request = (new Request())
    request.method('get').uri(this.users_link).header({ accept:'application/json' });
    request.dispatch(function(request, response) {
        if (response.ok()) {
            this.users = response.body();
        }
    }, this);
```

Which are responded to with handlers:

```javascript
    UsersModule.get({ uri:'^/?$', accept:'application/json' }, function(request) {
        request.respond(200, this.activeUsers, 'application/json');
    });
```

This sacrifices succinctness to expose the internals of the application in a discoverable
and extensible way. Developers can log request traffic to understand application flow. Then,
either by configuration or convention (via `app.findModules()`) components can interface with
each other to form the application.

## Response Composition

Multiple handlers can be configured to match the same route. In that event, they are built into a
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

If handlers from multiple modules match, then precedence is enforced by the depth of the module
URIs. That is, the handlers for a module at '#/a' would be called before the handlers for a module at
'#/a/b'. Like DOM events, you can choose to handle the bubble phase of the request if you want
to run at the end of the chain. This allows code like the previous example to work across modules.

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

## Advanced Usage

**App.findModules**

:TODO:

**Immediate Response with Async**

:TODO:

**Custom Response Rendering**

:TODO:

**Request Factories**

:TODO:

**Batch Dispatches**

:TODO:

## API

:TODO:

## License

Link is released under the MIT License (found in the LICENSE file).