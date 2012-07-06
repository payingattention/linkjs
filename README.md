# LinkJS

Modular messaging architecture using the REST style.

````
CartModule.someFunc() ==>[GET #inventory/sku/4003/price]==> InventoryModule.priceHandler()
````

LinkJS configures modules into a URI structure, then provides path-based routing and request/response messaging
between them. In the browser, Link will intercept link clicks and form submits to hashed URIs, then route it as
a message through the structure to compose a response which can be inserted into the DOM. Also, URIs which point
to remote locations will automatically run as Ajax calls, allowing code to make calls to remote or in-process
functionality without knowing the difference.

## Getting Started

Download `link.js` and load it into the document using [RequireJS](http://requirejs.org).

Modules export routes for handling requests:

```javascript
    // typical constructor
    var AccountModule = function() {
        this.messages = [];
    };
    AccountModule.prototype.routes = [
        Link.route('dashboard', { uri:'^/?$', method:'get', accept:'text/html' }),
        Link.route('messages', { uri:'^/messages/?$', method:'get', accept:'obj' }),
        Link.route('message', { uri:'^/messages/([0-9]+)/?$' }),
        Link.route('messageReply', { uri:'^/messages/([0-9]+/reply?$', method:'post' })
    ];
    // The second parameter of `route()` is a match object
    // all of its string values are converted to regexps
```

They're then configured into a URI structure to compose the application:

```javascript
    var app = new Link.Structure();
    app.addModule('#', new StoreModule());
    app.addModule('#account', new AccountModule());
    app.addModule('#cart', new CartModule());
```

### Requests/Responses

To issue a request in a module:

```javascript
    // get messages
    app.dispatch({ method:'get', uri:'#account/messages', accept:'obj/*' }, function(response) {
        if (response.code == 200) { this.messages = response.body; }
    }, this);
```

Responses are formed by handlers:

```javascript
    AccountModule.prototype.messages = function(request) {
        return Link.response(200, this.messages, 'obj/message-array');
    });
```

If some async work must be done first, the handler can return a `Promise`.

```javascript
    AccountModule.prototype.messages = function(request) {
        var promise = new Link.Promise();
        this.someAsyncAction(function(data) {
            promise.fulfill(Link.response(200, data, 'obj/some-type'));
        });
        return promise;
    });
```

The vision for Link is to create applications which are easy to extend due to the constraints of the REST
interfaces. For instance, an inbox application could issue requests to all resources under the #services/ URI,
then combine the results, allowing direct integration from multiple different sources. This is exemplified in
the inbox demo, which can be found in `/examples`.

## API

Full API documentation is in the works.

# License

Link is released under the MIT License (found in the LICENSE file).