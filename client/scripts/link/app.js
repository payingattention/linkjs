/*
App.js
==================
"Hosts" client resources

Responsibilities:
 - Manages a namespace which maps to layered resource definitions
 - Handles CONFIGURE requests, which update the namespace at runtime
 - Loads and evaluates resource definitions from remote sources

Todo:
 - Change the winbox resources to use the configure call
*/

goog.provide('link.App');

goog.require('link.Response');
goog.require('goog.structs.Map');
goog.require('goog.object');
goog.require('goog.Uri.QueryData');
goog.require('goog.net.XhrIo');

/**
 * Loads app configuration from a remote url
 */
link.App.load_config = function(url, callback) {
    // Just load the script - it should run link.App.config(...)
    link.App.require_script(url, callback);
}

/**
 * Configure the application namespace
 */
link.App.configure = function(name, def) {
    if (!this.resources_) { this.resources_ = new goog.structs.Map(); }
    // :TODO: some kind of precedence so user settings win?
    if (!def && typeof(name) == 'object') {
        this.resources_.addAll(name); // :TODO: set one at a time, to do extending
    } else {
        // Extend the old definition, if it exists
        var old_def = {};
        if (this.resources_.containsKey(name)) { old_def = this.resources_.get(name); }
        goog.object.extend(old_def, def);
        this.resources_.set(name, old_def);
    }
}

/**
 * Get a resource config value
 * - 'search_up' = true to check parents until the value is found
 */
link.App.get_uri_config = function(uri, name, search_up) {
    var uris = [uri];
    if (search_up) { uris = uris.concat(this.get_parent_uris(uri)); }
    for (var i=0, ii=uris.length; i < ii; i++) {
        var resource = this.resources_.get(uris[i]);
        if (!resource) { continue; }
        if (resource[name]) { return resource[name]; }
    }
    return undefined;
}


/**
 * Loads the given resources
 *  - 'uri' may be an array or string
 */
link.App.load = function(uri, callback) {
    if (typeof(uri) == 'string') { uri = [uri]; }
    // Collected needed scripts
    var needed_scripts = [];
    for (var i=0, ii=uri.length; i < ii; i++) {
        var resource = this.resources_.get(uri[i]);
        if (!resource) { continue; }
        if (resource['->requires']) { // add the requires
            if (typeof(resource['->requires']) == 'object') { needed_scripts = needed_scripts.concat(resource['->requires']); }
            else { needed_scripts.push(resource['->requires']); }
        }
        var handler = resource['->'];
        if (handler && typeof(handler) != 'function') { needed_scripts.push(handler); } // add the handler if its not yet been loaded
    }
    // Load
    link.App.require_script(needed_scripts, callback);
}

/**
 * Generates a response by evaluating the target resource
 */
link.App.handle_request = function(request, callback) {
    // Make sure the request isn't malformed
    // :TODO:
    // Find the target resource
    if (!this.resources_.containsKey(request.get_uri())) {
        return callback(new link.Response(404,"Not Found"));
    }
    var resource = this.resources_.get(request.get_uri());
    // If the handler has been set by a previous call to this function, just run it
    // (this occurs during pipes)
    if (request.handler_) {
        return request.handler_.call(resource, request, new link.Agent(), callback);
    }
    // Just a string? Redirect/alias
    if (typeof(resource) == 'string') {
        return this.handle_request(request.uri(resource), callback);
    }
    var handler = resource['->'];
    // Has a handler?
    if (!handler) {
        return callback(new link.Response(501,"Not Implemented"));
    }
    // Load first, then run
    var self = this
    link.App.load(request.get_uri(), function() {
        var resource = self.resources_.get(request.get_uri());
        var handler = resource['->'];
        if (!handler || typeof(handler) != 'function') { // must not have loaded
            return callback(new link.Response(500,"Internal Error"));
        }
        // Run through the pipe, if it exists for this or a parent resource
        var pipe = self.get_uri_config(request.get_uri(), '->pipe', true);
        if (pipe && typeof(pipe) == 'function') {
            request.handler_ = handler; // save the handler to avoid setting it up again
            pipe.call(resource, request, new link.Agent(), callback);
        } else {
            // Run direct
            handler.call(resource, request, new link.Agent(), callback);
        }
    });
}

