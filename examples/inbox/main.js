define(['link/module', 'link/app', './views'], function(Module, app, Views) {
    // Module Definition
    // =================
    var Inbox = Module({
        // Handler routes
        routes:[
            { cb:'prehandler', uri:'.*', accept:'text/html' },
            { cb:'htmlLayout', uri:'.*', method:'get', accept:'text/html', bubble:true },
            { cb:'mainInbox', uri:'$/?^', method:'get', accept:'text/html' },
            { cb:'serviceInbox', uri:'$/services/([^/]+)/?$', method:'get', accept:'text/html' },
            { cb:'settings', uri:'$/settings/?^', method:'get', accept:'text/html' }
        ],
        // Attributes
        services:{},
        serviceCount:0,
        cachedInboxHtml:''
    });
    
    // Pre-handler
    // ===========
    Inbox.prototype.prehandler = function(request) {        
        // Do one-time init
        if (this.serviceCount > 0) { return; }
        var promise = _.makePromise();
        
        // Load stylesheet
        app.addStylesheet('style.css');
        
        // Find all services configged to ./services/*/
        _.each(app.findModules(this.uri + '/services/([^/]+)/?$'), function(serviceUri, slug) {
            // Store links to the service
            this.services[slug] = {
                messagesLink:{ uri:serviceUri, accept:'js/array' },
                settingsLink:{ uri:serviceUri + 'settings', accept:'js/object' },
                settingsHtmlLink:{ uri:serviceUri + 'settings', accept:'text/html', pragma:'partial' },
                cachedInboxHtml:''
            };
            this.serviceCount++;
        }, this);
        
        // Request the config from every service
        var respond = _.after(this.serviceCount, function() { promise.fulfill(); });
        _.each(this.services, function(service, slug) {
            app.get(service.settingsLink, function(response) {
                if (response.code == 200) { service.settings = response.body; }
                respond();
            });
        });
        return promise;
    };
    
    // HTML layout postprocessor
    // =========================
    Inbox.prototype.htmlLayout = function(request, response) { // (will run last; bubble handlers are FILO)
        if (response && !_.include(request.pragma, 'partial')) { // not a partial request...
            // Get content
            var content = (response.code < 300) ?
                response.body :
                "<div class=\"alert alert-error\">Error getting '"+request.uri+"': "+response.code+"</div>";
            
            // Wrap in layout
            var layoutView = new Views.Layout(this.uri, content);
            _.each(this.services, function(service) {
                layoutView.addNavService(service);
            });
            response.body = layoutView.toString();
            response.contenttype = 'text/html';
        }
        return response;
    };

    // Resource Handlers
    // =================
    Inbox.prototype.mainInbox = function() {
        // Sync all services, then render to the DOM as each responds
        var orgLocation = window.location, allMessages = [];
        _.each(this.services, function(service) {
            app.get(service.messagesLink, function(response) {
                // Cache
                if (response.code == 200) {
                    service.messages = response.body;
                    allMessages = allMessages.concat(service.messages);
                }
                // Render
                if (orgLocation == window.location) {
                    var inboxView = new Views.Inbox(this.uri());
                    inboxView.addMessages(allMessages);
                    document.getElementById('inbox-content').innerHTML = this.cachedInboxHtml = inboxView.toString();
                }
            }, this);
        }, this);

        // Respond with cached inbox now
        return { code:200, contenttype:'text/html', body:this.cachedInboxHtml };
    };
    Inbox.prototype.serviceInbox = function(request, response, urimatch) {
        // Get the service
        var service = this.services[urimatch[1]];
        if (!service) { return { code:404 }; }
        
        // Dispatch for messages
        var orgLocation = window.location;
        app.get(service.messagesLink, function(response) {
            // Cache
            if (response.code == 200) { this.messages = response.body(); }
            // Render
            if (orgLocation == window.location) {
                var inboxView = new Views.Inbox('todo'); //:TODO:
                inboxView.addMessages(service.messages);
                document.getElementById('inbox-content').innerHTML = service.cachedInbox = inboxView.toString();
            }
        }, service);

        // Respond now with cached html
        return { code:200, contenttype:'text/html', body:service.cachedInbox };
    };
    Inbox.prototype.settings = function(request) {
        // Set up async response
        var promise = _.makePromise();
        var finalResponse = { code:200, contenttype:'text/html', body:'' };
        var respond = _.after(this.serviceCount, function() { promise.fulfill(finalResponse); });
        
        // Get the settings html from each service
        _.each(this.services, function(service, slug) {
            app.get(service.settingsHtmlLink, function(response) {
                if (response.code == 200) { finalResponse.body += response.body; }
                respond();
            });
        });
        return promise;
    };

    return Inbox;
});