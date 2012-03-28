// Debug: Structure
// - GET text/html: provides a rendering of the resource service's URI structure

link.App.configure('#/shell/structure', {
    "->": function(request, agent, callback) {
        if (request.matches({'method':'get', 'accept': 'text/html'})) {
            // Get the URI structure
            var uris = agent.get_uri_structure();
            // Produce the HTML
            var html = this.build_html(uris);
            // Respond
            callback((new link.Response(200)).body(html,'text/html'));
        }
    },
    build_html: function(level, base_uri) {
        if (!base_uri) { base_uri = ''; }
        var html = '<ul>';
        for (var uri in level) {
            var child_base_uri = base_uri + uri + '/';
            html += '<li><a href="' + base_uri + uri + '">' + uri + '</a>' + this.build_html(level[uri], child_base_uri) + '</li>';
        }
        html += '</ul>';
        return html;
    }
});