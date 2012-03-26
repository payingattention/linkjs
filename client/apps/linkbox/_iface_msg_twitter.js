if (arg_request.matches({'method':'post', 'accept':'text/html'})) {
    var body = arg_request.get_body();
    // highlight our service's nav item
    arg_agent.post('#/_iface/activenav', {label: 'Twitter'}, 'application/json');
    // provide our interface
    html = '<p><a href="#">@' + body.twitter.from + '</a>: ' + body.twitter.msg + '</p>';
    arg_callback((new link.Response(200)).body(html,'text/html'));
}