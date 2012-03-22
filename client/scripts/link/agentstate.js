/*
AgentState.js
=============
A point in the agent's navigation history

Responsibilities:
 - Maintains information about the causal request and its response
*/

goog.provide('link.AgentState');

link.AgentState = function(request, response) {
    this.request_ = request;
    this.response_ = response;
}

link.AgentState.prototype.get_request = function() {
    return this.request_;
}
link.AgentState.prototype.get_response = function() {
    return this.response_;
}
link.AgentState.prototype.get_url = function() {
    return this.request_.get_url();
}