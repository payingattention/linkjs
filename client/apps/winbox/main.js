// WinBox
// ======
// A messaging inbox. \o/
link.App.configure('#/winbox', {
    'services': null,

    // Cached requests
    // (all of the external interactions this resource makes)
    'req': {
        'get_config': new link.Request('{{service_uri}}/config').for_json(),
        'get_inbox': new link.Request('{{service_uri}}?q=all&v=["service","date","summary"]').for_json()
    },
    
    // Handlers
    '->': {
        // Views
        '^/?$': function(request, uri_params, respond) {
            var self = this;
            self.ensure_ready(function() {
                // Main inbox
                if (request.matches({'method':'get', 'accept':'text/html'})) {
                    this.active_service = null;
                    // Sync service messages if needed
                    for (var uri in self.services) {
                        if (self.services[uri].messages) { continue; } // only sync if needed
                        self.sync_service_inbox(uri, function() {
                            // Redraw all messages
                            var messages_table = document.getElementById('winbox-messages');
                            if (messages_table) { messages_table.innerHTML = self.html_messages(self.get_all_service_messages()); }
                        });
                    }
                    // Render response
                    var messages_html = self.html_messages(self.get_all_service_messages());
                    if (!messages_html) { messages_html = '<tr><td colspan="3">Loading...</td></tr>'; }
                    respond(200, self.html_layout(self.html_box(messages_html)), 'text/html');
                } else { respond(400); }
            });
        },
        '^/service/(.+)/?$': function(request, uri_params, respond) {
            var self = this;
            this.ensure_ready(function() {
                // Service inbox
                if (request.matches({'method':'get', 'accept':'text/html'})) {
                    // Find the service by name
                    var param_servicename = uri_params[1];
                    var service_uri = '#/winbox/services/' + param_servicename.toLowerCase();
                    var service = self.services[service_uri];
                    if (!service) { console.log('Failbox: service ' + param_servicename + ' not found.'); return respond(404); }
                    this.active_service = service_uri;
                    // Sync if needed
                    var messages_html = '<tr><td colspan="3">Loading...</td></tr>';
                    if (!service.messages) { // sync on first load
                        self.sync_service_inbox(service_uri, function() {
                            var messages_table = document.getElementById('winbox-messages');
                            if (messages_table) { messages_table.innerHTML = self.html_messages(service.messages); }
                        });
                    }
                    if (service.messages) { // check again, in case the above wasnt async (really need to make that consistent!)
                        messages_html = self.html_messages(service.messages);
                    }
                    respond(200, self.html_layout(self.html_box(messages_html)), 'text/html');
                } else { respond(400); }
            });
        },
        '^/service/(.+)/view/(.+)/?$': function(request, uri_params, respond) {
            // Message view
            if (request.matches({'method':'get', 'accept':'text/html'})) {
                respond(501); // :TODO:
            } else { respond(400); }
        },
        '^/service/(.+)/compose/?$': function(request, uri_params, respond) {
            // Message compose
            if (request.matches({'method':'get', 'accept':'text/html'})) {
                respond(501); // :TODO:
            } else { respond(400); }
        },
        '^/settings/?$': function(request, uri_params, respond) {
            // Winbox settings
            if (request.matches({'method':'get', 'accept':'text/html'})) {
                respond(501); // :TODO:
            } else { respond(400); }
        },

        // Actions
        '^/sync/?$': function(request, uri_params, respond) {
            // Sync all services
            if (request.matches({'method':'post'})) {
                respond(501); // :TODO:
            } else { respond(400); }
        },
        '^/service/(.+)/sync/?$': function(request, uri_params, respond) {
            // Sync a specific service
            if (request.matches({'method':'post'})) {
                respond(501); // :TODO:
            } else { respond(400); }
        },
    },

    // Common tasks
    ensure_ready: function(callback) {
        if (this.services) { return callback.call(this); }
        var self = this;
        var agent = new link.Agent();
        this.services = {};
        // Fetch all services under #/winbox/services
        var service_uris = link.App.get_child_uris('#/winbox/services');
        var deferreds = [];
        for (var i=0, ii=service_uris.length; i < ii; i++) {
            var uri = service_uris[i]
            self.services[uri] = {};
            // Fetch config
            var deferred = agent.follow(this.req.get_config.uri_param('service_uri', uri), function(res) {
                if (res.get_status_code() != 200) { console.log('Failbox: failed to get config from '+uri); }
                // Store in the service
                self.services[uri].config = res.get_body();
            });
            deferreds.push(deferred);
        }
        // Set up the callback to run after all fetches complete
        this.init_deferred_list_ = new goog.async.DeferredList(deferreds);
        this.init_deferred_list_.addCallback(callback, this);
    },
    sync_service_inbox: function(service_uri, callback) {
        var self = this;
        // Fetch messages
        (new link.Agent()).follow(this.req.get_inbox.uri_param('service_uri', service_uri), function(res) {
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
        return Handlebars.templates['winbox-layout.html']({ content:content, nav:this.html_nav() });
    },
    html_box: function(messages) {
        return Handlebars.templates['box.html']({ messages:messages })
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
    html_nav: function() {
        var html = '';
        html += '<li class="nav-header" style="color: #666">winbox</li>';
        html += '<li ' + (!this.active_service ? 'class="active"' : '') + '><a href="#/winbox"><i class="' + (!this.active_service ? 'icon-white ' : '') + 'icon-inbox"></i> Messages</a></li>';
        html += '<li><a href="#/winbox/settings"><i class="icon-cog"></i> Settings</a></li>';
        html += '<li class="nav-header">Services</li>';
        for (var uri in this.services) {
            var service = this.services[uri];
            if (!service || !service.config) { continue; }
            var li_active = (this.active_service == uri ? ' class="active" ' : '');
            var i_active = (this.active_service == uri ? ' icon-white ' : '');
            html += '<li' + li_active + '><a href="#/winbox/service/' + service.config.name + '"><i class="icon-folder-open' + i_active + '"></i> ' + service.config.name + '</a></li>';
        }
        return html;
    }
});