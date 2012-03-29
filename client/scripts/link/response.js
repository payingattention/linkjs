/*
Response.js
===========
An HTTP response from a ResourceService; generated by evaluating an application resource

Responsibilities:
 - Maintains headers and a body
 - Provides handling functionality
*/

goog.provide('link.Response');

goog.require('goog.structs.Map');

link.Response = function(status_code, reason_phrase) {
    this.status_code_ = status_code;
    this.reason_phrase_ = reason_phrase;
    this.headers_ = new goog.structs.Map();
    this.body_ = null;
    this.render_target_elem_ = null;
}

//
// Getters
//
link.Response.prototype.get_status_code = function() { return this.status_code_; }
link.Response.prototype.get_reason_phrase = function() { return this.reason_phrase_; }
link.Response.prototype.get_headers = function() { return this.headers_; }
link.Response.prototype.get_body = function() { return this.body_; }

//
// Builder interface
//
link.Response.prototype.headers = function(kvs) {
    this.headers_.addAll(kvs); return this;
}
link.Response.prototype.body = function(body, content_type) {
    this.body_ = body;
    this.headers_.set('content-type', content_type);
    return this;
}
link.Response.prototype.renderer = function(fn) {
    this.render = fn; return this;
}
link.Response.prototype.render_to = function(elem) {
    this.render_target_elem_ = elem; return this;
}

//
// Handling behavior
//
link.Response.prototype.render = function(agent) {
    var target_elem = this.render_target_elem_ || document.body;
    // Default behavior
    if (this.status_code_ != 200) {
        target_elem.innerHTML = '' + this.status_code_ + ' ' + this.reason_phrase_;
    } else if (this.body_) {
        target_elem.innerHTML = this.body_;
    }
}