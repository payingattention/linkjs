define(['link','views'], function(Link, Views) {
    // Inbox Module
    // ============
    // pulls messages from multiple services and renders them in an inbox GUI
    var Inbox = function(structure, config) {
        this.structure = structure;
        this.uri = config.uri;
        this.services = config.services;
        // Prep the structure
        for (var slug in this.services) {
            this.serviceCount++;
            this.services[slug].messagesLink = { uri:'/services/'+slug, accept:'obj/*' };
        }
    };

    // Handler Routes
    // ==============
    Inbox.prototype.routes = [
        Link.route('mainInbox', { uri:'^/?$', method:'get', accept:'text/html' }),
        Link.route('serviceInbox', { uri:'^/services/([^/]+)/?$', method:'get', accept:'text/html' })
    ];

    // Resource Handlers
    // =================
    Inbox.prototype.mainInbox = function() {
        // Promise to respond after the services all sync
        var promise = new Link.Promise();
        var responsesLeft = 0;
        // Get messages from all services
        var allMessages = [];
        for (var slug in this.services) {
            responsesLeft++;
            // Capture the service in a closure
            (function(self, service) {
                self.structure.get(service.messagesLink).then(function(response) {
                    // Cache
                    if (response.code == 200) {
                        service.messages = response.body;
                        allMessages = allMessages.concat(service.messages);
                    }
                    if (--responsesLeft == 0) {
                        // Render response
                        var inboxView = new Views.Inbox(this.uri);
                        inboxView.addMessages(allMessages);
                        promise.fulfill(Link.response(200, inboxView.toString(), 'text/html'));
                    }
                }, self);
            })(this, this.services[slug]);
        }
        return promise;
    };
    Inbox.prototype.serviceInbox = function(request, match) {
        // Get the service
        var service = this.services[match.uri[1]];
        if (!service) { return Link.response(404); }
        
        // Dispatch for messages
        var promise = new Link.Promise();
        this.structure.get(service.messagesLink).then(function(response) {
            // Cache
            if (response.code == 200) { this.messages = response.body; }
            // Render & respond
            var inboxView = new Views.Inbox('todo'); //:TODO:
            inboxView.addMessages(service.messages);
            promise.fulfill(Link.response(200, inboxView.toString(), 'text/html'));
        }, service);
        return promise;
    };

    return Inbox;
});
