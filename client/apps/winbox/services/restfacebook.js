// Service - Restfacebook
// Takes...
//   GET application/json: pipes the request to the restfacebook service
//     - '?req=messages' for a PM listing
//       - '&filter=unread' for unread messages
//       - returns structure of [{service:,summary:,date:}]
//     - '?req=message' for a single PM body
//       - '&id=:id' to specify the id
//       - returns structure of {body:}
link.App.configure('#/winbox/services/restfacebook', {
    "->": function(request, agent, callback) {
        var self = this;
        if (request.matches({'method':'get', 'accept': 'application/json'})) {
            // Message listing
            var query = request.get_query();
            if (query.get('req') == 'messages') {
                // Build URI
                var uri = '/inbox';
                /*if (query.get('filter') == 'unread') {
                    uri += '?s=' + encodeURI('["UNSEEN"]');
                }*/
                // Send request to the service
                // :DEBUG: use goog for now
                goog.net.XhrIo.send(uri, function(e) {
                    var xhr = e.target;
                    if (xhr.isSuccess()) {
                        // Success, build response body
                        var messages = [];
                        var resjson = xhr.getResponseJson();
                        var org_msgs = resjson.data;
                        for (var id in org_msgs) {
                            messages.push({id: org_msgs[id].id, service: self.service, summary: org_msgs[id].from.name + ': ' + org_msgs[id].message.substr(0,100) + '...', date: new Date(org_msgs[id].updated_time)});
                        }
                        messages.reverse(); // most recent on top
                        callback((new link.Response(200)).body(messages, 'application/json'));
                    } else {
                        // Failure
                        console.log('Failed to retrieve PMs from ' + self.host + uri, xhr.getLastError());
                        callback(new link.Response(500));
                    }
                }, 'GET', null, { 'x-link-host': self.host });
            }
        }
    }
});