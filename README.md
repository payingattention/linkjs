![LinkJS](http://linkshui.com/wp-content/uploads/2012/08/ljs_logo.png)

An Ajax library that allows JS modules to respond along with remote services.

````
CartModule.someFunc() ==>[GET /item/4003/price]==> InventoryModule.priceHandler()
````

LinkJS configures server modules into a local URI space, then allows each one to respond to requests before defaulting to Ajax. This allows one-page applications to compose the document without having to tie directly to the DOM or each other.

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
        Link.route('messages', { uri:'^/messages/?$', method:'get', accept:'application/json' }),
        Link.route('message', { uri:'^/messages/([0-9]+)/?$' }),
        Link.route('messageReply', { uri:'^/messages/([0-9]+/reply?$', method:'post' })
    ];
    // The second parameter of `route()` is a match object
    // all of its string values are converted to regexps
```

They're then configured into a URI structure to compose the application:

```javascript
    var app = new Link.Structure();
    app.addModule('/', new StoreModule());
    app.addModule('/account', new AccountModule());
    app.addModule('/cart', new CartModule());
```

### Requests/Responses

To issue a request in a module:

```javascript
    // get messages
    app.dispatch({ method:'get', uri:'/account/messages', accept:'application/json' }, function(response) {
        if (response.code == 200) { this.messages = response.body; }
    }, this);
```

Responses are formed by handlers:

```javascript
    AccountModule.prototype.messages = function(request) {
        return Link.response(200, this.messages, 'application/json');
    });
```

If some async work must be done first, the handler can return a `Promise`.

```javascript
    AccountModule.prototype.messages = function(request) {
        var promise = new Link.Promise();
        this.someAsyncAction(function(data) {
            promise.fulfill(Link.response(200, data, 'application/json'));
        });
        return promise;
    });
```

## API

Full API documentation is in the works.

# License

Link is released under the MIT License (found in the LICENSE file).