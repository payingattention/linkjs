define(['link/module', 'link/request', 'link/response', 'link/app', 'link/util', './views'], function(Module, Request, Response, linkApp, Util, Views) {
    // Module Definition
    // =================
    var Inbox = Module({
        // Handler routes (in addition to resources)
        routes:[
            { prehandler:{ uri:'.*', accept:'text/html' }},
            { htmlLayout:{ uri:'.*', method:'get', accept:'text/html', bubble:true }},
            { mainInbox:{ uri:'$/?^', method:'get', accept:'text/html' }},
            { serviceInbox:{ uri:'$/services/([^/]+)/?$', method:'get', accept:'text/html' }},
            { settings:{ uri:'$/settings/?^', method:'get', accept:'text/html' }}
        ],
        // Attributes
        hasRunInit:false,
        services:{}
    }, function() {
        // Constructor
        // Load stylesheet
        linkApp.addStylesheet('style.css');
    });
    
    // Pre-handler init
    // ================
    Inbox.prototype.prehandler = function(orgRequest, response) {
        if (this.hasRunInit) { return orgRequest.respond(); }
        
        // Add resources for all services configged to ./services/*/
        _.each(linkApp.findResources(this.uri() + '/services/([^/]+)/$'), function(serviceMatch) {
            // Extract from match...
            var serviceUri = serviceMatch[0]
            ,   slug = serviceMatch[1];
            
            // Store links to the service
            this.services[slug] = {
                messagesJson:new Request.Link(serviceUri, { accept:'application/json' }),
                settingsJson:new Request.Link(serviceUri + 'settings', { accept:'application/json' }),
                settingsHtml:new Request.Link(serviceUri + 'settings', { accept:'text/html', pragma:'partial' })
            };
        }, this);
        
        // Request the config from every service
        var respondToOrg = _.after(this.services.length, function() { 
            this.hasRunInit = true; 
            orgRequest.respond(); 
        });
        _.each(this.services, function(service, slug) {
            service.settingsJson.get(function(request, response) {
                if (response.ok()) { service.settings = response.body(); }
                respondToOrg();
            });
        })
    };

    // HTML GET postprocessor
    // ======================
    Inbox.prototype.htmlLayout = function(request, response) { // (will run last; bubble handlers are FILO)
        if (response && request.header('pragma') != 'partial') { // not a partial request...
            var content = (response.code() < 300) ?
                response.body() :
                "<div class=\"alert alert-error\">Error getting '"+request.uri()+"': "+response.code()+"</div>";
            // Wrap in layout
            layoutView = new Views.Layout(this.uri(), content);
            for (var i=0; i < this.services.length; i++) {
                layoutView.addNavService(this.services[i]);
            }
            response.body(layoutView.toString()); response.header({ 'content-type':'text/html' });
            return request.respond(response);

        }
        request.respond(response);
    };

    // Resource Handlers
    // =================
    Inbox.prototype.mainInbox = function(request) {
        // Respond with the out-of-date messages now
        request.respond(200, this.renderMainInbox(), 'text/html');

        // Have all services sync
        var orgLocation = window.location;
        for (var i=0; i < this.services.length; i++) {
            // Dispatch for messages
            this.services[i].messagesJson.get(function(request, response) {
                // Cache
                if (response.ok()) { this.service.messages = response.body(); }
                // Render
                if (orgLocation == window.location) {
                    document.getElementById('inbox-content').innerHTML = this.inbox.renderMainInbox();
                }
            }, { service:this.services[i], inbox:this });
        }
    };
    Inbox.prototype.serviceInbox = function(request, response) {
        // Render an out-of-date response now
        request.respond(200, this.renderMainInbox(), 'text/html');
        
        // Dispatch for messages
        var service = null; // :TODO: get service
        var orgLocation = window.location;
        resource.messagesJson.get(function(request, response) {
            // Cache
            if (response.ok()) { this.messages = response.body(); }
            // Render
            if (orgLocation == window.location) {
                var inboxView = new Views.Inbox('todo');
                inboxView.addMessages(this.messages);
                document.getElementById('inbox-content').innerHTML = inboxView.toString();
            }
        }, service);
    };
    Inbox.prototype.settings = function(orgRequest) {
        // Request the config from every service
        var innerContent = '';
        Util.batchAsync(
            function(cb) {
                // request dispatch
                for (var i=0; i < this.services.length; i++) {
                    this.services[i].settingsHtml.get(function(request, response) {
                        // individual response
                        if (response.ok()) { innerContent += response.body(); }
                        cb(); // inform batchAsync
                    }, this.services[i]);
                }
                return this.services.length; // expected cb count
            }, 
            function() { // after all responses
                // :TODO: generate html
                orgRequest.respond(200, innerContent, 'text/html');
            }, 
            this // context
        );
    };

    // Helpers
    // =======
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
    Inbox.prototype.renderMainInbox = function() {
        var inboxView = new Views.Inbox(this.uri());
        inboxView.addMessages(this.getAllMessages());
        return inboxView.toString();
    };
    
    return Inbox;
});