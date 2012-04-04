// Service - Restwitter
// Takes...
//   GET application/json: pipes the request to the restwitter service
//     - '?req=messages' for a DM listing
//       - '&filter=unread' for unread messages
//       - returns structure of [{service:,summary:,date:}]
//     - '?req=message' for a single DM body
//       - '&id=:id' to specify the id
//       - returns structure of {body:}
link.App.configure('#/winbox/services/restwitter', {
    "->": function(request, agent, callback) {
        var self = this;
        if (request.matches({'method':'get', 'accept': 'application/json'})) {
            // Message listing
            var query = request.get_query();
            if (query.get('req') == 'messages') {
                // Build URI
                var uri = '/direct_messages?count=1';
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
                        var org_msgs = xhr.getResponseJson();
                        for (var id in org_msgs) {
                            messages.push({id: id, service: self.service, summary: org_msgs[id].sender.screen_name + ': ' + org_msgs[id].text, date: new Date(org_msgs[id].created_at)});
                        }
                        messages.reverse(); // most recent on top
                        callback((new link.Response(200)).body(messages, 'application/json'));
                    } else {
                        // Failure
                        console.log('Failed to retrieve DMs from ' + self.host + uri, xhr.getLastError());
                        callback(new link.Response(500));
                    }
                }, 'GET', null, { 'x-link-host': self.host });
            }
            // Service description
            else if (query.get('req') == 'descript') {
                callback((new link.Response(200)).body({name: this.service}, 'application/json'));
            }
        }
    }
});