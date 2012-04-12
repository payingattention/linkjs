/*
App.js
==================
"Hosts" client resources

Responsibilities:
 - Manages a namespace which maps to layered resource definitions
 - Handles CONFIGURE requests, which update the namespace at runtime
 - Loads and evaluates resource definitions from remote sources
*/

goog.provide('link.App');

goog.require('link.Response');
goog.require('goog.structs.Map');
goog.require('goog.object');
goog.require('goog.Uri.QueryData');
goog.require('goog.net.XhrIo');
goog.require('goog.async.Deferred');
goog.require('goog.async.DeferredList');

//
// Initialize some app properties
//
link.App.resources_ = new goog.structs.Map();
link.App.resource_types_ = new goog.structs.Map();
link.App.document_body_agent_ = null;

/**
 * Defines a new resource type
 */
link.App.add_resource_type = function(name, def) {
    var existing = link.App.resource_types_.get(name);
    // Save new definition
    link.App.resource_types_.set(name, def);
    // If a deferred was registered, notify it of the sweet satisfaction
    if (existing && existing instanceof goog.async.Deferred) {
        existing.callback(def);
    }
};

/**
 * Configure the application namespace
 */
link.App.configure_uris = function(kvs) {
    for (var k in kvs) {
        var v = kvs[k];
        var new_res_type = v['->isa'];
        
        // Extend the old definition, if it exists
        var oldv = {};
        if (this.resources_.containsKey(k)) { oldv = this.resources_.get(k); }
        var old_res_type = oldv['->isa'];
        goog.object.extend(oldv, v);
        v = oldv;

        // Set into URI structure
        v['uri'] = k;
        this.resources_.set(k, v);

        // If the resource type has changed, instantiate the new type into this URI
        if (new_res_type != old_res_type) {
            v['__loading'] = true;
            this.instantiate_resource_into_uri(new_res_type, k);
        }
    }        
};

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
};

/**
 * Instantiate a resource type and add it to the URI
 * - If the resource type does not exist (yet) will register a callback to update the URI when the type does become available
 * - Returns a deferred
 *   - Will fire when the resource type is available
 *   - Will be fired if the resource type is already available
 */
link.App.instantiate_resource_into_uri = function(type, uri) {
    var res_type = link.App.resource_types_.get(type);
    var res_is_deferred = (res_type instanceof goog.async.Deferred)
    if (res_type && !res_is_deferred) {
        // Use a prototype chain to duplicate the definition
        var ctor = function() {};
        ctor.prototype = res_type;
        var inst = new ctor();
        
        // Extend the existing URI definition with the instance
        // (giving the existing object priority, so config remains king)
        var uri_def = {};
        if (this.resources_.containsKey(uri)) {
            uri_def = this.resources_.get(uri);
        }
        goog.object.extend(inst, uri_def);

        // And set
        inst['__loading'] = false;
        this.resources_.set(uri, inst);
        return goog.async.Deferred.succeed(inst);
    } else {
        // Not ready yet-- register a deferred for when it is
        if (!res_is_deferred) {
            res_type = new goog.async.Deferred();
        }
        res_type.addCallback(function() { link.App.instantiate_resource_into_uri(type, uri); }); // On succeed, just run this func again
        this.resource_types_.set(type, res_type);
        return res_type;
    }
};

//
// Frame agent methods
//
link.App.set_body_agent = function(agent) {
    if (this.document_body_agent_) {} // :TODO: destroy code?
    this.document_body_agent_ = agent;
};
link.App.get_body_agent = function(agent) {
    return this.document_body_agent_;
};
link.App.get_frame_agent = function(frame_element_id, parent_agent) {
    if (frame_element_id == 'document.body') { return this.document_body_agent_; }
    if (!parent_agent) { parent_agent = this.document_body_agent_; }
    // See if this parent has it
    var frame_agent = parent_agent.get_frame_agent(frame_element_id);
    if (frame_agent) { return frame_agent; }
    // If not, iterate its children
    var frame_agents = parent_agent.get_frame_agents().getValues();
    for (var i=0, ii=frame_agents.length; i < ii; i++) {
        frame_agent = this.get_frame_agent(frame_element_id, frame_agents[i]);
        if (frame_agent) { return frame_agent; }
    }
    // Not found
    return null;
};

/**
 * Generates a response by evaluating the target resource
 */
