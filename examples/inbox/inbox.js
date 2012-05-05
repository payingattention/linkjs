(function(Modules) {
    // Module Definition
    // =================
    var Inbox = function() {
        this.services = {};
        this.serviceCount = 0;
    };

    // Handler routes
    Inbox.prototype.routes = [
        { cb:'prehandler', uri:'.*', accept:'text/html' },
        { cb:'mainInbox', uri:'$/?^', method:'get', accept:'text/html' },
        { cb:'serviceInbox', uri:'$/services/([^/]+)/?$', method:'get', accept:'text/html' },
        { cb:'settings', uri:'$/settings/?^', method:'get', accept:'text/html' }
    ];
    
    // Pre-handler
    // ===========
    // one-time init
    Inbox.prototype.prehandler = function(request) {  
        if (this.serviceCount > 0) { return; }
        var promise = new Link.Promise();
        
        // Load stylesheet
        Link.addStylesheet('style.css');
        
        // Find all services configged to ./services/*/
        var serviceUris = Link.findModules(this.uri + '/services/([^/]+)/?$', 1);
        for (var slug in serviceUris) {
            // Store links to the service
            this.services[slug] = {
                messagesLink:{ uri:serviceUris[slug], accept:'js/array' },
                settingsLink:{ uri:serviceUris[slug] + 'settings', accept:'js/object' },
                settingsHtmlLink:{ uri:serviceUris[slug] + 'settings', accept:'text/html', pragma:'partial' },
            };
            this.serviceCount++;
        }
        
        // Request the config from every service
        promise.isLiesUntil(this.serviceCount);
        for (var slug in this.services) {
            (function(service) {
                app.get(service.settingsLink, function(response) {
                    if (response.code == 200) { service.settings = response.body; }
                    promise.fulfill();
                });
            })(this.services[slug]);
        }
        return promise;
    };

    // Resource Handlers
    // =================
    Inbox.prototype.mainInbox = function() {
        // Promise to respond after the services all sync
        var promise = new Link.Promise();
        promise.isLiesUntil(this.serviceCount);
        // Get messages from all services
        var allMessages = [];
        for (var slug in this.services) {
            // Capture the service in a closure
            (function(service) {
                app.get(service.messagesLink, function(response) {
                    // Cache
                    if (response.code == 200) {
                        service.messages = response.body;
                        allMessages = allMessages.concat(service.messages);
                    }
                    if (!promise.isStillLies()) {
                        // Render response
                        var inboxView = new Views.Inbox(this.uri());
                        inboxView.addMessages(allMessages);
                        promise.fulfill({
                            code:200,
                            body:inboxView.toString(),
                            contenttype:'text/html'
                        });
                    } else {
                        // Don't go to as much effort with the lie
                        promise.fulfill();
                    }
                }, this);
            })(this.services[slug]);
        }
        return promise;
    };
    Inbox.prototype.serviceInbox = function(request, response, urimatch) {
        // Get the service
        var service = this.services[urimatch[1]];
        if (!service) { return { code:404 }; }
        
        // Dispatch for messages
        var promise = new Link.Promise();
        app.get(service.messagesLink, function(response) {
            // Cache
            if (response.code == 200) { this.messages = response.body(); }
            // Render & respond
            var inboxView = new Views.Inbox('todo'); //:TODO:
            inboxView.addMessages(service.messages);
            promise.fulfill({
                code:200,
                body:inboxView.toString(),
                contenttype:'text/html'
            });
        }, service);
        return promise;
    };
    Inbox.prototype.settings = function(request) {
        // Set up async response
        var promise = new Link.Promise();
        promise.isLiesUntil(this.serviceCount);
        var finalResponse = { code:200, contenttype:'text/html', body:'' };
        
        // Get the settings html from each service
        for (var slug in this.services) {
            (function(service) {
                app.get(service.settingsHtmlLink, function(response) {
                    if (response.code == 200) { finalResponse.body += response.body; }
                    promise.fulfill(finalResponse);
                });
            })(this.services[slug]);
        });
        return promise;
    };

    // Export
    Modules.Inbox = Inbox;
})(Modules);