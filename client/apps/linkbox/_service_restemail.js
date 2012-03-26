// Service - Restemail
// Takes...
//   GET application/json: pipes the request to the restemail service
//     - '?req=messages' for a message listing
//       - '&filter=unread' for unread messages
//       - returns structure of [{service:,summary:,date:}]
//     - '?req=message' for a single message body
//       - '&id=:id' to specify the id
//       - returns structure of {body:}
var self = this;
if (arg_request.matches({'method':'get', 'accept': 'application/json'})) {
    // Message listing
    var query = arg_request.get_query();
    if (query.get('req') == 'messages') {
        // Build URI
        var uri = '/messages';
        if (query.get('filter') == 'unread') {
            uri += '?s=' + encodeURI('["UNSEEN"]');
        }
        // Send request to the service
        // :DEBUG: use goog for now
        goog.net.XhrIo.send(uri, function(e) {
            var xhr = e.target;
            if (xhr.isSuccess()) {
                // Success, build response body
                var messages = [];
                var org_msgs = xhr.getResponseJson();
                for (var id in org_msgs) {
                    messages.push({id: id, service: self.service, summary: org_msgs[id].subject, date: new Date(org_msgs[id].date)});
                }
                messages.reverse(); // most recent on top
                arg_callback((new link.Response(200)).body(messages, 'application/json'));
            } else {
                // Failure
                console.log('Failed to retrieve email from ' + self.host + uri, xhr.getLastError());
                arg_callback(new link.Response(500));
            }
        }, 'GET', null, { 'x-link-host': self.host });
    }
}