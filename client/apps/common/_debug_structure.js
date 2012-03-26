// Debug: Structure
// - GET text/html: provides a rendering of the resource service's URI structure

// Require bootstrap
arg_agent.require_style(['/apps/bootstrap/css/bootstrap.css']);

if (!this.build_html) { // only define once
    // Structure builder
    this.build_html = function(level, base_uri) {
        if (!base_uri) { base_uri = ''; }
        var html = '<div class="container"><div class="row"><div class="span12"><ul>';
        for (var uri in level) {
            var child_base_uri = base_uri + uri + '/';
            //if (uri == '/') { child_base_uri = '/'; }
            //else { child_base_uri = base_uri + uri + '/'; }
            html += '<li><a href="' + base_uri + uri + '">' + uri + '</a>' + this.build_html(level[uri], child_base_uri) + '</li>';
        }
        html += '</ul></div></div></div>';
        return html;
    }
}

if (arg_request.matches({'method':'get', 'accept': 'text/html'})) {
    // Get the URI structure
    var uris = arg_agent.get_uri_structure();
    // Produce the HTML
    var html = this.build_html(uris);
    // Respond
    arg_callback((new link.Response(200)).body(html,'text/html'));
}