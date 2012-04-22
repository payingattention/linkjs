define(['./request', './response', './app', './util'], function(Request, Response, LinkApp, util) {
    // Module
    // ======
    // A collection of functionality which can be added to the browserver at any number of URIs
    // Usage:
    //   var MyModule = new Module({ attrib1:'value1', attrib2:'value2' });

    // Constructor
    //  - each instance in the browserver will init to the values given
    var Module = function(initialAttributes) {
        util.deepCopy(this, initialAttributes);
        this.__handlers = [];
    };
    
    // Adds a new request handler
    Module.prototype.route = function(matchParams, callback) {
        // Convert URI from String to RegExp
        if (matchParams.uri && typeof(matchParams.uri) == 'string') {
            matchParams.uri = new RegExp(matchParams.uri, 'i');
        }
        this.__handlers.push({ matchParams:matchParams, callback:callback });
    };

    // Getters
    Module.prototype.get_handlers = function() {
        return this.__handlers;
    }
    
    // `Route` sugars
    Module.prototype.get = function(matchParams, callback) {
        matchParams.method = 'get';
        return this.route(matchParams, callback);
    };
    Module.prototype.post = function(matchParams, callback) {
        matchParams.method = 'post';
        return this.route(matchParams, callback);
    };
    Module.prototype.put = function(matchParams, callback) {
        matchParams.method = 'put';
        return this.route(matchParams, callback);
    };
    Module.prototype.del = function(matchParams, callback) {
        matchParams.method = 'delete';
        return this.route(matchParams, callback);
    };
    
    // Gives instance URI; can receive a relative path, such as '../'
    Module.prototype.uri = function(opt_relpath) {
        if (opt_relpath) { return util.buildPath([this.__uri, opt_relpath]); }
        return this.__uri;
    };

    // Creates an instance of the resource and attaches it to the given URI
    Module.prototype.addTo = function(uri) {
        // Build the new instance using `this` as the prototype
        var ctor = function() {};
        ctor.prototype = this;
        ctor.__uri = uri;
        var instance = new ctor();
        // Register with LinkApp
        LinkApp.addModule(uri, instance);
        return instance;
    };
    return Module;
});