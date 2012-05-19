var Link = require('../link.js');

describe('Promise', function() {
    describe('#fulfill', function() {
        it('should call all listeners', function() {
            var p = new Link.Promise();
            p.then(function(v) { v.should.equal(1); });
            p.then(function(v) { v.should.equal(1); });
            p.then(function(v) { v.should.equal(1); });
            p.fulfill(1);
        });
        it('should do nothing if already fulfilled', function() {
            var p = new Link.Promise();
            var c = 0;
            p.then(function() { c++; });
            p.fulfill('foobar');
            p.fulfill('foobaz');
            p.fulfill('fooblah');
            c.should.equal(1);
        });
    });
    describe('#then', function() {
        it('should call the listener immediately if already fulfilled', function(done) {
            var p = new Link.Promise();
            p.fulfill(1);
            p.then(function() {
                done();
            });
        });
        it('should add the listener to a queue if not yet fulfilled', function() {
            var p = new Link.Promise();
            p.then(function() {
                assert(false);
            });
        });
        it('should provide the given context', function(done) {
            var p = new Link.Promise();
            var context = { a:5 };
            p.then(function() {
                this.a.should.equal(5);
                done();
            }, context);
            p.fulfill(1);
        });
    });
    describe('#when', function() {
        it('should defer to #then if operating on a Promise', function(done) {
            var p = new Link.Promise();
            p.then = function() { done(); }
            Link.Promise.when(p);
        });
        it('should call the listener immediately if operating on a non-Promise', function(done) {
            var v = 100;
            Link.Promise.when(v, function(v) {
                v.should.equal(100);
                done();
            });
        });
    });
});