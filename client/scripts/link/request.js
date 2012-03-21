/*
Request.js
==========
An HTTP request to a specific ResourceService

Responsibilities:
 - Provides a simple interface to build/modify a request
 - Maintains headers and a body
 - References the target resource service
*/

goog.provide('link.Request');

goog.require('goog.structs.Map');

link.Request = function(url) {
    this.url = url;
    this.body = null;
    this.method = 'get';
    this.headers = new goog.structs.Map();
}

//
// Chainable interface
//
link.Request.prototype.url = function(url) {
    this.url = url; return this;
}
link.Request.prototype.method = function(method) {
    this.method = method; return this;
}
link.Request.prototype.headers = function(kvs) {
    this.headers.addAll(kvs); return this;
}
link.Request.prototype.body = function(body, content_type) {
    this.body = body;
    this.headers.set('content-type', content_type);
    return this;
}

//
// Common requests
//
link.Request.prototype.for_javascript = function() {
    return this.method('get').headers({'accept': 'application/javascript, text/javascript'});
}
link.Request.prototype.for_html = function() {
    return this.method('get').headers({'accept': 'text/html'});
}