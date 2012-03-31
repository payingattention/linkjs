// Shell
// =====
// A Link interface environment
link.App.configure('#/shell/ui', {
    "->": function(request, agent, callback) {
        if (request.matches({'method':'get', 'accept':'text/html'})) {
            var selection = request.get_query().get('activenav');
            // Generate the HTML
            var html = Handlebars.templates['shell.html']({ 'nav': [
                {'uri': '#', 'label': '&lfloor;&rceil;', 'selected': (selection == '')},
                {'uri': '#/shell/structure', 'label': 'structure', 'selected': (selection == '/shell/structure')}
            ]});
            // Respond :TODO:
            callback((new link.Response(200)).body(html,'text/html'));
        } else {
            callback(new link.Response(501,"Not Implemented"));
        }
    }
});