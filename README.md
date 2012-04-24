# Link

A Javascript mediator framework designed for composability in browser applications using the REST style.

### [Click here for a live demo](#todo)

## Usage

Modules export routes for handling HTTP requests:

```javascript
    // Declare attributes in the constructor
    var AccountModule = new Module({
        activeUsers:[],
        messages:[]
    });
    // Add routes
    AccountModule.get({ uri:'^/?$', accept:'text/html' },   'dashboardHandler');
    AccountModule.route({ uri:'^/message/([0-9]+)/?$' },    'messageHandler');
    AccountModule.post({ uri:'^/message/([0-9]+/reply?$' }, 'messageReplyHandler');
```

The modules are then configured into a URI structure to compose the application:

```javascript
    ShopModule.addTo('#');
    AccountModule.addTo('#/account');
    CartModule.addTo('#/cart');
    // the routes operate relative to the module's configured URI
```

After `app.init()`, Link intercepts `<a>` clicks and `<form>` submits. If their targets start with
a hash (#), the modules' handlers will respond to the request, and Link will render the response.

Modules can also build their own requests:

```javascript
    var request = new Request('get', this.users_link, { accept:'application/json' });
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

While this style may not be succinct, it exposes the internals of the application in a discoverable
and extensible way. Developers can log request traffic to learn about the application flow. Then,
either by configuration or convention (via `app.findModules()`) components can be written to interface
with each other to form the application.

To get a better feel for this, check out the inbox application in `examples/`.

## Response Composition

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

## Advanced Usage

**App.findModules**

:TODO:

**Immediate Response During Ajax**

:TODO:

**Custom Response Rendering**

:TODO:

**Request Factories**

:TODO:

**Batch Dispatches**

:TODO:

## API

:TODO:

# License

Link is released under the MIT License (found in the LICENSE file).