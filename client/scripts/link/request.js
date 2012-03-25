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

link.Request = function(uri) {
    this.uri_ = uri;
    this.method_ = 'get';
    this.headers_ = new goog.structs.Map();
    this.body_ = null;
}

//
// Getters
//
link.Request.prototype.get_uri = function() { return this.uri_; }
link.Request.prototype.get_method = function() { return this.method_; }
link.Request.prototype.get_headers = function() { return this.headers_; }
link.Request.prototype.get_header = function(key) { return this.headers_.get(key); }
link.Request.prototype.get_body = function() { return this.body_; }

//
// Builder interface
//
link.Request.prototype.uri = function(uri) {
    this.uri_ = uri; return this;
}
link.Request.prototype.method = function(method) {
    this.method_ = method; return this;
}
link.Request.prototype.headers = function(kvs) {
    this.headers_.addAll(kvs); return this;
}
link.Request.prototype.body = function(body, content_type) {
    this.body_ = body;
    this.headers_.set('content-type', content_type);
    return this;
}

//
// Common requests
//
link.Request.prototype.for_javascript = function() {
    return this.method('get').headers({'accept': 'application/javascript, text/javascript'});
}
link.Request.prototype.for_json = function() {
    return this.method('get').headers({'accept': 'application/json'});
}
link.Request.prototype.for_html = function() {
    return this.method('get').headers({'accept': 'text/html'});
}

/**
 * Request properties match helper
 */
link.Request.prototype.matches = function(props) {
    for (var key in props) {
        var prop = props[key];
        if (key == 'uri' && prop != this.uri_) { return false; }
        if (key == 'method' && prop != this.method_) { return false; }
        if (key == 'accept' && this.headers_.get('accept').indexOf(prop) == -1) { return false; }
        if (this.headers_.containsKey(key) && prop != this.headers_.get(key)) { return false; }
    }
    return true;
}