var Link = require('../link.js');
var should = require('should');

// test modules
var Module = function(id) { this.id = id; };

describe('Structure', function() {
    describe('#addModule', function() {
        // set up a test structure
        var structure = new Link.Structure();
        structure.addModule('#a', new Module(1));
        structure.addModule('#a/a/a', new Module(2));
        structure.addModule('#a/a', new Module(3));
        structure.addModule('#a/a/b', new Module(4));
        structure.addModule('#b', new Module(5));
        structure.addModule('#b', new Module(6));

        // run checks
        it('should add a module to the structure', function() {
            structure.modules.length.should.equal(6);
        });
        it('should order by uri depth', function() {
            structure.modules[0].inst.id.should.equal(1);
            structure.modules[1].inst.id.should.equal(3);
            structure.modules[2].inst.id.should.equal(2);
            structure.modules[3].inst.id.should.equal(4);
        });
        it('should put duplicate uris after existing modules', function() {
            structure.modules[4].inst.id.should.equal(5);
            structure.modules[5].inst.id.should.equal(6);
        });
    });
    describe('#findHandler', function() {
        // set up a test structure
        var structure = new Link.Structure();
        structure.addModule('#uri1', { routes: {
            a:{ uri:'^/?$', method:'get' },
            b:{ uri:'^/?$', method:'post', accept:'text/html' },
            c:{ uri:'^/uri2?$', method:'get' }
        }, a:'a', b:'b', c:'c' });
        structure.addModule('#uri1/uri2', { routes: {
            d:{ uri:'^/?$', method:'get' },
        }, d:'d' });

        // run checks
        it('should give a handler object', function() {
            var m = structure.findHandler({ uri:'#uri1', method:'get' });
            m.should.be.ok;
            m.cb.should.equal('a');
            
            var m = structure.findHandler({ uri:'#uri1', method:'post', accept:'text/html' });
            m.should.be.ok;
            m.cb.should.equal('b');
        });
        it('should respect module ordering', function() {
            var m = structure.findHandler({ uri:'#uri1/uri2', method:'get' });
            m.should.be.ok;
            m.cb.should.equal('c');
        });
        it('should pass only on a match of all route parameters', function() {
            var m = structure.findHandler({ uri:'#uri1', method:'post' });
            should.not.exist(m);
        });
    });
    describe('#dispatch', function() {
        it('should async run handler', function(done) {
            var structure = new Link.Structure();
            var marker = 0;
            structure.addModule('#uri1', {
                routes:{ handler:{ uri:'^/uri2/?$', method:'get' }},
                handler:function() { return { code:200 }; }
            });
            structure.dispatch({ method:'get', uri:'#uri1/uri2' }).then(function(response) {
                response.should.be.ok;
                response.code.should.equal(200);
                done();
            });
        });
        it('should stall the handler chain for promises', function(done) {
            var structure = new Link.Structure();
            structure.addModule('#uri1', {
                routes:{ a:{ uri:'^/?$' }},
                a:function() {
                    var p = new Link.Promise();
                    setTimeout(function() { p.fulfill({ code:200 }); }, 5);
                    return p;
                }
            });
            structure.dispatch({ uri:'#uri1' }, function(response) {
                response.should.be.ok;
                response.code.should.equal(200);
                done();
            });
        });
        it('should run remote requests if the uri does not start with a hash');
        it('should move queries into a `query` object in the request', function(done) {
            var structure = new Link.Structure();
            structure.addModule('#uri', {
                routes:{ a:{ uri:'^/?$' }},
                a:function(request) {
                    request.query.should.be.ok;
                    request.query.a.should.equal('5');
                    request.query.b.should.equal('6');
                    done();
                },
            });
            structure.dispatch({ uri:'#uri?a=5&b=6' });
        });
        it('should run middleware, if provided', function(done) {
            var structure = new Link.Structure();
            structure.addModule('#', {
                routes:{ a:{ uri:'^/(.*)' }},
                a:function(request) {
                    this.routes.a.should.be;
                    request.foo.should.equal('bar');
                    return { code: 200 };
                },
            });
            var decorator = function(handler, request, match, structure) {
                // tests
                this.routes.a.should.be;
                structure.modules.length.should.equal(1);
                request.uri.should.equal('#test');
                match.uri[1].should.equal('test');

                // update the request, call the handler, update the response
                request.foo = 'bar';
                var response = handler.call(this, request, match, structure);
                response.reason = 'foobar';
                return response;
            };
            structure.dispatch({ uri:'#test' }, function(response) {
                response.code.should.equal(200);
                response.reason.should.equal('foobar');
                done();
            }, null, decorator);
        });
        it('should run middleware with async', function(done) {
            var structure = new Link.Structure();
            structure.addModule('#', {
                routes:{ a:{ uri:'^/?$' }},
                a:function(request) {
                    this.routes.a.should.be;
                    request.foo.should.equal('bar');

                    var p = new Link.Promise();
                    setTimeout(function() { p.fulfill({ code:200 }); }, 0);
                    return p;
                },
            });
            var decorator = function(handler, request, match, structure) {
                var ret = handler();
                Link.Promise.when(ret, function(response) {
                    response.code++;
                });
                return ret;
            };
            structure.dispatch({ uri:'#', foo:'bar' }, function(response) {
                response.code.should.equal(203);
                done();
            }, null, [decorator, decorator, decorator]);
        });
    });
});

