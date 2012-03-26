// LinkBox
// =======
// A messaging inbox
var self = this;

// Require jquery
arg_agent.require_script(['https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.js'], function() {
    if (arg_request.matches({'method':'get', 'accept':'text/html'})) {
        // Have _shell build its html if DNE
        arg_agent.get('#/_iface/shell', {'accept': 'text/html'}, function() {
            // Render it to the body
            arg_agent.render(document.body);
            // Highlight the inbox
            arg_agent.post('#/_iface/activenav', {label: 'Messages'}, 'application/json');
            // Add the messages list interface
            var html = '';
            html += '<div class="btn-toolbar"><div class="btn-group">';
            html +=   '<a class="btn" href="#" title="Check for new messages"><i class="icon-refresh"></i></a>';
            html +=   '<a class="btn" href="#" title="Compose a message"><i class="icon-pencil"></i></a>';
            html += '</div>';
            html += '<div class="btn-group">';
            html +=   '<a class="btn" href="#" title="Mark selected messages as read"><i class="icon-check"></i></a>';
            html += '</div></div>';
            html += '<table class="table table-condensed">';
            html += '<thead><tr><th></th><th>Service</th><th>Summary</th><th>Date</th></tr></thead>';
            html +=   '<tbody id="linkbox-messages">';
            html +=   '<tr><td colspan="3">Loading...</th></tr>';
            html +=   '</tbody>';
            html += '</table>';
            // Respond
            arg_callback((new link.Response(200)).body(html,'text/html').renderer(self._renderer));
        });
    }
});

if (!self._render_messages) {
    self._render_messages = function() {
        var html = '';
        for (var i=0, ii=self._messages.length; i < ii; i++) {
            var message = self._messages[i];
            html += '<tr onclick="window.location.hash=\'#/message\'; return false;"><td><input type="checkbox" /></td><td>' + message.service + '</td><td>' + message.summary + '</td><td>' + message.date.toDateString() + ' @' + message.date.toLocaleTimeString() + '</td></tr>';
        }
        document.getElementById('linkbox-messages').innerHTML = html;
    };
}

if (!self._handle_messages) {
    self._handle_messages = function(response) {
        var new_messages = response.get_body();
        if (!new_messages) { return; }
        // Sort new messages into existing
        for (var i=0, ii=new_messages.length; i < ii; i++) {
            var added=false;
            for (var j=0, jj=self._messages.length; j < jj; j++) {
                if (new_messages[i].date > self._messages[j].date) {
                    self._messages.splice(j, 0, new_messages[i]);
                    added=true;
                    break;
                }
            }
            if (!added) { self._messages.push(new_messages[i]); }
        }
        // Redraw all messages
        self._render_messages();
    }
}

if (!self._renderer) { // define once
    self._renderer = function(element) {
        // Render interface to content
        document.getElementById('content').innerHTML = this.get_body();
        if (!self._messages) {
            // Fetch the unread messages
            self._messages = [];
            var services = arg_agent.get_child_uris('#/_services');
            for (var i=0, ii=services.length; i < ii; i++) {
                arg_agent.get(services[i] + '?req=messages&filter=unread', {'accept':'application/json'}, self._handle_messages);
            }
        } else {
            // Just render messages
            self._render_messages();
        }
    };
}