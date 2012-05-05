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
        // Get the nav, with highlighting for the given uri
        this.navMediator.get({ uri:'#', accept:'text/html' }, function(response) {
            this.navMediator.renderResponse(request, response);
        }, this);
        // Pipe request to content directly
        this.contentMediator.dispatch(request, function(response) {
            this.contentMediator.renderResponse(request, response);
        }, this);
        return { code:204 }; // keep existing html
    };

    // Export
    Modules.Layout = Layout;
})(Modules);