/**
 * Provides the structure beneath the given URI
 */
link.App.get_child_uris = function(uri) {
    var child_uris = [];
    var all_uris = this.resources_.getKeys();
    for (var i=0, ii=all_uris.length; i < ii; i++) {
        if (all_uris[i].indexOf(uri) == 0) {
            child_uris.push(all_uris[i]);
        }
    }
    return child_uris;
}

/**
 * Provides the structure above the given URI
 */
link.App.get_parent_uris = function(uri) {
    var parent_uris = [];
    var uri_parts = uri.split('/');
    for (var i=uri_parts.length-1; i > 0; i--) {
        parent_uris.push(uri_parts.slice(0,i).join('/'));
    }
    return parent_uris;
}

/**
 * Loads scripts into the document, if not already loaded
 *  - 'script_srcs' may be a single string (url) or an array of strings
 *  - 'callback' is evaluated when all scripts have loaded
 */
link.App.require_script = function(script_srcs, callback) {
    // Use an array
    if (typeof(script_srcs) == 'string') { script_srcs = [script_srcs]; }
    // Collect scripts that have been loaded
    if (!link.App.require_script._loaded_scripts) {
        link.App.require_script._loaded_scripts = {}; // assume more wont be added by other means and cache the result
        var script_elems = goog.dom.getElementsByTagNameAndClass('script', null, document.head);
        for (var i=0; i < script_elems.length; i++) {
            link.App.require_script._loaded_scripts[script_elems[i].src] = script_elems[i];
        }
    }
    // Add script elems, as needed
    var script_elems = [];
    var head = goog.dom.getElement(document.head);
    for (var i=0; i < script_srcs.length; i++) {
        var script_src = script_srcs[i];
        // Skip if present
        var existing_script = link.App.require_script._loaded_scripts[script_src];
        if (existing_script) {
            if (!existing_script.loaded) { script_elems.push(existing_script); } // Watch the callback if its still loading
            continue;
        }
        // Attach element to head
        var script_elem = document.createElement('script');
        script_elem.src = script_src;
        script_elem.type = "application/javascript";
        head.appendChild(script_elem);
        // Track
        script_elem.loaded = false; // track the loaded state, in case this gets called again before its done
        script_elems.push(script_elem); // add to the script elems that we're tracking in this call
        link.App.require_script._loaded_scripts[script_src] = script_elem; // add to the script elems that we're tracking in this document
    }
    // Helper for adding the callbacks
    function add_callback(elem, fn) {
        elem.onreadystatechange = function() { // ie...
            if (elem.readyState == 'loaded' || elem.readyState == 'complete') {
                console.log(elem.src);
                elem.loaded = true;
                fn && fn(); fn = false;
            }
        };
        elem.onload = function() { // most everybody...
            console.log(elem.src);
            elem.loaded = true;
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
link.App.require_style = function(style_hrefs) {
    // Use an array
    if (typeof(style_hrefs) == 'string') { style_hrefs = [style_hrefs]; }
    // Collect styles that have been loaded
    if (!link.App.require_style._loaded_styles) {
        link.App.require_style._loaded_styles = []; // assume more wont be added by other means and cache the result
        var link_elems = goog.dom.getElementsByTagNameAndClass('link', null, document.head);
        for (var i=0; i < link_elems.length; i++) {
            if (link_elems.rel != 'stylesheet') { continue; }
            link.App.require_style._loaded_styles.push(link_elems[i].href);
        }
    }
    // Add style elems, as needed
    var head = goog.dom.getElement(document.head);
    for (var i=0; i < style_hrefs.length; i++) {
        var style_href = style_hrefs[i];
        // Skip if present
        if (link.App.require_style._loaded_styles.indexOf(style_href) != -1) {
            continue;
        }
        link.App.require_style._loaded_styles.push(style_href);
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