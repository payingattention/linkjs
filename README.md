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

`npm install pfraze-linkjs`

(There may need to be a name change; `pfraze-` won't be permanent.)

Modules export routes for handling requests:

```javascript
    // typical constructor
    var AccountModule = function() {
        this.messages = [];
    };
    AccountModule.prototype.routes = {
        dashboard:{ uri:'^/?$', method:'get', accept:'text/html' },
        messages:{ uri:'^/messages/?$', method:'get', accept:'js/object' },
        message:{ uri:'^/messages/([0-9]+)/?$' },
        messageReply:{ uri:'^/messages/([0-9]+/reply?$', method:'post' }
    };
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
    app.dispatch({ method:'get', uri:'#account/messages', accept:'js/object' }, function(response) {
        if (response.code == 200) { this.messages = response.body; }
    }, this);
```

Responses are formed by handlers:

```javascript
    AccountModule.prototype.messages = function(request) {
        return { code:200, body:this.messages, 'content-type':'js/object' };
    });
```

If some async work must be done first, the handler can return a `Promise`.

```javascript
    AccountModule.prototype.messages = function(request) {
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

## API

Full API documentation is in the works.

# License

Link is released under the MIT License (found in the LICENSE file).