// WinBox
// ======
// A messaging inbox. \o/
link.App.configure('#/winbox', {
    'services': null,
    'serv_name_map': null,
    
    // Handlers
    "->": {
        // Views
        '^/?$': function(request, uri_params, respond) {
            if (!this.services) { this.sync_services(); } // Sync on first load
            // Main inbox
            if (request.matches({'method':'get', 'accept':'text/html'})) {
                // Sync service messages if needed
                for (var uri in this.services) {
                    var self = this;
                    if (this.services[uri].messages) { continue; } // only sync if needed
                    this.sync_service_inbox(uri, function() {
                        // Redraw all messages
                        var messages_table = document.getElementById('winbox-messages');
                        if (messages_table) { messages_table.innerHTML = self.html_messages(self.get_all_service_messages()); }
                    });
                }
                // Render response
                var messages_html = this.html_messages(this.get_all_service_messages());
                if (!messages_html) { messages_html = '<tr><td colspan="3">Loading...</td></tr>'; }
                respond(200, this.html_layout(this.html_box(messages_html)), 'text/html');
            } else { respond(400); }
        },
        '^/service/(.+)/?$': function(request, uri_params, respond) {
            if (!this.services) { this.sync_services(); } // Sync on first load
            // Service inbox
            if (request.matches({'method':'get', 'accept':'text/html'})) {
                // Find the service by name
                var param_servicename = uri_params[1];
                var service_uri = '#/winbox/service/' + param_servicename.toLowerCase();
                var service = this.services[service_uri];
                if (!service) { console.log('Failbox: service ' + param_servicename + ' not found.'); return respond(404); }
                // Sync if needed
                var messages_html = '<tr><td colspan="3">Loading...</td></tr>';
                if (!service.messages) { // sync on first load
                    var self = this;
                    this.sync_service_inbox(service_uri, function() {
                        var messages_table = document.getElementById('winbox-messages');
                        if (messages_table) { messages_table.innerHTML = self.html_messages(service.messages); }
                    });
                } else {
                    messages_html = this.html_messages(service.messages);
                }
                respond(200, this.html_layout(this.html_box(messages_html)), 'text/html');
            } else { respond(400); }
        },
        '^/service/(.+)/view/(.+)/?$': function(request, uri_params, respond) {
            if (!this.services) { this.sync_services(); } // Sync on first load
            // Message view
            if (request.matches({'method':'get', 'accept':'text/html'})) {
                respond(501); // :TODO:
            } else { respond(400); }
        },
        '^/service/(.+)/compose/?$': function(request, uri_params, respond) {
            if (!this.services) { this.sync_services(); } // Sync on first load
            // Message compose
            if (request.matches({'method':'get', 'accept':'text/html'})) {
                respond(501); // :TODO:
            } else { respond(400); }
        },
        '^/settings/?$': function(request, uri_params, respond) {
            if (!this.services) { this.sync_services(); } // Sync on first load
            // Winbox settings
            if (request.matches({'method':'get', 'accept':'text/html'})) {
                respond(501); // :TODO:
            } else { respond(400); }
        },

        // Actions
        '^/sync/?$': function(request, uri_params, respond) {
            if (!this.services) { this.sync_services(); } // Sync on first load
            // Sync all services
            if (request.matches({'method':'post'})) {
                respond(501); // :TODO:
            } else { respond(400); }
        },
        '^/service/(.+)/sync/?$': function(request, uri_params, respond) {
            if (!this.services) { this.sync_services(); } // Sync on first load
            // Sync a specific service
            if (request.matches({'method':'post'})) {
                respond(501); // :TODO:
            } else { respond(400); }
        },
    },

    // Syncing
    sync_services: function(force_reload) {
        if (this.services && !force_reload) { return; }
        var self = this;
        var agent = new link.Agent();
        this.services = {};
        this.serv_name_map = {};
        // Fetch all services under #/winbox/services
        var service_uris = link.App.get_child_uris('#/winbox/services');
        for (var i=0, ii=service_uris.length; i < ii; i++) {
            var uri = service_uris[i]
            self.services[uri] = {};
            // Fetch config
            agent.get(uri + '/config', {'accept':'application/json'}, function(res) {
                if (res.get_status_code() != 200) { console.log('Failbox: failed to get config from '+uri); }
                // Store in the service
                self.services[uri].config = res.get_body();
                // Save the name->uri map
                self.serv_name_map[self.services[uri].config.name] = uri;
                // Redraw the sidebar
                var services_list = document.getElementById('winbox-services-list');
                if (services_list) { services_list.innerHTML = self.html_services_list(); }
            });
        }
    },
    sync_service_inbox: function(service_uri, callback) {
        var self = this;
        // Fetch messages
        (new link.Agent()).get(service_uri + '?q=all&v=["service","date","summary"]', {'accept':'application/json'}, function(res) {
            var messages = res.get_body();
            // Given as a map of id:msg, just save as an array
            var new_messages = [];
            for (var mid in messages) {
                var msg = messages[mid];
                msg.id = mid;
                new_messages.push(msg);
            }
            // Store in the service
            self.services[service_uri].messages = new_messages;
            callback(service_uri);
        });
    },

    // Inbox helpers
    get_all_service_messages: function() {
        var messages = [];
        // Add all messages into one large array
        for (var uri in this.services) {
            if (!this.services[uri].messages) { continue; }
            messages = messages.concat(this.services[uri].messages);
        }
        // Sort by date
        messages.sort(function(a,b) { a.date > b.date });
        return messages;
    },

    // HTML rendering
    html_layout: function(content) {
        return Handlebars.templates['winbox-layout.html']({content: content});
    },
    html_box: function(messages) {
        return Handlebars.templates['box.html']({messages: messages})
    },
    html_messages: function(messages) {
        var html = '';
        for (var i=0, ii=messages.length; i < ii; i++) {
            var message = messages[i];
            var msgmoment = moment(message.date);
            html += '<tr><td><input type="checkbox" /></td><td><span class="label">' + message.service + '</span></td><td><a href="#/winbox/service/' + message.service + '/view/' + message.id + '">' + message.summary + '</a></td><td title="' + msgmoment.calendar() + '">' + msgmoment.fromNow() + '</td></tr>';
        }
        return html;
    },
    html_services_list: function() {
        var html = '';
        for (var uri in this.services) {
            var service = this.services[uri];
            html += '<li><a href="#/winbox/service/' + service.config.name + '"><i class="icon-folder-open"></i> ' + service.config.name + '</a></li>';
        }
        return html;
    }
});