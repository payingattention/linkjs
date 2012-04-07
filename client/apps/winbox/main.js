// LinkBox
// =======
// A messaging inbox
link.App.configure('#/winbox', {
    "->": function(request, uri_params, callback) {
        var self = this;
        if (request.matches({'method':'get', 'accept':'text/html'})) {

            // Trigger requests to our services
            var messages_html = '<tr><td colspan="3">Loading...</td></tr>';
            if (!self._messages) {
                // Fetch the unread messages
                this._sync_inbox();
            } else {
                // Just re-render
                messages_html = self._render_messages();
            }
            
            // Render the inbox
            var html = Handlebars.templates['box.html']({messages: messages_html});
            html = self._render_layout(html);
            callback((new link.Response(200).body(html, 'text/html')));
        }
    },
    _sync_inbox: function() {
        var self = this;
        var agent = new link.Agent();
        self._services = [];
        self._messages = [];
        this._service_descripts = [];
        // Fetch all services under #/winbox/services
        self._services = link.App.get_child_uris('#/winbox/services');
        for (var i=0, ii=self._services.length; i < ii; i++) {
            var uri = self._services[i];
            // Fetch description
            this._service_descripts.push({name: link.App.get_uri_config(uri, 'service')});
            // Fetch messages
            agent.get(uri + '?q=unread&v=["service","date","summary"]', {'accept':'application/json'}, function(res) { self._handle_messages(res); });
        }
        // Redraw the sidebar
        var services_list = document.getElementById('winbox-services-list');
        if (services_list) {
            services_list.innerHTML = this._render_services_list();
        }
    },
    _render_layout: function(content) {
        return Handlebars.templates['winbox-layout.html']({content: content, services: this._services});
    },
    _render_messages: function() {
        var html = '';
        for (var i=0, ii=this._messages.length; i < ii; i++) {
            var message = this._messages[i];
            var msgmoment = moment(message.date);
            html += '<tr onclick="window.location.hash=\'#/winbox/message\'; return false;"><td><input type="checkbox" /></td><td><span class="label">' + message.service + '</span></td><td>' + message.summary + '</td><td title="' + msgmoment.calendar() + '">' + msgmoment.fromNow() + '</td></tr>';
        }
        return html;
    },
    _render_services_list: function() {
        var html = '';
        for (var i=0, ii=this._service_descripts.length; i < ii; i++) {
            var service = this._service_descripts[i];
            html += '<li><a href="#"><i class="icon-folder-open"></i> ' + service.name + '</a></li>';
        }
        return html;
    },
    _handle_messages: function(response) {
        var new_messages = response.get_body();
        if (!new_messages) { return; }
        // Sort new messages into existing
        for (var mid in new_messages) {
            new_messages['id'] = mid;
            var added=false;
            for (var j=0, jj=this._messages.length; j < jj; j++) {
                if (new_messages[mid].date > this._messages[j].date) {
                    this._messages.splice(j, 0, new_messages[mid]);
                    added=true;
                    break;
                }
            }
            if (!added) { this._messages.push(new_messages[mid]); }
        }
        // Redraw all messages
        var messages_table = document.getElementById('winbox-messages');
        if (messages_table) {
            messages_table.innerHTML = this._render_messages();
        }
    }
});