// LinkBox
// =======
// A messaging inbox
var self = this;

// Require jquery
arg_agent.require_script(['https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.js'], function() {
    if (arg_request.matches({'method':'get', 'accept':'text/html'})) {
        // Have _shell build its html if DNE
        arg_agent.follow((new link.Request('/_iface/shell')).for_html(), function() {
            // Render it to the body
            arg_agent.render(document.body);
            // Highlight the inbox
            arg_agent.post('/_iface/activenav', {label: 'Messages'}, 'application/json');
            // Fetch the unread messages
            // :TODO:
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
            html +=   '<tbody>';
            html +=     '<tr onclick="window.location.hash=\'#/message\'; return false;"><td><input type="checkbox" /></td><td>Service</td><td>Subject</td><td>Today</td></tr>';
            html +=     '<tr onclick="window.location.hash=\'#/message\'; return false;"><td><input type="checkbox" /></td><td>Service</td><td>Subject</td><td>Today</td></tr>';
            html +=     '<tr onclick="window.location.hash=\'#/message\'; return false;"><td><input type="checkbox" /></td><td>Service</td><td>Subject</td><td>Today</td></tr>';
            html +=   '</tbody>';
            html += '</table>';
            // Respond
            arg_callback((new link.Response(200)).body(html,'text/html').render_to(document.getElementById('content')));
        });
    }
});