# LinkJS

Communicate between modules using HTTP-style requests.

````
    CartModule ------"GET #inventory/sku/4003/price"------> InventoryModule
````

No direct calls makes it simple to swap out or configure in new code. Plus, LinkJS
intercepts form submits and link clicks to hash URLs, allowing modules to respond
with HTML and avoid interacting with the DOM. (Good for server/client reuse.)


## Getting Started

Currently in between deployments, so this is all out of date-- plus the tests and examples are broken. Yeah, I'm a scrub. Will fix soon.

[The LinkShUI CLI is the focus of development, so look at that for now](https://github.com/pfraze/linkshui).

## Usage

**All just a bit out of date; will fix soon**

Modules export routes for handling requests:

```javascript
    // typical constructor
    var AccountModule = function() {
        this.messages = [];
    };
    // `cb` is the handler, and everything else is used to match the request to the route
    AccountModule.prototype.routes = [
        { cb:'dashboard', uri:'^/?$', method:'get', accept:'text/html' },
        { cb:'message', uri:'^/message/([0-9]+)/?$' },
        { cb:'messageReply', uri:'^/message/([0-9]+/reply?$', method:'post' }
    ];
```

They can also (optionally) export resources which run request validation and document the available URIs.

```javascript
    AccountModule.prototype.resources = {
        '/': {
            desc:'The account dashboard.'
            validate:function(request) { 
                if (request.method != 'get') { throw { code:405, reason:'bad method' }; } 
            },
            _get:{
                desc:'Provides HTML overview of account settings.',
                validate:function(request) { /* etc */ }
            }   
        }
    };
```

The modules are then configured into a URI structure to compose the application:

```javascript
    var app = new Link.Mediator();
    app.addModule('#', new StoreModule());
    app.addModule('#account', new AccountModule());
    app.addModule('#cart', new CartModule());
```

After `Link.attachToWindow()`, form submits and link clicks to fragment uris ('#whatever') will
be handled by the application.

### Requests/Responses

To issue a request in a module:

```javascript
    // get users
    this.mediator.dispatch({ method:'get', uri:'#users', accept:'js/object' }, function(response) {
        if (response.code == 200) { this.users = response.body; }
    }, this);
```

Responses are returned by handlers:

```javascript
    // `#users`
    UsersModule.prototype.getHandler = function(request) {
        return { code:200, body:this.activeUsers, 'content-type':'js/object' };
    });
```

If some async work must be done first, the handler can return a `Promise`, and Link will pause the handler chain until
the promise is fulfilled:

```javascript
    UsersModule.prototype.usersHandler = function(request) {
        var promise = new Link.Promise();
        this.someAsyncAction(function(data) {
            promise.fulfill({ code:200, body:data, 'content-type':'js/object' })
        });
        return promise;
    });
```

The vision for Link is to create applications which are easy to extend due to the constraints of the REST
interfaces. For instance, an inbox application could issue requests to all resources under the #services/ URI,
then combine the results, allowing direct integration from multiple different sources. This is exemplified in
the inbox demo, which can be found in `/examples`.

## The Inbox Example

The inbox app uses 3 different modules: a main inbox interface and 2 service resources. The inbox is configured
to '#'; the services are underneath '#services/'.

The inbox interface looks for the service resources when it gets its first request:

`var serviceUris = this.mediator.findResources('#services/([^/]+)/?$', 1);`

When its root resource receives a GET request for html, the inbox issues GET requests to the service resources.
They respond with arrays of messages, which the inbox then orders and renders into HTML for the final response.

The main inbox also handles GET requests to the individual service URIs (eg '#services/fixture') which means there
are multiple modules handling the same URI. However, the inbox handles requests for HTML, while the services only
provide 'js/object' responses.

If a service wanted to handle the HTML GET request, it could; because its module is further down the URI structure
than the inbox module ('#' versus '#services/___') it will respond second, and thus can discard the original inbox's
response.

## Type Interfaces

One other tool in LinkJS is the "type interface" registry, which is a application-wide set of wrapper objects to help
mimetypes interoperate. This feature is still in development, but can be accessed with `Link.getTypeInterface` and
`Link.addToType`. A brief example:

```javascript
    Link.addToType('js/mymodule+object', {
        toHtml:function() { return '<div>'+this.data.toString()+'</div>'; }
    });
```

This allows code elsewhere to easily convert to the type it needs:

```javascript
    var iface = Link.getTypeInterface(response['content-type'], response.body);
    var asHtml = iface.toHtml();
```

Each interface inherits from its parent type, which follows the mimetype format. For instance, methods in the 'text' interface
are available to 'text/html', and 'text/subformat+html' inherits from 'text/html'. LinkJS includes interfaces for some basic types
(html, json, javascript objects) along with converting functions (toHtml, toJson, toObject).

## API

Full API documentation is in the works.

# License

Link is released under the MIT License (found in the LICENSE file).
