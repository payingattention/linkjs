(function(Modules) {
    // Layout Module
    // =============
    // receives requests from DOM events and transports them to the appropriate frames
    var Layout = function(navMediator, contentMediator) {
        this.navMediator = navMediator;
        this.contentMediator = contentMediator;
    };

    // Handler routes
    Layout.prototype.routes = [
        { cb:'rerouter', uri:'.*' }
    ];

    // Handlers
    Layout.prototype.rerouter = function(request) {
        // Inform nav of the new URI
        // :TODO:
        // Pipe request to content directly
        this.contentMediator.dispatch(request, function(response) {
            this.contentMediator.renderResponse(request, response);
        }, this);
        return { code:204 }; // keep existing html
    };

    // Export
    Modules.Layout = Layout;
})(Modules);