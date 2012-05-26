(function(Modules) {
    // Inbox Module
    // ============
    // pulls messages from multiple services and renders them in an inbox GUI
    var Inbox = function() {
        this.services = {};
        this.serviceCount = 0;
    };

    // Resource Metadata
    // =================
    Inbox.prototype.resources = {
        '/':{
            desc:'Inbox UI. Pulls from all resources configured to #services/*',
            _get:'All services',
            validate:function(request) {
                if (request.method != 'get') { throw { code:405, reason:'bad method' }; }
                if (request.accept && request.accept.indexOf('html') == -1) { throw { code:406, reason:'not acceptable' }; }
            }
        }
    };
    var serviceResource = {
        desc:'Inbox UI for a specific service',
        _get:'Specific service',
        validate:function(request) {
            if (request.method != 'get') { throw { code:405, reason:'bad method' }; }
            if (request.accept && request.accept.indexOf('html') == -1) { throw { code:406, reason:'not acceptable' }; }
        }
    };

    // Handler Routes
    // ==============
    Inbox.prototype.routes = [
        { cb:'prehandler', uri:'.*', accept:'text/html' },
        { cb:'mainInbox', uri:'^/?$', method:'get', accept:'text/html' },
        { cb:'serviceInbox', uri:'^/services/([^/]+)/?$', method:'get', accept:'text/html' }
    ];
    
    // Pre-handler
    // ===========
    // one-time init
    Inbox.prototype.prehandler = function(request) {  
        if (this.serviceCount > 0) { return; }
        
        // Find all services configged to ./services/*/
        var serviceUris = this.mediator.findResources('#services/([^/]+)/?$', 1);
        for (var slug in serviceUris) {
            // Store links to the service
            this.services[slug] = {
                messagesLink:{ uri:'#services/'+slug, accept:'js/object' }
            };
            // Add resource
            this.resources['/' + slug] = serviceResource;
            this.serviceCount++;
        }
    };

    // Resource Handlers
    // =================
    Inbox.prototype.mainInbox = function() {
        // Promise to respond after the services all sync
        var promise = new Link.Promise();
        var responsesLeft = this.serviceCount;
        // Get messages from all services
        var allMessages = [];
        for (var slug in this.services) {
            // Capture the service in a closure
            (function(self, service) {
                self.mediator.get(service.messagesLink, function(response) {
                    // Cache
                    if (response.code == 200) {
                        service.messages = response.body;
                        allMessages = allMessages.concat(service.messages);
                    }
                    if (--responsesLeft == 0) {
                        // Render response
                        var inboxView = new Views.Inbox(this.uri);
                        inboxView.addMessages(allMessages);
                        promise.fulfill({
                            code:200,
                            body:inboxView.toString(),
                            'content-type':'text/html'
                        });
                    }
                }, self);
            })(this, this.services[slug]);
        }
        return promise;
    };
    Inbox.prototype.serviceInbox = function(request, response, match) {
        // Get the service
        var service = this.services[match.uri[1]];
        if (!service) { return { code:404 }; }
        
        // Dispatch for messages
        var promise = new Link.Promise();
        this.mediator.get(service.messagesLink, function(response) {
            // Cache
            if (response.code == 200) { this.messages = response.body; }
            // Render & respond
            var inboxView = new Views.Inbox('todo'); //:TODO:
            inboxView.addMessages(service.messages);
            promise.fulfill({
                code:200,
                body:inboxView.toString(),
                'content-type':'text/html'
            });
        }, service);
        return promise;
    };

    // Export
    Modules.Inbox = Inbox;
})(Modules);