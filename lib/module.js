define(function() {
    // Module
    // ======
    // A collection of routes which can be added to the Link environment
    // Usage:
    //   var MyModule = Module({
    //       attr1:'value1'
    //   }, function() {
    //       this.attr2 = 'value2';
    //   });
    //   var myModuleInstance = new MyModule('#/a/b/c');

    // Constructor decorator, produces a template to build around
    //  - takes the module's custom constructor function
    var Module = function(def, ctorCb) {
        var ctor = function(uri) {
            this.__uri = uri;
            // process declared routes
            // (they use a sugary syntax in module declaration)
            var declRoutes = this.routes; this.routes = [];
            for (var i=0; i < declRoutes.length; i++) {
                for (var handler in declRoutes[i]) {
                    this.addRoute(handler, declRoutes[i][handler]);
                }
            }
            // call given cb
            ctorCb.call(this);
            // add resources handler as last route
            this.addRoute('resourcesHandler', { uri:'(.*)' });
        };
        ctor.prototype = def;
        ctor.prototype.routes = ctor.prototype.routes || [];
        ctor.prototype.resources = ctor.prototype.resources || {};
        ctor.prototype.uri = protoUri;
        ctor.prototype.addRoute = protoAddRoute;
        ctor.prototype.delRoute = protoDelRoute;
        ctor.prototype.addResource = protoAddResource;
        ctor.prototype.getResource = protoGetResource;
        ctor.prototype.findResources = protoFindResources;
        ctor.prototype.delResource = protoDelResource;
        ctor.prototype.resourcesHandler = protoResourcesHandler;
        return ctor;
    };

    // Gives instance URI
    var protoUri = function() {
        return this.__uri;
    };

    // Adds a new request handler
    var protoAddRoute = function(handler, matchParams) {
        // Convert URI from String to RegExp
        if (matchParams.uri && typeof(matchParams.uri) == 'string') {
            matchParams.uri = new RegExp(matchParams.uri, 'i');
        }
        this.routes.push({ handler:handler, matchParams:matchParams });
    };

    // Removes request handler
    var protoDelRoute = function(handlerCbName) {
        for (var i=0; i < this.routes.length; i++) {
            if (this.routes[i].handlerCbName == handlerCbName) {
                delete this.routes[i];
            }
        }
        return;
    };

    // Add new resource
    var protoAddResource = function(uri, handler, opt_def) {
        var resource = opt_def || {};
        resource.uri = uri;
        resource.handler = handler;
        this.resources[uri] = resource;
        return resource;
    };

    // Get existing resource
    var protoGetResource = function(uri) {
        if (uri in this.resources) {
            return this.resources[uri];
        }
        return null;
    };

    // Find resources using a regex pattern
    var protoFindResources = function(re) {
        if (typeof(re) == 'string') {
            re = new RegExp(re, 'i');
        }
        var hits = {};
        for (var uri in this.resources) {
            if (re.test(uri)) {
                hits[uri] = this.resources[uri];
            }
        }
        return hits;
    }

    // Remove resource from the module
    var protoDelResource = function(uri) {
        if (!Array.isArray(uri)) { uri = [uri]; }
        for (var i=0; i < uri.length; i++) {
            if (uri[i] in this.resources) {
                delete this.resources[uri[i]];
            }
        }
    };

    // Generic route handler for module resources
    var protoResourcesHandler = function(request, response, urimatch) {
        // :TODO: link headers
        var reqUri = urimatch[1]; // our relative uri
        // make sure the uri starts with a '/'
        if (reqUri.charAt(0) != '/') { reqUri = '/' + reqUri; }
        // do a direct match
        if (reqUri in this.resources) {
            var resource = this.resources[reqUri];
            var handler = resource.handler;
            // get function if given a string
            if (typeof(handler) == 'string') {
                handler = this[handler];
            }
            if (handler) {
                return handler.call(this, resource, request, response, urimatch);
            }
        }
        request.nextHandler();
    };
    
    return Module;
});