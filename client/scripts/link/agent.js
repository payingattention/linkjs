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
    var self = this;
    
    // Click handler
    var click_handler = function(e) {
        // Mark as recently clicked, if this (or a parent) is part of a form
        var node = e.target;
        while (node) {
            if (node.form) {
                for (var i=0; i < node.form.length; i++) {
                    node.form[i].setAttribute('clicked', null); // clear the others out, to be safe
                }
                node.setAttribute('clicked', '1');
                break;
            }
            node = node.parentNode;
        }
        
        // Try to collect the target URI
        var target_uri = e.target.href;
        if (!target_uri || target_uri.charAt(0) != '#') { return; }
        e.preventDefault();
        if (e.stopPropagation) { e.stopPropagation(); }

        // Build request
        var request = new link.Request(target_uri);
        request.for_html(); // <a> = GET text/html
        
        // Handle
        self.follow(request);
    };
    goog.events.listen(document, goog.events.EventType.CLICK, click_handler, false);

    // Form handler
    var submit_handler = function(e) {
        var form = e.target;
        var target_uri, enctype, method;

        // Serialize the data
        var data = {};
        for (var i=0; i < form.length; i++) {
            var elem = form[i];
            // If was recently clicked, pull its request attributes-- it's our submitter
            if (elem.getAttribute('clicked') == '1') {
                target_uri = elem.getAttribute('formaction');
                enctype = elem.getAttribute('formenctype');
                method = elem.getAttribute('formmethod');
                elem.setAttribute('clicked', '0');
            }
            if (elem.value) {
                data[elem.name] = elem.value;
            }
        }

        // If no element gave request attributes, pull them from the form
        if (!target_uri) { target_uri = form.action; }
        if (!enctype) { enctype = form.enctype; }
        if (!method) { method = form.method; }

        // No target uri means use the current URI
        var base_uri = form.baseURI;
        var hash_pos = form.baseURI.indexOf('#');
        if (hash_pos != -1) { base_uri = base_uri.substring(0,hash_pos); }
        target_uri = target_uri.replace(base_uri, '');
        if (!target_uri) { target_uri = window.location.hash; }
        
        // Submit to Link resource?
        if (target_uri.charAt(0) != '#') { return; }
        e.preventDefault();
        if (e.stopPropagation) { e.stopPropagation(); }

        // Build the request
        var request = new link.Request(target_uri);
        request.method(method);
        if (form.acceptCharset) { request.headers({ 'accept': form.acceptCharset }); }

        // Build request body
        if (form.method == 'get') {
            var qparams = [];
            for (var k in data) {
                qparams.push(k + '=' + data[k]);
            }
            target_uri += '?' + qparams.join('&');
            request.uri(target_uri);
        } else {
            request.body(data, enctype);
        }
        
        // Handle
        self.follow(request);
    };
    goog.events.listen(document, goog.events.EventType.SUBMIT, submit_handler, false);
    
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
};

/**
 * Follows a request and renders the response
 **/
link.Agent.prototype.follow = function(request) {
    var self = this;
    return link.App.handle_request(request, function(response) {
        // If a redirect, do that now
        if (response.get_status_code() >= 300 && response.get_status_code() < 400) {
            self.follow((new link.Request(response.get_headers().get('location'))).for_html());
            return;
        }
        // Render to window
        if (response.render) { response.render(); }
        // If not a 205 Reset Content, then change our hash
        if (response.get_status_code() != 205) {
            self.expected_hashchange_ = request.get_uri();
            window.location.hash = request.get_uri();
        }
    });
};