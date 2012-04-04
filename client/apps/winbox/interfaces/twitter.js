link.App.configure('#/winbox/interfaces/twitter', {
    "->": function(request, agent, callback) {
        if (request.matches({'method':'post', 'accept':'text/html'})) {
            var body = request.get_body();
            // provide our interface
            html = '<p><a href="#">@' + body.twitter.from + '</a>: ' + body.twitter.msg + '</p>';
            callback((new link.Response(200)).body(html,'text/html'));
        }
    }
});