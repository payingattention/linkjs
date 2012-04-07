/*
agent.js
========
A REST agent

Responsibilities:
 - Provides HTTP requests through the link application
 - Maintains state
 - Maintains frame agents

Todo:
 - Add frame agent deletion tools
   - Need to listen to deletion of their elements
   - Need a remove_agent()
*/

goog.provide('link.Agent');

goog.require('link.AgentState');
goog.require('link.App');
goog.require('link.Request');
goog.require('link.Response');

goog.require('goog.Uri');
goog.require('goog.structs.Map');
goog.require('goog.dom');

link.Agent = function() {
    this.state_ = null;
    this.frame_element_ = null;
    this.frame_controller_ = null;
    this.frame_agents_ = new goog.structs.Map();
    this.parent_agent_ = null;
    this.click_handler_ = null;
};

//
// Accessors
//
link.Agent.prototype.get_current_state = function() { return this.state_; };
link.Agent.prototype.get_frame_element = function() { return this.frame_element_; };
link.Agent.prototype.get_frame_element_id = function() {
    if (!this.frame_element_) { return null; }
    if (this.frame_element_ == document.body) { return 'document.body'; }
    return this.frame_element_.id;
};
link.Agent.prototype.get_frame_controller = function() { return this.frame_controller_; };
link.Agent.prototype.set_frame_controller = function(fn) { this.frame_controller_ = fn; };
link.Agent.prototype.get_frame_agents = function() { return this.frame_agents_; };
link.Agent.prototype.get_frame_agent = function(frame_element_id) { return this.frame_agents_.get(frame_element_id); };
link.Agent.prototype.get_parent_agent = function() { return this.parent_agent_; };

/**
 * Couples the agent to the given element, to use as its "frame"
 */
link.Agent.prototype.attach_to_element = function(element) {
    if (this.frame_element_) {
        goog.events.unlisten(source, goog.events.EventType.CLICK, this.click_handler_);
    }
    this.frame_element_ = element;
    // Define the click handler in this closure, to have access to 'self'
    // (I could use goog.bind, but go away you bother me)
    var self = this;
    this.click_handler_ = function(e) {
        // :TODO: forms
        // Try to collect the target URI
        var target_uri = e.target.href;
        if (!target_uri) { return; }
        e.preventDefault();
        if (e.stopPropagation) { e.stopPropagation(); }
        // Build request
        var request = new link.Request(target_uri);
        request.for_html(); // <a> = GET text/html
        // Run our parent frame controller
        if (self.get_parent_agent() && self.get_parent_agent().get_frame_controller()) {
            var should_handle = self.get_parent_agent().get_frame_controller()(request);
            if (!should_handle) { return; }
        }
        // Handle it ourselves
        self.follow(request);
        // Have the body agent do whatever it needs
        link.App.get_body_agent().update_window(request);
    };
    goog.events.listen(this.frame_element_, goog.events.EventType.CLICK, this.click_handler_, false);
    // :TODO: do we want to check goog.events.hasListener before we do this, so we can avoid 2 agents attaching to a frame? Even if it's not another agent listening, we might need to consider the seat taken
};

/**
 * Couples the agent to the window - root agent
 */
link.Agent.prototype.attach_to_window = function () {
    var self = this;
    // Set up the standard listeners
    this.attach_to_element(document.body);
    link.App.set_body_agent(this);
    // Set up a hash listener as well
    window.onhashchange = function() {
        // Build the request from the hash
        var uri = window.location.hash;
        if (self.expected_hashchange_ == uri) {
            self.expected_hashchange_ = null; // do nothing if this has been handled elsewhere
            return;
        }
        self.expected_hashchange_ = null;
        if (uri == null || uri == '') { uri = '#'; }
        var request = new link.Request(uri);
        request.for_html(); // assume GET for text/html
        // Follow the request
        self.follow(request);
        
    };
    // Now follow the current hash's uri
    var uri = window.location.hash;
    if (uri == null || uri == '') { uri = '#'; }
    this.follow((new link.Request(uri)).for_html());
};

/**
 * Updates the browser to reflect state
 */
link.Agent.prototype.update_window = function(request) {
    this.expected_hashchange_ = request.get_uri();
    window.location.hash = request.get_uri();
};

/**
 * Checks for frame agents within this immediate frame, returns true if ALL are found
 * - 'frame_element_ids' may be a string or an array of strings
 */
link.Agent.prototype.has_frame_agents = function(frame_element_ids) {
    if (typeof(frame_element_ids) == 'string') { frame_element_ids = [frame_element_ids]; }
    for (var i=0; i < frame_element_ids.length; i++) {
        if (!this.frame_agents_.containsKey(frame_element_ids[i])) {
            return false;
        }
    }
    return true;
};

/**
 * Adds frames and creates their agents if they don't already exist
 * - 'frame_element_ids' may be a string or an array of strings
 * - Given frame elements must exist at time of call
 */
link.Agent.prototype.add_frame_agents = function(frame_element_ids) {
    if (typeof(frame_element_ids) == 'string') { frame_element_ids = [frame_element_ids]; }
    // Iterate given ids
    for (var i=0; i < frame_element_ids.length; i++) {
        if (!this.frame_agents_.containsKey(frame_element_ids[i])) {
            var elem = document.getElementById(frame_element_ids[i]);
            if (elem) {
                // Element exists, create the agent
                var frame_agent = new link.Agent();
                frame_agent.parent_agent_ = this;
                frame_agent.attach_to_element(elem);
                this.frame_agents_.set(elem.id, frame_agent);
            }
        }
    }
};

/**
 * Follows a request, building state around the response
 **/
link.Agent.prototype.follow = function(request, callback) {
    var self = this;
    link.App.handle_request(request, this, function(response) {
        // Construct the new state
        self.state_ = new link.AgentState(request,response);
        // Run the response handler
        if (response.render) {
            response.render(self);
        }
        // Run the callback, if given
        if (callback) {
            callback.call(self, response);
        }
    });
};

//
// Request create & follow helpers
//
link.Agent.prototype.get = function(uri, headers, callback) {
    var request = new link.Request(uri);
    request.method('get');
    if (headers) { request.headers(headers); }
    this.follow(request, callback);
};
link.Agent.prototype.post = function(uri, body, body_contenttype, headers, callback) {
    var request = new link.Request(uri);
    request.method('post');
    if (headers) { request.headers(headers); }
    if (body) { request.body(body, body_contenttype); }
    this.follow(request, callback);
};

/**
 * Provides the structure beneath the given URI
 */
link.Agent.prototype.get_child_uris = function(uri) {
    if (!uri) { uri = '#'; }
    return link.App.get_child_uris(uri);
};