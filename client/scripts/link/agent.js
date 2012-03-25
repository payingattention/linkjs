/*
agent.js
========
A REST agent

Responsibilities:
 - Provides HTTP requests through the link resource service
 - Maintains state and state history
 - Maintains sub agents

Todo:
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
    this.element_ = null;
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
    // Render to the whole document
    self.element_ = document.body;
    // Attach to URL fragment changes (links, manually-entered)
    window.onhashchange = function() {
        // Build the request from the hash
        var uri = window.location.hash.substring(1);
        if (uri == null || uri == '') { uri = '/'; }
        var request = new link.Request(uri);
        request.for_html(); // assume GET for text/html
        // Follow the request
        self.follow(request);
    }
    // Now follow the current uri
    var uri = window.location.hash.substring(1);
    if (uri == null || uri == '') { uri = '/'; }
    this.follow((new link.Request(uri)).for_html()); // request the current page
}

/**
 * Follows a request, building state around the response and pushing the old state to history
 **/
link.Agent.prototype.follow = function(request, callback) {
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
        self.render(self.element_);
        // Run the callback, if given
        if (callback) {
            callback.call(self, response);
        }
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
        this.render(this.element_);
    }
}

/**
 * Executes the response's render on the provided element
 */
link.Agent.prototype.render = function(element) {
    if (!element) { return }
    element = goog.dom.getElement(element);
    state = this.get_current_state();
    // Run the response's render function
    state.get_response().render(element);
}

/**
 * Loads scripts into the document, if not already loaded
 *  - 'script_srcs' may be a single string (url) or an array of strings
 *  - 'callback' is evaluated when all scripts have loaded
 */
link.Agent.prototype.require_script = function(script_srcs, callback) {
    // Use an array
    if (typeof(script_srcs) == 'string') { script_srcs = [script_srcs]; }
    // Collect scripts that have been loaded
    if (!link.Agent.prototype.require_script._loaded_scripts) {
        link.Agent.prototype.require_script._loaded_scripts = []; // assume more wont be added by other means and cache the result
        var script_elems = goog.dom.getElementsByTagNameAndClass('script', null, document.head);
        for (var i=0; i < script_elems.length; i++) {
            link.Agent.prototype.require_script._loaded_scripts.push(script_elems[i].src);
        }
    }
    // Add script elems, as needed
    var script_elems = [];
    var head = goog.dom.getElement(document.head);
    for (var i=0; i < script_srcs.length; i++) {
        var script_src = script_srcs[i];
        // Skip if present
        if (link.Agent.prototype.require_script._loaded_scripts.indexOf(script_src) != -1) {
            continue;
        }
        link.Agent.prototype.require_script._loaded_scripts.push(script_src);
        // Attach element to head
        var script_elem = document.createElement('script');
        script_elem.src = script_src;
        script_elem.type = "application/javascript";
        head.appendChild(script_elem);
        script_elems.push(script_elem);
    }
    // Helper for adding the callbacks
    function add_callback(elem, fn) {
        elem.onreadystatechange = function() { // ie...
            if (script.readyState == 'loaded' || script.readyState == 'complete') {
                fn && fn(); fn = false;
            }
        };
        elem.onload = function() { // most everybody...
            fn && fn(); fn = false;
        };
        // :TODO: safari -- http://ajaxian.com/archives/a-technique-for-lazy-script-loading
    }
    // Setup callbacks
    if (callback) {
        var secount = script_elems.length;
        if (secount == 0) {
            // All scripts were already loaded, just hit the callback now
            callback();
        } else if (secount == 1) {
            // Only one script to load, hit the callback when its done
            add_callback(script_elems[0], callback);
        } else {
            // Multiple scripts; track the number that have loaded and call the given callback when all have finished
            var num_loaded = 0;
            for (var i=0; i < secount; i++) {
                add_callback(script_elems[i], function() {
                    if (num_loaded < (secount-1)) { num_loaded++; }
                    else { callback(); }
                });
            }
        }
    }
}

/**
 * Loads styles into the document, if not already loaded
 *  - 'style_hrefs' may be a single string (url) or an array of strings
 */
link.Agent.prototype.require_style = function(style_hrefs) {
    // Use an array
    if (typeof(style_hrefs) == 'string') { style_hrefs = [style_hrefs]; }
    // Collect styles that have been loaded
    if (!link.Agent.prototype.require_style._loaded_styles) {
        link.Agent.prototype.require_style._loaded_styles = []; // assume more wont be added by other means and cache the result
        var link_elems = goog.dom.getElementsByTagNameAndClass('link', null, document.head);
        for (var i=0; i < link_elems.length; i++) {
            if (link_elems.rel != 'stylesheet') { continue; }
            link.Agent.prototype.require_style._loaded_styles.push(link_elems[i].href);
        }
    }
    // Add style elems, as needed
    var head = goog.dom.getElement(document.head);
    for (var i=0; i < style_hrefs.length; i++) {
        var style_href = style_hrefs[i];
        // Skip if present
        if (link.Agent.prototype.require_style._loaded_styles.indexOf(style_href) != -1) {
            continue;
        }
        link.Agent.prototype.require_style._loaded_styles.push(style_href);
        // Attach element to head
        if (document.createStyleSheet) {
            document.createStyleSheet(style_href);
        } else {
            var link_elem = document.createElement('link');
            link_elem.href = style_href;
            link_elem.rel = "stylesheet";
            link_elem.media = "screen"; // :TODO: make an option?
            head.appendChild(link_elem);
        }
    }
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
    if (!uri) { uri = '/'; }
    return this.res_service_.get_child_uris(uri);
}

/**
 * Provides the structure beneath the given URI as an object
 */
link.Agent.prototype.get_uri_structure = function(uri) {
    if (!uri) { uri = '/'; }
    var uris = this.res_service_.get_child_uris(uri);
    var structure = {};
    // add the uris
    for (var i=0, ii=uris.length; i < ii; i++) {
        var uri_parts = uris[i].split('/');
        if (uri_parts[0] == '') { uri_parts[0] = '/'; } // before first slash is root, let's just call it '/'
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