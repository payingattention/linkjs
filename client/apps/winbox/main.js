// LinkBox
// =======
// A messaging inbox
link.App.configure('#/winbox', {
    "->": function(request, agent, callback) {
        var self = this;
        if (request.matches({'method':'get', 'accept':'text/html'})) {

            // Trigger requests to our services
            var messages_html = '<tr><td colspan="3">Loading...</td></tr>';
            if (!self._messages) {
                // Fetch the unread messages
                this._sync_inbox(agent);
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
    _sync_inbox: function(agent) {
        var self = this;
        self._services = [];
        self._messages = [];
        this._service_descripts = [];
        // Fetch all services configured into the pindex
        agent.get('#/pindex?q="winbox_service"', {'accept':'application/javascript'}, function(services_res) {
            self._services = services_res.get_body();
            for (var i=0, ii=self._services.length; i < ii; i++) {
                // Fetch description
                agent.get(self._services[i] + '?req=descript', {'accept':'application/json'}, function(res) { self._handle_service_descript(res); });
                // Fetch messages
                agent.get(self._services[i] + '?req=messages&filter=unread', {'accept':'application/json'}, function(res) { self._handle_messages(res); });
            }
        });
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
        for (var i=0, ii=new_messages.length; i < ii; i++) {
            var added=false;
            for (var j=0, jj=this._messages.length; j < jj; j++) {
                if (new_messages[i].date > this._messages[j].date) {
                    this._messages.splice(j, 0, new_messages[i]);
                    added=true;
                    break;
                }
            }
            if (!added) { this._messages.push(new_messages[i]); }
        }
        // Redraw all messages
        var messages_table = document.getElementById('winbox-messages');
        messages_table.innerHTML = this._render_messages();
    },
    _handle_service_descript: function(response) {
        this._service_descripts.push(response.get_body());
        // Redraw the sidebar
        var services_list = document.getElementById('winbox-services-list');
        services_list.innerHTML = this._render_services_list();
    }
});