(function(Modules) {
    // Nav Module
    // ==========
    // renders the nav
    var Nav = function() {
    };

    // Handler routes
    Nav.prototype.routes = [
        { cb:'todo', uri:'.*' }
    ];

    // Handlers
    Nav.prototype.todo = function(request) {
        return { code:200, body:'todo', 'content-type':'text/html' };
    };

    // Export
    Modules.Nav = Nav;
})(Modules);