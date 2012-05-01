define(['link/module', 'link/request', 'link/response', 'link/app', './views'], function(Module, Request, Response, linkApp, Views) {
    // Module Definition
    // =================
    var Inbox = Module({
        // Handler routes (in addition to resources)
        routes:[
            { prehandler:{ uri:'.*', accept:'text/html' }},
            { htmlLayout:{ uri:'.*', method:'get', accept:'text/html', bubble:true }}
        ],
        // Styles (added on init)
        stylesheets:['style.css']
    }, function() {
        // Constructor
        this.hasRunInit = false;
        this.services = [];

        // Add default resources
        this.addResource('/', this.mainInboxResource);
        this.addResource('/settings', this.settingsResource);
    });
    
    // Pre-handler init
    // ================
    Inbox.prototype.prehandler = function(orgRequest, response) {
        if (this.hasRunInit) { return orgRequest.respond(); }        
        
        // Add resources for all services configged to ./services/*/
        var serviceUris = linkApp.findResources(this.uri() + '/services/([^/]+)');
        for (var i=0; i < serviceUris.length; i++) {
            // Extract from match...
            var serviceUri = serviceUris[i][0]
            ,   slug = serviceUris[i][1];
            
            // Add resource
            var res = this.addResource('/services/' + slug], this.serviceInboxResource);
            this.services.push(res);
            
            // Add some links to the resource
            res.messagesJson = Request.Link(serviceUri, { accept:'application/json' });
            res.settingsJson = Request.Link(serviceUri + '/settings', { accept:'application/json' });
            res.settingsHtml = Request.Link(serviceUri + '/settings', { accept:'text/html' });
        }
        
        // Request the config from every service
        Util.batchAsync(
            function(cb) {
                for (var i=0; i < this.services.length; i++) {
                    // dispatch requests
                    this.services[i].settingsJson.get(function(request, response) {
                        if (response.ok()) { this.settings = response.body(); }
                        cb(); // inform batchAsync
                    }, this.services[i]);
                }
                return this.services.length; // expected cb count
            }, 
            function() { // after all responses
                this.hasRunInit = true;
                orgRequest.respond();
            }, 
            this // context
        );
    };

    // HTML GET postprocessor
    // ======================
    Inbox.prototype.htmlLayout = function(request, response) { // (will run last; bubble handlers are FILO)
        if (request.header('pragma') != 'partial') { // not a partial request...
            var content = (response.code() < 300) ?
                request.body() :
                "<div class=\"alert alert-error\">Error getting '"+request.uri()+"': "+response.code()+"</div>";
            // Wrap in layout
            layoutView = new View.Layout(this.uri(), content);
            response.body(layoutView.toString()); response.header({ 'content-type':'text/html' });
            return request.respond(response);

        }
        request.respond(response);
    };

    // Resource Handlers
    // =================
    Inbox.prototype.mainInboxResource = function(resource, request) {
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
                    document.getElementById('inbox-content').innerHTML = this.renderMainInbox();
                }
            }, { service:this.services[i], inbox:inbox });
        }
    };
    Inbox.prototype.serviceInboxResource = function(resource, request, response) {
        // Render an out-of-date response now
        request.respond(200, this.renderMainInbox(), 'text/html');
        
        // Dispatch for messages
        var orgLocation = window.location;
        resource.messagesJson.get(function(request, response) {
            // Cache
            if (response.ok()) { this.messages = response.body(); }
            // Render
            if (orgLocation == window.location) {
                var inboxView = new Views.Inbox(this.uri());
                inboxView.addMessages(this.messages);
                document.getElementById('inbox-content').innerHTML = inboxView.toString();
            }
        }, resource);
    };
    Inbox.prototype.settingsHandler = function(orgRequest) {
        // Request the config from every service
        Util.batchAsync(
            function(cb) {
                var innerContent = '';
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