// Winbox Configuration
// ====================
link.App.require_style(['/apps/shell/shell.css']);
link.App.configure({
    "#": {
        "->": "/apps/shell/main.js",
        "->requires": [
            '/apps/shell/vendor/handlebars.runtime.js',
            '/apps/shell/templates/templates.js'
        ]
    },
    "#/shell/updatenav": {
        "->": "/apps/shell/updatenav.js"
    },
    "#/shell/structure": {
        "->": "/apps/shell/structure.js"
    },

    "/shell/pipe": { // :TODO: move this where it belongs
        "->": function(request, agent, callback) {
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
    }
});
link.App.load(['#', '#/shell/structure']); // preload, for the hell of it
link.App.set_frame_controller('body', function(agent, request) {
    // Create the frame agents, if they don't exist
    if (!agent.has_frame_agents(['shell-app', 'shell-ui'])) {
        // Create the frame elements
        agent.get_frame_element().innerHTML = '<div id="shell-app"></div><div id="shell-ui"></div>';
        // Add the agents
        agent.add_frame_agents(['shell-app', 'shell-ui']);
    }
    // Send the request as-is to the shell-app frame
    agent.get_frame_agent('shell-app').follow(request);
    // Notify the shell bar
    agent.get_frame_agent('shell-ui').post('#/shell/updatenav', request.get_uri(), 'text/plain');
    // Don't let top-level handle this; it would destroy our shell markup
    return false;
});