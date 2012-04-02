link.App.configure('#/winbox/message', {
    "->": function(request, agent, callback) {
        if (request.matches({'method':'get', 'accept':'text/html'})) {

            // Fetch the message from our GET params
            // :TODO:
            var message = { // :DEBUG:
                service: 'Twitter',
                timestamp: 'Yesterday @ 5:33pm',
                twitter: {
                    id: 0,
                    from: 'Bob',
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
            agent.post('#/winbox/_iface/msg/' + message.service.toLowerCase(), message, 'application/json', {'accept':'text/html'}, function(response) {
                html += response.get_body();

                // Put into the layout
                agent.post('#/winbox/_iface/layout', html, 'text/html', {'accept': 'text/html'}, callback);
            });

                
        }
    }
});