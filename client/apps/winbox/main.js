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
                self._messages = [];
                var services = agent.get_child_uris('#/winbox/_services');
                for (var i=0, ii=services.length; i < ii; i++) {
                    agent.get(services[i] + '?req=messages&filter=unread', {'accept':'application/json'}, function(res) { self._handle_messages(res); });
                }
            } else {
                // Just re-render
                messages_html = self._render_messages();
            }
            
            // Render the inbox
            var html = Handlebars.templates['box.html']({messages: messages_html});
            
            // Put into the layout
            agent.post('#/winbox/_iface/layout', html, 'text/html', {'accept': 'text/html'}, callback);
        }
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
    }
});