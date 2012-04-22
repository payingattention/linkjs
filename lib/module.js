define(function() {
    // Module
    // ======
    // A collection of routes which can be added to the Link environment
    // Usage:
    //   var MyModule = Module(function() {
    //       this.attr1 = 'value1';
    //       this.attr2 = 'value2';
    //   });
    //   var myModuleInstance = new MyModule('#/a/b/c');

    // Constructor decorator, produces a template to build around
    //  - takes the module's custom constructor function
    var Module = function(ctor_cb) {
        var ctor = function(uri) {
            this.__uri = uri;
            ctor_cb.call(this);
        };
        ctor.prototype.handlers = [];
        ctor.prototype.uri = moduleUriFunction;
        ctor.route = moduleRouteFunction;
        ctor.get = moduleGetFunction;
        ctor.post = modulePostFunction;
        ctor.put = modulePutFunction;
        ctor.del = moduleDelFunction;
        return ctor;
    };

    // Creates a descendent module definition
    Module.Extend = function(parent, ctor_cb) {
        var ctor = function(uri) {
            this.__uri = uri;
            ctor_cb.call(this);
        };
        for (var prop in parent.prototype) {
            ctor.prototype[prop] = parent.prototype[prop];
        }
        return ctor;
    };
    
    // Gives instance URI; can receive a relative path, such as '../'
    var moduleUriFunction = function(opt_relpath) {
        //if (opt_relpath) { :TODO: }
        return this.__uri;
    };

    // Adds a new request handler
    var moduleRouteFunction = function(matchParams, callback) {
        if (!callback) {
            console.log('Warning: callback not provided for matchParams', matchParams);
            return;
        }
        // Convert URI from String to RegExp
        if (matchParams.uri && typeof(matchParams.uri) == 'string') {
            matchParams.uri = new RegExp(matchParams.uri, 'i');
        }
        this.prototype.handlers.push({ matchParams:matchParams, callback:callback });
    };
    
    // `Route` sugars
    var moduleGetFunction = function(matchParams, callback) {
        matchParams.method = 'get';
        return this.route(matchParams, callback);
    };
    var modulePostFunction = function(matchParams, callback) {
        matchParams.method = 'post';
        return this.route(matchParams, callback);
    };
    var modulePutFunction = function(matchParams, callback) {
        matchParams.method = 'put';
        return this.route(matchParams, callback);
    };
    var moduleDelFunction = function(matchParams, callback) {
        matchParams.method = 'delete';
        return this.route(matchParams, callback);
    };

    return Module;
});