/*
Request.js
==========
A ResourceService request builder

Responsibilities:
 - Provides a simple interface to build/modify a request
 - Maintains headers and a body
*/

goog.provide('link.Request');

goog.require('goog.structs.Map');
goog.require('goog.Uri');
goog.require('goog.Uri.QueryData');

link.Request = function(uri) {
    // Set up attribute defaults
    this.uri_ = uri;
    this.method_ = 'get';
    this.headers_ = new goog.structs.Map();
    this.uri_params_ = new goog.structs.Map();
    this.body_ = null;
};

//
// Getters
//
link.Request.prototype.build_uri_from_params = function() {
    var uri = this.uri_;
    // Do any param replacements
    if (!this.uri_params_.isEmpty()) {
        var keys = this.uri_params_.getKeys();
        for (var i=0; i < keys.length; i++) {
            uri = uri.replace('{{'+keys[i]+'}}', this.uri_params_.get(keys[i]));
        }
    }
    return uri;
};
link.Request.prototype.get_uri = function() {
    var uri = this.build_uri_from_params();
    // Try to remove everything before the hash
    var cur_uri = new String(window.location); cur_uri = cur_uri.substr(0, cur_uri.indexOf('#'));
    uri = uri.replace(cur_uri, '');
    // If it is a local URI, remove any query params
    if (uri.charAt(0) == '#') { uri = '#' + (new goog.Uri(uri.substr(1))).getPath(); }
    return uri;
};
link.Request.prototype.get_query = function() {
    var uri = this.build_uri_from_params();
    if (uri.charAt(0) == '#') { uri = uri.substr(1); }
    return (new goog.Uri(uri)).getQueryData();
};
link.Request.prototype.get_method = function() { return this.method_; };
link.Request.prototype.get_headers = function() { return this.headers_; };
link.Request.prototype.get_header = function(key) { return this.headers_.get(key); };
link.Request.prototype.get_body = function() { return this.body_; };

//
// Builder interface
//
link.Request.prototype.uri = function(uri) {
    this.uri_ = uri; return this;
};
link.Request.prototype.method = function(method) {
    this.method_ = method; return this;
};
link.Request.prototype.header = function(k, v) {
    this.headers_.set(k, v); return this;
};
link.Request.prototype.headers = function(kvs) {
    this.headers_.addAll(kvs); return this;
};
link.Request.prototype.uri_param = function(k, v) {
    this.uri_params_.set(k, v); return this;
};
link.Request.prototype.uri_params = function(kvs) {
    this.uri_params_.addAll(kvs); return this;
};
link.Request.prototype.body = function(body, content_type) {
    this.body_ = body;
    this.headers_.set('content-type', content_type);
    return this;
};

//
// Common requests
//
link.Request.prototype.for_javascript = function() {
    return this.method('get').headers({'accept': 'application/javascript, text/javascript'});
};
link.Request.prototype.for_json = function() {
    return this.method('get').headers({'accept': 'application/json'});
};
link.Request.prototype.for_html = function() {
    return this.method('get').headers({'accept': 'text/html'});
};

/**
 * Request properties match helper
 */
link.Request.prototype.matches = function(props) {
    for (var key in props) {
        var prop = props[key];
        if (key == 'uri' && prop != this.uri_) { return false; }
        if (key == 'method' && prop != this.method_) { return false; }
        if (key == 'accept' && this.headers_.containsKey('accept') && this.headers_.get('accept').indexOf(prop) == -1) { return false; }
        if (this.headers_.containsKey(key) && prop != this.headers_.get(key)) { return false; }
    }
    return true;
};