var Link = require('../link.js');

// test modules
var Module = function(id) { this.id = id; };

describe('Mediator', function() {
    describe('#addModule', function() {
        // set up a test mediator
        var mediator = new Link.Mediator();
        mediator.addModule('#a', new Module(1));
        mediator.addModule('#a/a/a', new Module(2));
        mediator.addModule('#a/a', new Module(3));
        mediator.addModule('#a/a/b', new Module(4));
        mediator.addModule('#b', new Module(5));
        mediator.addModule('#b', new Module(6));

        // run checks
        it('should add a module to the mediator', function() {
            mediator.modules.length.should.equal(6);
        });
        it('should order by uri depth', function() {
            mediator.modules[0].id.should.equal(1);
            mediator.modules[1].id.should.equal(3);
            mediator.modules[2].id.should.equal(2);
            mediator.modules[3].id.should.equal(4);
        });
        it('should put duplicate uris after existing modules', function() {
            mediator.modules[4].id.should.equal(5);
            mediator.modules[5].id.should.equal(6);
        });
    });
    describe('#findModules', function() {
        // set up a test mediator
        var mediator = new Link.Mediator();
        mediator.addModule('#the/1st', new Module(1));
        mediator.addModule('#the/2nd', new Module(2));
        mediator.addModule('#the/3rd', new Module(3));

        // run checks
        it('should find modules by a uri regex', function() {
            var modules = mediator.findModules('#the/(.*)d');
            modules[0].should.equal('#the/2nd');
            modules[1].should.equal('#the/3rd');
        });
        it('should build keys from the regex match', function() {
            var modules = mediator.findModules('#the/(.*)d', 1);
            modules['2n'].should.equal('#the/2nd');
            modules['3r'].should.equal('#the/3rd');
        });
    });
    describe('#findHandlers', function() {
        // set up a test mediator
        var mediator = new Link.Mediator();
        mediator.addModule('#uri1', { routes: [
            { cb:'a', uri:'^/?$' },
            { cb:'b', uri:'^/?$', method:'post', accept:'text/html' },
            { cb:'c', uri:'^/uri2?$', method:'get' }
        ], a:'a', b:'b', c:'c' });
        mediator.addModule('#uri1/uri2', { routes: [
            { cb:'d', uri:'^/?$', method:'get' },
        ], d:'d' });

        // run checks
        it('should give an array of handler objects', function() {
            var m = mediator.findHandlers({ uri:'#uri1', method:'get' });
            m.length.should.equal(1);
            m[0].cb.should.equal('a');
            
            var m = mediator.findHandlers({ uri:'#uri1', method:'post', accept:'text/html' });
            m.length.should.equal(2);
            m[0].cb.should.equal('a');
            m[1].cb.should.equal('b');
        });
        it('should respect module ordering', function() {
            var m = mediator.findHandlers({ uri:'#uri1/uri2', method:'get' });
            m.length.should.equal(2);
            m[0].cb.should.equal('c');
            m[1].cb.should.equal('d');
        });
        it('should pass only on a match of all route parameters', function() {
            var m = mediator.findHandlers({ uri:'#uri1', method:'post' });
            m.length.should.equal(1);
            m[0].cb.should.equal('a');
        });
    });
    describe('#dispatch', function() {
        it('should async run the full handler chain', function(done) {
            var mediator = new Link.Mediator();
            var marker = 0;
            mediator.addModule('#uri1', {
                routes: [
                    { cb:'a', uri:'^/uri2/?$' },
                    { cb:'b', uri:'^/uri2/?$', method:'get' },
                ],
                a:function() { marker.should.equal(0); marker++; },
                b:function() { marker.should.equal(1); marker++; }
            });
            mediator.addModule('#uri1/uri2', {
                routes: [
                    { cb:'c', uri:'^/?$', method:'get' }
                ],
                c:function() { marker.should.equal(2); done(); }
            });
            mediator.dispatch({ method:'get', uri:'#uri1/uri2' });
        });
        it('should give a valid response object to the dispatcher', function(done) {
            var mediator = new Link.Mediator();
            mediator.addModule('#uri1', {
                routes: [{ cb:'a', uri:'^/?$' }],
                a:function() { return { code:200 }; }
            });
            mediator.dispatch({ uri:'#uri1' }, function(response) {
                response.should.be.ok;
                response.code.should.equal(200);
                mediator.dispatch({ uri:'#bad-uri' }, function(response) {
                    response.should.be.ok;
                    response.code.should.equal(404);
                    done();
                });
            });
        });
        it('should stall the handler chain for promises', function(done) {
            var mediator = new Link.Mediator();
            mediator.addModule('#uri1', {
                routes: [{ cb:'a', uri:'^/?$' }, { cb:'b', uri:'^/?$' }],
                a:function() {
                    var p = new Link.Promise();
                    setTimeout(function() { p.fulfill({ code:200 }); }, 5);
                    return p;
                },
                b:function(request, response) {
                    response.should.be.ok;
                    response.code.should.equal(200);
                    done();
                }
            });
            mediator.dispatch({ uri:'#uri1' });
        });
        it('should run remote requests if the uri does not start with a hash');
        it('should order capture routes FIFO, bubble routes FILO', function(done) {
            var mediator = new Link.Mediator();
            var marker = 0;
            mediator.addModule('#uri1', {
                routes: [
                    { cb:'a', uri:'^/uri2/?$', bubble:true },
                    { cb:'b', uri:'^/uri2/?$', method:'get' },
                ],
                a:function() { marker.should.equal(3); done(); },
                b:function() { marker.should.equal(0); marker++; }
            });
            mediator.addModule('#uri1/uri2', {
                routes: [
                    { cb:'c', uri:'^/?$', method:'get' },
                    { cb:'d', uri:'^/?$', method:'get', bubble:true }
                ],
                c:function() { marker.should.equal(1); marker++; },
                d:function() { marker.should.equal(2); marker++; }
            });
            mediator.dispatch({ method:'get', uri:'#uri1/uri2' });
        });
        it('should move queries into a `query` object in the request', function(done) {
            var mediator = new Link.Mediator();
            mediator.addModule('#uri', {
                routes: [
                    { cb:'a', uri:'^/?$' },
                ],
                a:function(request) {
                    request.query.should.be.ok;
                    request.query.a.should.equal('5');
                    request.query.b.should.equal('6');
                    done();
                },
            });
            mediator.dispatch({ uri:'#uri?a=5&b=6' });
        });
    });
});

