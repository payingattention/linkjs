(function(Modules) {
    // Nav Module
    // ==========
    // renders the nav
    var Nav = function(services) {
        this.services = services;
    };

    // Handler routes
    Nav.prototype.routes = [
        { cb:'render', uri:'^/?$' }
    ];

    // Handlers
    Nav.prototype.render = function(request) {
        var navView = new Views.Nav();
        for (var uri in this.services) {
            var service = this.services[uri];
            navView.item().link(service.name, 'folder-open', '#/services/'+uri);
        }        
        return { code:200, body:navView.toString(), 'content-type':'text/html' };
    };

    // Export
    Modules.Nav = Nav;
})(Modules);