/*
agent.js
========
A REST agent

Responsibilities:
 - Provides HTTP requests through the link resource service
 - Maintains state and state history
 - Maintains sub agents
*/

goog.provide('link.Agent');

goog.require('link.ResourceService');
goog.require('link.Request');
goog.require('link.Response');

link.Agent = function(res_service) {
    this.res_service = res_service;
}

/**
 * Couples the agent to the window so that it extends the browser
 */
link.Agent.prototype.attach_to_window = function () {
    window.onhashchange = function() {
        // :TODO:
    }
}

/**
 * Follows a request, building state around the response and pushing the old state to history
 **/
link.Agent.prototype.follow = function(request) {
    // Move the current state into the history
    // :TODO:
    // Instruct the request's resource service to build the response
    // :TODO:
    // Construct the current state around the reponse
    // :TODO:
}

/**
 * Executes the response's render on the provided element
 */
link.Agent.prototype.render = function(element) {
    element = goog.dom.getElement(element);
    // Run the response's render function
    // :TODO:
}