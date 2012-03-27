/*
agent.js
========
A REST agent

Responsibilities:
 - Provides HTTP requests through the link resource service
 - Maintains state
 - Maintains sub agents
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
    this.element_ = null;
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
    // Render to the whole document
    self.element_ = document.body;
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
    var self = this
    // Instruct the request's resource service to build the response
    link.App.handle_request(request, function(response) {
        // Construct the new state
        self.state_ = new link.AgentState(request,response);
        // Run the response handler
        self.render(self.element_);
        // Run the callback, if given
        if (callback) {
            callback.call(self, response);
        }
    });
}

/**
 * Executes the response's render on the provided element
 */
link.Agent.prototype.render = function(element) {
    state = this.get_current_state();
    if (!state.get_response().render) { return };
    if (!element) { return }
    element = goog.dom.getElement(element);
    // Run the response's render function
    state.get_response().render(element);
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