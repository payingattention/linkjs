define(['link/module', 'link/request', 'link/app', './templates'], function(Module, Request, linkApp, templates) {
    // Module Definition
    // =================
    var Inbox = Module(function() {
        // Attributes
        this.hasRunInit = false;
        this.services = [];
        
        // Common Requests
        this.newMessagesRequest     = Request.Factory('get', '',          { accept:'application/json' });
        this.newSettingsJsonRequest = Request.Factory('get', '/settings', { accept:'application/json' });
        this.newSettingsHtmlRequest = Request.Factory('get', '/settings', { accept:'text/html', pragma:'partial' });

        // Load styles
        linkApp.addStylesheet('style.css');
    });
    
    // Routes
    // ======
    Inbox.get({ uri:'^/?$', accept:'text/html' },                  'mainInboxHandler');
    Inbox.get({ uri:'^/services/([^/]+)/?$', accept:'text/html' }, 'serviceInboxHandler');
    Inbox.get({ uri:'^/settings/?$', accept:'text/html' },         'settingsHandler');
    
    // Init Preprocessor
    // =================
    Inbox.route({ uri:'.*', accept:'text/html' }, function(orgRequest, response) {
        if (this.hasRunInit) { return orgRequest.respond(); }        
        
        // Get services configged to ./services/*/
        this.services = linkApp.findModules(
            this.uri() + '/services/([^/]+)',
            function(match) { return match[1]; } // use the slug for the key
        );
        
        // Request the config from every service
        var requests = [];
        for (var slug in this.services) {
            var req = this.newSettingsJsonRequest(this.services[slug].uri);
            req.service = this.services[slug];
            requests.push(req)
        }
        Request.batchDispatch(
            requests, // request list
            function(request, response) { // individual response
                if (response.ok()) { request.service.settings = response.body(); }
            }, 
            function() { // after all responses
                this.hasRunInit = true;
                orgRequest.respond();
            }, 
            this // context
        );
    });

    // HTML GET postprocessor
    // ======================
    Inbox.get({ uri:'.*', accept:'text/html', bubble:true }, function(request, response) { // (will run last; bubble handlers are FILO)
        if (request.header('pragma') != 'partial') { // not a partial request...
            // No errors, wrap in our layout
            if (response.code() < 300) {
                response.body(this.templates.layout(this, response.body()), 'text/html'); // wrap in our layout
                return request.respond(response);
            }
            // An error, replace with our error display
            return request.respond(200, this.templates.layout(this, this.templates.error("Error getting '"+request.uri()+"': "+response.code())));
        }
        request.respond(response);
    });

    // Handlers
    // ========
    Inbox.prototype.mainInboxHandler = function(request) {
        // Respond with the out-of-date messages now
        request.respond(200, this.templates.inbox(this.getAllMessages()), 'text/html');

        // Have all services sync and re-render each time
        for (var slug in this.services) {
            var req = this.newMessagesRequest(this.services[slug].uri);
            req.service = this.services[slug];
            req.dispatch(function(request, response) {
                if (response.ok()) {
                    request.service.messages = response.body();
                    document.getElementById('inbox-content').innerHTML = this.templates.inbox(this.getAllMessages());
                }
            }, this);
        }
    };
    Inbox.prototype.serviceInboxHandler = function(request, response, urimatch) {
        // Find the service
        var service_slug = urimatch[1];
        var service = this.services[service_slug];
        if (!service) { return request.respond(404); }
        
        // Render an out-of-date response now
        request.respond(200, this.templates.inbox(service.messages), 'text/html');

        // Now resync the service
        this.newMessagesRequest(service.uri).dispatch(function(request, response) {
            if (response.ok()) {
                service.messages = response.body();
                document.getElementById('inbox-content').innerHTML = this.templates.inbox(service.messages);
            }
        }, this);
    };
    Inbox.prototype.settingsHandler = function(orgRequest) {
        // Request the settings form html for each service
        var innerContent = '', requests = [];
        for (var slug in this.services) {
            requests.push(this.newSettingsHtmlRequest(this.services[slug].uri));
        }
        Request.batchDispatch(
            requests, // request list
            function(request, response) { if (response.ok()) { innerContent += response.body(); } }, // individual response
            function() { orgRequest.respond(200, this.templates.settings(innerContent), 'text/html'); }, // after all responses
            this // context
        );
    };

    // Helpers
    // =======
    Inbox.prototype.templates = templates;
    Inbox.prototype.getAllMessages = function() {
        var messages = [];
        for (var s in this.services) {
            if (!this.services[s].messages) { continue; }
            for (var m=0; m < this.services[s].messages.length; m++) {
                messages.push(this.services[s].messages[m]);
            }
        }
        return messages;
    };
    
    return Inbox;
});