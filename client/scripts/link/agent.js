/*
agent.js
========
A REST agent

Responsibilities:
 - Provides HTTP requests through the link resource service
 - Maintains state and state history
 - Maintains sub agents

Todo:
 - Response rendering
 - Attaching to history controls
*/

goog.provide('link.Agent');

goog.require('link.AgentState');
goog.require('link.ResourceService');
goog.require('link.Request');
goog.require('link.Response');

goog.require('goog.Uri');
goog.require('goog.dom');

link.Agent = function(res_service) {
    this.res_service_ = res_service;
    this.history_ = [];
    this.history_length_ = 0;
    this.state_index_ = -1;
}

//
// Getters
//
link.Agent.prototype.get_current_state = function() {
    if (this.history_[this.state_index_]) {
        return this.history_[this.state_index_];
    }
    return null;
}

/**
 * Couples the agent to the window so that it extends the browser
 */
link.Agent.prototype.attach_to_window = function () {
    var self = this;
    // Attach to URL fragment changes (links, manually-entered)
    window.onhashchange = function() {
        // Build the request from the hash
        var request = new link.Request(window.location.hash.substring(1));
        request.for_html(); // assume GET for text/html
        // Follow the request
        self.follow(request);
        self.render(document.body);
    }
    // Attach to history controls
    // :TODO;
    onbackward = function() {
        this.follow_history(-1);
    }
    onforward = function() {
        this.follow_history(1);
    }
}

/**
 * Follows a request, building state around the response and pushing the old state to history
 **/
link.Agent.prototype.follow = function(request) {
    var self = this
    // Instruct the request's resource service to build the response
    this.res_service_.handle_request(request, function(response) {
        // Drop any history after this current state
        self.state_index_++;
        var new_history_length_ = self.state_index_ + 1;
        if (new_history_length_ <= self.history_length_) {
            self.history_.splice(new_history_length_, (self.history_length_ - new_history_length_));
            self.history_length_ = new_history_length_;
        }
        // Construct the new state
        self.history_.push(new link.AgentState(request,response));
        // Run the response handler
        self.render(document.body);
    });
}

/**
 * Move through state history
 */
link.Agent.prototype.follow_history = function(delta) {
    // Update index
    var new_index = this.state_index_ + delta;
    if (new_index >= this.history_length_) { new_index = this.history_length_ - 1; }
    if (new_index < 0) { new_index = 0; }
    // New state? Render it
    if (this.state_index_ != new_index) {
        this.state_index_ = new_index;
        this.render(document.body);
    }
}

/**
 * Executes the response's render on the provided element
 */
link.Agent.prototype.render = function(element) {
    element = goog.dom.getElement(element);
    state = this.get_current_state();
    // :DEBUG: append response body to element
    element.innerHTML += state.get_response().get_body();
    // Run the response's render function
    // :TODO:
}