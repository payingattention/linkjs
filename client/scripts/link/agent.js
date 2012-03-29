/*
agent.js
========
A REST agent

Responsibilities:
 - Provides HTTP requests through the link application
 - Maintains state
 - Maintains frame agents
 - Maintains request modifiers (cookies++) :TODO:

Frame Agents:
 - Sub-agents attached to elements in the DOM to track independent states and handle requests originating from their DOM trees
 - Frame Controllers handle routing, creation, and deletion of frames

Todo:
 - Add frame agents to link.Agent
   - Add .frame_agents, .frame_element, and .parent_agent properties
   - frame_agents = map, key=frame_element_id, value=agent
   - Add functions to create/destroy frame agents
     - Requires frame element to exist when called

 - Update link.Agent.follow()
   - Add optional frame element id (default=body) which specifies which frame the request originated from
   - If the frame elem is not attached to the agent or any subs...
     - If parent_agent exists, its .follow will be called
     - If it doesn't, the request wont be handled (error condition, probably non existent element)
   - If the frame elem is attached to the current or a sub at any depth, follow() will run its controller code
     - Default controller only calls the attached sub (one level down, not the exact one)
   - If the controller returns true or DNE, follow() handles the request itself
   - Note, possible decisions are: create new frame, delete existing frame, modify request, route request to a frame agent, and create new request to a frame agent.

 - Add frame controllers to link.App
   - Add .frame_controllers (map, key=frame_element_id, value=callback)
   - Add function to set controllers
     - Doesn't require frame elements to exist when called
     - Meant to be called during configuration/init
   - Controllers are given the agent and the request
     - If the given agent will handle, returns true
     - Doesn't use a callback because it's not supposed to make async choices on the given request

 - Update link.Agent.attach_to_window()
   - Remove onhashchange, replace with a document.body listener
   - Handle on the bubble stage, so that components can easily override this behavior with their own


Request Persistence
 - A tool for resources to provide persistent request behavior (headers, redirects, etc)
 - Approaches
   - Callbacks which are run on requests, giving them the opportunity to add/modify headers & body
 - Proposed behaviors/capabilities
 - Questions
*/

goog.provide('link.Agent');

goog.require('link.AgentState');
goog.require('link.App');
goog.require('link.Request');
goog.require('link.Response');

goog.require('goog.Uri');
goog.require('goog.dom');

link.Agent = function() {
    this.state_ = null;
}

//
// Getters
//
link.Agent.prototype.get_current_state = function() { return this.state_; }

/**
 * Couples the agent to the window so that it extends the browser
 */
link.Agent.prototype.attach_to_window = function () {
    var self = this;
    // Attach to URL fragment changes (links, manually-entered)
    window.onhashchange = function() {
        // Build the request from the hash
        var uri = window.location.hash;
        if (uri == null || uri == '') { uri = '#'; }
        var request = new link.Request(uri);
        request.for_html(); // assume GET for text/html
        // Follow the request
        self.follow(request);
    }
    // Now follow the current uri
    var uri = window.location.hash;
    if (uri == null || uri == '') { uri = '#'; }
    this.follow((new link.Request(uri)).for_html()); // request the current page
}

/**
 * Follows a request, building state around the response
 **/
link.Agent.prototype.follow = function(request, callback) {
    var self = this;
    // Instruct the request's resource service to build the response
    link.App.handle_request(request, function(response) {
        // Construct the new state
        self.state_ = new link.AgentState(request,response);
        // Run the response handler
        if (response.render) {
            response.render(this);
        }
        // Run the callback, if given
        if (callback) {
            callback.call(self, response);
        }
    });
}

//
// Request create & follow helpers
//
link.Agent.prototype.get = function(uri, headers, callback) {
    var request = new link.Request(uri);
    request.method('get');
    if (headers) { request.headers(headers); }
    this.follow(request, callback);
}
link.Agent.prototype.post = function(uri, body, body_contenttype, headers, callback) {
    var request = new link.Request(uri);
    request.method('post');
    if (headers) { request.headers(headers); }
    if (body) { request.body(body, body_contenttype); }
    this.follow(request, callback);
}

/**
 * Provides the structure beneath the given URI
 */
link.Agent.prototype.get_child_uris = function(uri) {
    if (!uri) { uri = '#'; }
    return link.App.get_child_uris(uri);
}

/**
 * Provides the structure beneath the given URI as an object
 */
link.Agent.prototype.get_uri_structure = function(uri) {
    if (!uri) { uri = '#'; }
    var uris = link.App.get_child_uris(uri);
    var structure = {};
    // add the uris
    for (var i=0, ii=uris.length; i < ii; i++) {
        var uri_parts = uris[i].split('/');
        if (uri_parts[uri_parts.length-1] == '') { uri_parts.pop(); } // if uri ended with a slash, ignore the extra
        var cur_node = structure;
        while (uri_parts.length) {
            var part = uri_parts.shift();
            if (!cur_node[part]) { cur_node[part] = {}; }
            cur_node = cur_node[part];
        }
    }
    return structure;
}