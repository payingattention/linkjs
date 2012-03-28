// Winbox Configuration
// ====================
link.App.require_style(['/apps/shell/shell.css']);
link.App.configure({
    "#": {
        "->": "/apps/shell/main.js",
        "->requires": [
            '/apps/shell/vendor/handlebars.runtime.js',
            '/apps/shell/templates/templates.js'
        ],
        "->pipe": function(request, agent, callback) {
            // Follow the original request
            agent.follow(request, function(response) {
                // Wrap the render function
                var org_renderer = response.render;
                response.renderer(function(element) {
                    // Generate the HTML
                    element.innerHTML = Handlebars.templates['shell.html']({ 'nav': [
                        {'uri': '#', 'label': '&lfloor;&rceil;', 'selected': (window.location.hash == '')},
                        {'uri': '#/shell/structure', 'label': 'structure', 'selected': (window.location.hash == '#/shell/structure')}
                    ]});
                    var root_elem = document.getElementById('shell-root');
                    // Call the original
                    org_renderer.call(this, root_elem);
                });
                // Pipe the response
                callback(response);
            });
        }
    },
    "#/shell/structure": {
        "->": "/apps/shell/structure.js"
    }
});
link.App.load(['#']); // preload