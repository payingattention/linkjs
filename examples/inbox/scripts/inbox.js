define(['link/module', 'link/request', 'link/app', './templates'], function(Module, Request, LinkApp, templates) {
    // Module Definition
    // =================
    var Inbox = new Module({
        // Attributes
        hasRunInit: false,
        services: {},
        
        // Common Requests
        newMessagesRequest:     Request.Factory('get', '',          { accept:'application/json' }),
        newSettingsJsonRequest: Request.Factory('get', '/settings', { accept:'application/json' }),
        newSettingsHtmlRequest: Request.Factory('get', '/settings', { accept:'text/html', pragma:'partial' })

        // Helpers
        templates:templates,
        getAllMessages:function() {
            for (var s in this.services) {
                var messages = (messages || []).concat(this.services[s].messages);
            }
            return messages;
        }
    });
    
    // Routes
    // ======
    Inbox.get({ uri:'^/?$', accept:'text/html' },                 mainInboxHandler);
    Inbox.get({ uri:'^/service/([^/]+)/?$', accept:'text/html' }, serviceInboxHandler);
    Inbox.get({ uri:'^/settings/?$', accept:'text/html' },        settingsHandler);
    
    // Init Preprocessor
    // =================
    Inbox.route({ uri:'.*' }, function(orgRequest, response) {
        if (this.hasRunInit) { return orgRequest.nextHandler(); }        
        
        // Get services configged to ./service/*/
        this.services = appConfig.findModules(
            this.uri() + '/service/([^/]+)',
            function(match) { return match[1]; } // use the slug for the key
        );
        
        // Request the config from every service
        var requests = [];
        for (var slug in this.services) { 
            requests.push(this.newSettingsJsonRequest(this.services[slug]))
        }
        Request.batchDispatch(
            requests, // request list
            function(request, response) { if (response.ok()) { request.from().settings = response.body(); } }, // individual response
            function() { this.hasRunInit = true; orgRequest.nextHandler(); }, // after all responses
            this // context
        );
    });

    // HTML GET postprocessor
    // ======================
    Inbox.get({ uri:'.*', accept:'text/html', bubble:true }, function(request, response) { // (will run last; bubble handlers are FILO)
        if (!request.matches({ pragma:'partial' })) { // not a partial request...
            // No errors, wrap in our layout
            if (response.code() < 300 && !request.matches({ pragma: 'partial' })) {
                response.body(this.templates.layout(response.body()), 'text/html'); // wrap in our layout
                return request.nextHandler(response);
            }
            // An error, replace with our error display
            return request.respond(200, this.templates.layout(this.templates.error("Error getting '"+request.uri()+"': "+response.code())));
        }
        request.nextHandler();
    });
    
    // Handlers
    // ========
    var mainInboxHandler = function(request) {
        // Respond with the out-of-date messages now
        request.respond(200, this.templates.inbox(this.getAllMessages()), 'text/html');

        // Have all services sync and re-render each time
        for (var slug in this.services) {
            this.newMessagesRequest(this.services[slug]).dispatch(function(request, response) {
                if (response.ok()) {
                    request.target().messages = response.body();
                    document.getElementById('inbox-content').innerHTML = this.templates.inbox(this.getAllMessages());
                }
            }, this);
        }
    };
    var serviceInboxHandler = function(request, response, urimatch) {
        // Find the service
        var service_slug = urimatch[1];
        var service = this.services[service_slug];
        if (!service) { return request.respond(404); }
        
        // Render an out-of-date response now
        request.respond(200, this.templates.inbox(service.messages), 'text/html');

        // Now resync the service
        this.newMessagesRequest(service).dispatch(function(request, response) {
            if (response.ok()) {
                service.messages = response.body();
                document.getElementById('inbox-content').innerHTML = this.templates.inbox(service.messages);
            }
        }, this);
    };
    var settingsHandler = function(orgRequest) {
        // Request the settings form html for each service
        var innerContent = '', requests = [];
        for (var slug in this.services) {
            requests.push(this.newSettingsHtmlRequest(this.services[slug]));
        }
        Request.batchDispatch(
            requests, // request list
            function(request, response) { if (response.ok()) { innerContent += response.body(); } }, // individual response
            function() { orgRequest.respond(200, this.templates.settings(innerContent), 'text/html'); }, // after all responses
            this // context
        );
    };
    
    return Inbox;
});