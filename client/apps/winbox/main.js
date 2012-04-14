// Winbox
// ======
// A messaging inbox. \o/
link.App.add_resource_type('Winbox', {
    'services': null,

    // Cached requests
    // ===============
    // (all of the external interactions this resource makes)
    'req': {
        'get_config': new link.Request('{{service_uri}}/config').for_json(),
        'get_inbox': new link.Request('{{service_uri}}?v=["service","date","summary","view_link"]').for_json(),
        'get_message_view': new link.Request('{{view_uri}}').for_html()
    },

    // Pre processor
    // =============
    'pre': function(request, deferred) {
        // If an HTML get and we're not ready yet, cancel the request, run prep, then resend the request (effectively pausing it)
        if (request.matches({'method':'get', 'accept':'text/html'})) {
            if (!this.services) {
                this.when_ready(function() { // run our init
                    link.App.handle_request(request, deferred); // resend the request
                });
                return null; // cancel request
            }
        }
        return request; // run as usual
    },
    
    // Post processor
    // ==============
    'post': function(request, response) {
        // Wrap HTML in our layout
        var headers = response.get_headers();
        if (headers.get('content-type') == 'text/html' && (!headers.get('pragma') || headers.get('pragma').indexOf('no-alter') == -1)) {
            response.body(this.html_layout(response.get_body()), 'text/html');
        }
        return response;
    },
    
    // Handlers
    // ========
    '->': {
        // Main inbox
        '^/?$': function(request, uri_params, respond) {
            var self = this;
            if (request.matches({'method':'get', 'accept':'text/html'})) {
                self.active_service = null;
                // Sync
                for (var uri in self.services) {
                    self.sync_service_inbox(uri, function() {
                        // Redraw all messages
                        var messages_table = document.getElementById('winbox-messages');
                        if (messages_table) { messages_table.innerHTML = self.html_messages(self.get_all_service_messages()); }
                    });
                }
                // Render response now, let syncs update as it goes
                var messages_html = self.html_messages(self.get_all_service_messages());
                if (!messages_html) { messages_html = '<tr><td colspan="3">Loading...</td></tr>'; }
                respond(200, self.html_box(messages_html), 'text/html');
            } else { respond(400); }
        },
        // Sync an inbox (or all inboxes)
        '^/sync/?([^/]*)?/?$': function(request, uri_params, respond) {
            var self = this;
            if (request.matches({'method':'post'})) {
                var param_servicename = uri_params[1];
                var services = [];
                if (param_servicename) { // a specific service
                    services = [self.services[param_servicename]];
                } else { // all services
                    services = self.services;
                }
                for (var uri in self.services) {
                    self.sync_service_inbox(uri, function() {
                        // Redraw all messages
                        var messages_table = document.getElementById('winbox-messages');
                        if (messages_table) { messages_table.innerHTML = self.html_messages(self.get_all_service_messages()); }
                    });
                }
                respond(205); // No content-- don't try to render anything, and don't change the URI
            } else { respond(400); }
        },
        // Service inbox
        '^/messages/([^/]+)/?$': function(request, uri_params, respond) {
            var self = this;
            if (request.matches({'method':'get', 'accept':'text/html'})) {
                // Find the service by name
                var param_servicename = uri_params[1];
                var service = self.services[param_servicename];
                if (!service) { console.log('Failbox: service ' + param_servicename + ' not found.'); return respond(404); }
                this.active_service = param_servicename;
                // Sync
                self.sync_service_inbox(param_servicename, function() {
                    var messages_html = self.html_messages(service.messages);
                    respond(200, self.html_box(messages_html), 'text/html');
                });
            } else { respond(400); }
        },
        // Winbox settings
        '^/settings/?$': function(request, uri_params, respond) {
            if (request.matches({'method':'get', 'accept':'text/html'})) {
                this.active_service = '__settings';
                // Request config UIs from all services
                var html = '<h2>Winbox Config</h2><hr />';
                for (var slug in this.services) {
                    var service = this.services[slug];
                    // send request
                    link.App.handle_request((new link.Request(service.config.config_link)).for_html(), function(response) {
                        var service_div = document.getElementById('cfg-' + slug);
                        if (service_div) { service_div.innerHTML = response.get_body(); }
                    });
                    // build slot to receive html
                    html += ['<div id="cfg-', slug, '"></div><hr />'].join('');
                }
                // Render layout
                respond(200, html, 'text/html');
            } else { respond(400); }
        }
    },

    // Common tasks
    when_ready: function(callback) {
        if (this.services) { return callback.call(this); }
        var self = this;
        this.services = {};
        // Fetch all services under ./services
        var service_uris = link.App.get_child_uris(this.config.uri + '/services');
        var deferreds = [];
        for (var i=0, ii=service_uris.length; i < ii; i++) {
            (function() { // capture new scope
                var uri = service_uris[i];
                var slug = uri.replace(self.config.uri + '/services/', '');
                self.services[slug] = {};
                // Fetch config
                var deferred = link.App.handle_request(self.req.get_config.uri_param('service_uri', uri), function(res) {
                    if (res.get_status_code() != 200) { console.log('Failbox: failed to get config from '+uri); }
                    // Store in the service
                    self.services[slug].config = res.get_body();
                });
                deferreds.push(deferred);
            })();
        }
        // Set up the callback to run after all fetches complete
        (new goog.async.DeferredList(deferreds)).addCallback(callback, this);
    },
    sync_service_inbox: function(service_slug, callback) {
        var self = this;
        // Fetch messages
        link.App.handle_request(this.req.get_inbox.uri_param('service_uri', this.config.uri + '/services/' + service_slug), function(res) {
            var messages = res.get_body();
            // Given as a map of id:msg
            for (var mid in messages) { // some prep
                var msg = messages[mid];
                msg.id = mid;
                msg.service_slug = service_slug;
            }
            // Store in the service
            self.services[service_slug].messages = messages;
            callback(service_slug);
        });
    },
    get_all_service_messages: function() {
        var messages = [];
        // Add all messages into one large array
        for (var uri in this.services) {
            if (!this.services[uri].messages) { continue; }
            for (var k in this.services[uri].messages) {
                messages.push(this.services[uri].messages[k]);
            }
        }
        return messages;
    },

    // HTML rendering
    html_layout: function(content) {
        return Handlebars.templates['winbox-layout.html']({ content:content, nav:this.html_nav() });
    },
    html_box: function(messages) {
        var compose_dropdown = '';
        for (var slug in this.services) {
            var service = this.services[slug];
            if (!service || !service.config) { continue; }
            compose_dropdown += '<li><a href="' + service.config.compose_link + '">' + service.config.name + '</a></li>';
        }
        var cur_sync = this.active_service ? ('/' + this.active_service) : '';
        return Handlebars.templates['box.html']({ messages:messages, compose_dropdown:compose_dropdown, cur_sync:cur_sync })
    },
    html_messages: function(messages) {
        var html = '';
        // Convert to an array
        if (!Array.isArray(messages)) {
            var arr = [];
            for (var k in messages) {
                arr.push(messages[k]);
            }
            messages = arr;
        }
        // Sort by date        
        messages.sort(function(a,b) { return a.date < b.date });
        
        for (var k in messages) {
            var message = messages[k];
            var msgmoment = moment(message.date);
            html += '<tr><td><input type="checkbox" /></td><td><span class="label">' + message.service + '</span></td><td><a href="' + message.view_link + '">' + message.summary + '</a></td><td title="' + msgmoment.calendar() + '">' + msgmoment.fromNow() + '</td></tr>';
        }
        return html;
    },
    html_nav: function() {
        var html = '';
        html += '<li class="nav-header" style="color: #666">Winbox</li>';
        html += '<li ' + (!this.active_service ? 'class="active"' : '') + '><a href="#/winbox"><i class="' + (!this.active_service ? 'icon-white ' : '') + 'icon-inbox"></i> Messages</a></li>';
        html += '<li ' + (this.active_service == '__settings' ? 'class="active"' : '') + '><a href="#/winbox/settings"><i class="' + (this.active_service == '__settings' ? 'icon-white ' : '') + 'icon-cog"></i> Settings</a></li>';
        html += '<li class="nav-header">Services</li>';
        for (var slug in this.services) {
            var service = this.services[slug];
            if (!service || !service.config) { continue; }
            var li_active = (this.active_service == slug ? ' class="active" ' : '');
            var i_active = (this.active_service == slug ? ' icon-white ' : '');
            html += '<li' + li_active + '><a href="#/winbox/messages/' + slug + '"><i class="icon-folder-open' + i_active + '"></i> ' + service.config.name + '</a></li>';
        }
        return html;
    }
});