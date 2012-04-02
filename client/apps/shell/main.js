// Shell
// =====
// A Link interface environment
link.App.configure('#', {
    "->": function(request, agent, callback) {
        if (request.matches({'method':'get', 'accept':'text/html'})) {
            // Respond :TODO:
            callback((new link.Response(200)).body('','text/html'));
        } else {
            callback(new link.Response(501,"Not Implemented"));
        }
    },
    "->request_processor": function(request) {
        var body_agent = link.App.get_frame_agent('document.body');
        // Create the frame agents, if they don't exist
        if (!body_agent.has_frame_agents(['shell-app', 'shell-ui'])) {
            // Destroy any other frames
            // :TODO:
            // Create the frame elements
            document.body.innerHTML = '<div id="shell-app"></div><div id="shell-ui"></div>';
            // Add the agents
            body_agent.add_frame_agents(['shell-app', 'shell-ui']);
            // Create function which routes the requests into the two frames
            var route_request = function(request) {
                // Send the request as-is to the shell-app frame
                link.App.get_frame_agent('shell-app').follow(request);
                // Notify the shell bar
                link.App.get_frame_agent('shell-ui').get('/shell/ui?activenav=' + request.get_uri().substr(1));
                // Update the browser
                link.App.get_body_agent().update_window(request);
                // Don't let the body frame agent handle this; it would destroy our shell markup
                return false;
            };
            // Set the body frame controller to that routing function
            body_agent.set_frame_controller(route_request);
            // And go ahead and run that logic for this request
            return route_request(request);
        }
        return true; // Should be handled
    }
});