/*
ResourceService.js
==================
"Hosts" client resources

Responsibilities:
 - Manages a namespace which maps to layered resource definitions
 - Handles CONFIGURE requests, which update the namespace at runtime
 - Loads and evaluates resource definitions from remote sources
*/

goog.provide('link.ResourceService');

goog.require('link.Response');
goog.require('goog.structs.Map');
goog.require('goog.Uri.QueryData');
goog.require('goog.net.XhrIo');

link.ResourceService = function(nsdef_url, callback) {
    this.resources_ = new goog.structs.Map();
    if (nsdef_url) {
        this.load_nsdef_from_remote(nsdef_url, callback);
    }
}

/**
 * Loads the namespace definition from a remote url
 */
link.ResourceService.prototype.load_nsdef_from_remote = function(url, callback) {
    var self = this;
    // Request the nsdef
    goog.net.XhrIo.send(url, function(e) {
        var xhr = e.target;
        if (xhr.isSuccess()) {
            var nsdef = xhr.getResponseJson();
            console.log('Namespace definition retrieved:', nsdef);
            self.resources_.addAll(nsdef);
        } else {
            console.log('Failed to retrieve namespace definition from ' + url, xhr.getLastError());
        }
        callback(self);
    }, 'GET', null, { 'Accept': 'application/json' });
}

/**
 * Generates a response by evaluating the target resource
 */
link.ResourceService.prototype.handle_request = function(request, callback) {
    // Make sure the request isn't malformed
    // :TODO:
    // Handle...
    if (request.get_method() == 'CONFIGURE') {
        this.handle_configure_(request, callback);
    } else {
        // Find the target resource
        if (!this.resources_.containsKey(request.get_uri())) {
            return callback(new link.Response(404,"Not Found"));
        }
        var resource = this.resources_.get(request.get_uri());
        var agent = new link.Agent(this);
        // If the resource has been loaded, evaluate to construct the response
        if (resource.__def) {
            return resource.__def(request, agent, callback);
        }
        // Load first, then construct
        if (!resource.src) {
            return callback(new link.Response(501,"Not Implemented"));
        }
        goog.net.XhrIo.send(resource.src, function(e) {
            var xhr = e.target;
            if (xhr.isSuccess()) {
                // successful fetch...
                try {
                    // Evaluate & run function
                    resource.__def = new Function('arg_request', 'arg_agent', 'arg_callback', xhr.getResponseText());
                    resource.__def(request, agent, callback);
                } catch (except) {
                    // failed eval
                    console.log('Failed to evaluate resource "' + request.get_uri() + '" definition');
                    callback(new link.Response(500,"Internal Server Error"));
                    throw except;
                }                
            } else {
                // failed fetch
                console.log('Failed to retrieve resource "' + request.get_uri() + '" definition from ' + resource.src, xhr.getLastError());
                callback(new link.Response(501,"Not Implemented"));
            }
        }, 'GET', null, { 'Accept': 'application/javascript, text/javascript' });
    }
}

/**
 * Configures a resource according to the request
 */
link.ResourceService.prototype.handle_configure_ = function(request, callback) {
    // Get/create target resource
    if (!this.resources_.containsKey(request.get_uri())) {
        this.resources_.set(request.get_uri(), {});
    }
    var resource = this.resources_.get(request.get_uri());
    var KVs = new goog.Uri.QueryData(request.get_body());
    var keys = KVs.getKeys();
    for (var i=0; i < keys.length; i++) {
        var key = keys[i];
        resource[key] = KVs.get(key);
    }
}

/**
 * Provides the structure beneath the given URI
 */
link.ResourceService.prototype.get_child_uris = function(uri) {
    var child_uris = [];
    var all_uris = this.resources_.getKeys();
    for (var i=0, ii=all_uris.length; i < ii; i++) {
        if (all_uris[i].indexOf(uri) == 0) {
            child_uris.push(all_uris[i]);
        }
    }
    return child_uris;
}