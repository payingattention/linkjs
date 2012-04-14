/*
agent.js
========
The browser agent

Responsibilities:
 - Attaches to the document and runs DOM interactions through Link
*/

goog.provide('link.Agent');

goog.require('link.App');
goog.require('link.Request');
goog.require('link.Response');

goog.require('goog.Uri');
goog.require('goog.structs.Map');
goog.require('goog.dom');
goog.require('goog.async.Deferred');

link.Agent = function() {
    // Define the click handler in this closure, to have access to 'self'
    // (I could use goog.bind, but go away you bother me)
    var self = this;
    var click_handler_ = function(e) {
        // :TODO: forms

        // Try to collect the target URI
        var target_uri = e.target.href;
        if (!target_uri) { return; }
        e.preventDefault();
        if (e.stopPropagation) { e.stopPropagation(); }

        // Build request
        var request = new link.Request(target_uri);
        request.for_html(); // <a> = GET text/html
        
        // Handle
        self.follow(request);
        
        // Deal with the window
        self.update_window(request);
    };
    goog.events.listen(document, goog.events.EventType.CLICK, click_handler_, false);
    
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
 * Follows a request and renders the response
 **/
link.Agent.prototype.follow = function(request) {
    var self = this;
    return link.App.handle_request(request, function(response) {
        if (response.render) { response.render(); }
    });
};