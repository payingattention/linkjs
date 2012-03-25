var self = this;
// Require jquery
arg_agent.require_script(['https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.js'], function() {
    if (arg_request.matches({'method':'get', 'accept':'text/html'})) {
        // Have _shell build its html if DNE
        arg_agent.follow((new link.Request('/_iface/shell')).for_html(), function() {
            arg_agent.render(document.body);
            // Fetch the message from our GET params
            // :TODO:
            var message = { // :DEBUG:
                service: 'twitter',
                timestamp: 'Yesterday @ 5:33pm',
                twitter: {
                    id: 0,
                    from: 'BobFriendly',
                    msg: "Hey man, how's it going?"
                }
            }
            // Add the message shell interface
            var html = '';
            html += '<div class="btn-toolbar"><div class="btn-group">';
            html +=   '<a class="btn" href="#" title="Back to messages"><i class="icon-arrow-left"></i></a>';
            html += '</div>';
            html += '<div class="btn-group">';
            html +=   '<a class="btn" href="#" title="Mark message as read"><i class="icon-check"></i></a>';
            html += '</div></div>';
            html += '<div class="page-header"><h3>' + message.timestamp + ' on ' + message.service + '</h3></div>';
            // Get the interface to the particular service
            arg_agent.follow((new link.Request('/_iface/msg/' + message.service)).method('post').headers({'accept':'text/html'}).body(message,'application/json'), function(response) {
                html += response.get_body();
                // Respond
                arg_callback((new link.Response(200)).body(html,'text/html').render_to(document.getElementById('content')));
            });
        });
    }
});