link.App.handle_request = function(request, agent, deferred) {
    // Make sure the request isn't malformed
    // :TODO:
    var request_uri = request.get_uri();

    // Resolve the target resource
    var resolved_baseuri = null, resolved_suburi = '';
    if (this.resources_.containsKey(request_uri)) {
        // complete match
        resolved_baseuri = request_uri;
    } else {
        // no complete match, march up parents
        var parent_uris = this.get_parent_uris(request_uri);
        for (var i=0; i < parent_uris.length; i++) {
            var base_uri = parent_uris[i];
            // resource exists at given uri?
            if (this.resources_.containsKey(base_uri)) {
                // for simplicity, go ahead and take this resource
                // (if we wanted to make sure a sub-uri handler matches, we'd have to load the resource before ascertaining a match)
                resolved_suburi = request_uri.slice(base_uri.length);
                resolved_baseuri = base_uri;
                break;
            }
        }
        if (resolved_baseuri === null) {
            return deferred.callback(new link.Response(404,"Not Found"));
        }
    }

    // Define the function to finish handling this function
    // (we do this in case the resource isn't loaded yet)
    var self = this;
    var finish_handling = function() {
        var resource = self.resources_.get(resolved_baseuri);
        
        // Run request processor :TODO: processorS-- build an array out of the URI stack (#, #/a, #/a/b...)
        var request_processor = self.get_uri_config(resolved_baseuri, '->request_processor', true);
        if (request_processor) {
            var should_handle = request_processor.call(resource, request, agent);
            if (!should_handle) { return; }
        }
        
        // Verify load
        var handler = resource['->'];
        if (!handler) {
            console.log('Error: Handler for "' + resolved_baseuri + '" didn\'t load.');
            return deferred.callback(new link.Response(500,"Internal Error"));
        }
        
        // Sub-URI handler
        var uri_params;
        if (!(handler instanceof Function) && typeof(handler) == 'object') {
            // sub-URI handlers, choose the first which matches the suburi
            var found=false;
            for (var pattern in handler) {
                var re = new RegExp(pattern, 'i');
                uri_params = re.exec(resolved_suburi);
                if (uri_params) {
                    handler = handler[pattern];
                    found = true;
                    break;
                }
            }
            if (!found) {
                console.log('Error: Handler for "' + resolved_baseuri + '" didn\'t have a match for suburi "' + resolved_suburi + '".');
                return deferred.callback(new link.Response(404,"Not Found"));
            }
        } else {
            // no sub-URI handlers, just call given function with the sub-URI as its uri_param
            uri_params = [resolved_suburi];
        }
        
        // Run handler
        handler.call(resource, request, uri_params, function(code, body, content_type, headers) {
            if (code && code instanceof link.Response) {
                deferred.callback(code); // valid link.Response was provided
            } else {
                // build the response
                deferred.callback((new link.Response(code)).body(body,content_type).headers(headers));
            }
        });
    };
    
    // If the resource type isn't loaded yet, finish handling this request when it does
    var resource = this.resources_.get(resolved_baseuri);
    if (resource['__loading'] && resource['->isa']) {
        this.resource_types_.get(resource['->isa']).addCallback(finish_handling);
        // :TODO: possibly register a timeout that notifies the user something went weird
    } else {
        // Resource ready, finish now
        finish_handling();
    }
};

/**
 * Provides the structure beneath the given URI
 */
link.App.get_child_uris = function(uri) {
    if (!uri) { uri = '#'; }
    var child_uris = [];
    var all_uris = this.resources_.getKeys();
    for (var i=0, ii=all_uris.length; i < ii; i++) {
        if (all_uris[i].indexOf(uri) == 0) {
            child_uris.push(all_uris[i]);
        }
    }
    return child_uris;
};

/**
 * Provides the structure beneath the given URI as an object
 */
link.App.get_uri_structure = function(uri) {
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
};

/**
 * Provides the structure above the given URI
 * e.g., '#/a/b/c' -> [ '#/a/b', '#/a', '#' ]
 */
link.App.get_parent_uris = function(uri) {
    var parent_uris = [];
    var uri_parts = uri.split('/');
    for (var i=uri_parts.length-1; i > 0; i--) {
        parent_uris.push(uri_parts.slice(0,i).join('/'));
    }
    return parent_uris;
};

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
        goog.events.listen(elem, goog.events.EventType.READYSTATECHANGE, function() { // ie...
            if (elem.readyState == 'loaded' || elem.readyState == 'complete') {
                console.log(elem.src);
                elem.loaded = true;
                fn && fn(); fn = false;
            }
        });
        goog.events.listen(elem, goog.events.EventType.LOAD, function() { // most everybody...
            console.log(elem.src);
            elem.loaded = true;
            fn && fn(); fn = false;
        });
        // :TODO: safari -- http://ajaxian.com/archives/a-technique-for-lazy-script-loading
    }
    // Setup callbacks
    if (!callback) { callback = function() { }; }
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
};

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
};