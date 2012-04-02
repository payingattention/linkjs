// LinkBox
// =======
// A messaging inbox
link.App.configure('#/winbox', {
    "->": function(request, agent, callback) {
        var self = this;
        if (request.matches({'method':'get', 'accept':'text/html'})) {

            // Fetch messages from all configured services
            if (!self._messages) {
                // Fetch the unread messages
                self._messages = [];
                var services = agent.get_child_uris('#/winbox/_services');
                for (var i=0, ii=services.length; i < ii; i++) {
                    agent.get(services[i] + '?req=messages&filter=unread', {'accept':'application/json'}, function(res) { self._handle_messages(res); });
                }
            }
            
            // Render the messages
            var messages_html = self._render_messages();

            // Render the inbox
            var html = Handlebars.templates['box.html']({messages:messages_html});
            
            // Put into the layout
            agent.post('#/winbox/_iface/layout', html, 'text/html', {'accept': 'text/html'}, callback);/*function(response) {
                callback(response); // stop there for now
                // Highlight the inbox
                agent.post('#/winbox/_iface/shell', {label: 'Messages'}, 'application/json');
                // Add the messages list interface
                var html = Handlebars.templates['box.html']();
                // Respond
                callback((new link.Response(200)).body(html,'text/html').renderer(function(element) {
                    // Render interface to winbox-content
                    document.getElementById('winbox-content').innerHTML = this.get_body();
                    if (!self._messages) {
                        // Fetch the unread messages
                        self._messages = [];
                        var services = agent.get_child_uris('#/winbox/_services');
                        for (var i=0, ii=services.length; i < ii; i++) {
                            agent.get(services[i] + '?req=messages&filter=unread', {'accept':'application/json'}, function(res) { self._handle_messages(res); });
                        }
                    } else {
                        // Just render messages
                        self._render_messages(self._messages);
                    }
                }));
            });*/
        }
    },
    _render_messages: function(messages) {
        var html = '';
        for (var i=0, ii=messages.length; i < ii; i++) {
            var message = messages[i];
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
        this._render_messages(this._messages);
    }
});