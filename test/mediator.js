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
    describe('#findResources', function() {
        // set up a test mediator
        var mediator = new Link.Mediator();
        mediator.addModule('#the/1st', {
            resources: { '/':1 }
        });
        mediator.addModule('#the/2nd', {
            resources: { '/':1, '/sub1':1, '/sub2':1, '/sub/sub':1 }
        });
        mediator.addModule('#the/3rd',  {
            resources: { '/':1, '/sub3':1, '/sub4':1 }
        });
        mediator.addModule('#', {
            resources: { '/the/4th/sub5':1 }
        });

        // run checks
        it('should find resources by a uri regex', function() {
            var resources = mediator.findResources('#the/(.*)d$');
            resources[0].should.equal('#the/2nd');
            resources[1].should.equal('#the/3rd');

            var resources = mediator.findResources('#the/([^/]+)/sub.*');
            resources[0].should.equal('#the/4th/sub5'); // first because module is at a lower URI
            resources[1].should.equal('#the/2nd/sub1');
            resources[2].should.equal('#the/2nd/sub2');
            resources[3].should.equal('#the/2nd/sub/sub');
            resources[4].should.equal('#the/3rd/sub3');
            resources[5].should.equal('#the/3rd/sub4');
        });
        it('should build keys from the regex match', function() {
            var resources = mediator.findResources('#the/(.*)d$', 1);
            resources['2n'].should.equal('#the/2nd');
            resources['3r'].should.equal('#the/3rd');
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
                routes:[
                    { cb:'a', uri:'^/uri2/?$' },
                    { cb:'b', uri:'^/uri2/?$', method:'get' },
                ],
                a:function() { marker.should.equal(0); marker++; },
                b:function() { marker.should.equal(1); marker++; }
            });
            mediator.addModule('#uri1/uri2', {
                routes:[
                    { cb:'c', uri:'^/?$', method:'get' }
                ],
                c:function() { marker.should.equal(2); done(); }
            });
            mediator.dispatch({ method:'get', uri:'#uri1/uri2' });
        });
        it('should give a valid response object to the dispatcher', function(done) {
            var mediator = new Link.Mediator();
            mediator.addModule('#uri1', {
                routes:[{ cb:'a', uri:'^/?$' }],
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
        it('should run resource and method validation', function(done) {
            var mediator = new Link.Mediator();
            mediator.addModule('#uri', {
                routes:[{ cb:'give200', uri:'^/a/?$' }, { cb:'give200', uri:'^/b/?$' }],
                resources:{
                    '/a':{ asserts:function(request) { throw { code:503, reason:'not available' }; }},
                    '/b':{ _post:{ asserts:function(request) { throw { code:503, reason:'not available' }; }}}
                },
                give200:function() { return { code:200 }; }
            });
            // test resource validation
            mediator.dispatch({ uri:'#uri/a' }, function(response) {
                response.should.be.ok;
                response.code.should.equal(503);
                response.reason.should.equal('not available');
                // test for unvalidated method
                mediator.dispatch({ uri:'#uri/b', method:'get' }, function(response) {
                    response.should.be.ok;
                    response.code.should.equal(200);
                    // test for validated method
                    mediator.dispatch({ uri:'#uri/b', method:'post' }, function(response) {
                        response.should.be.ok;
                        response.code.should.equal(503);
                        done();
                    });
                });
            });
        });
        it('should stall the handler chain for promises', function(done) {
            var mediator = new Link.Mediator();
            mediator.addModule('#uri1', {
                routes:[{ cb:'a', uri:'^/?$' }, { cb:'b', uri:'^/?$' }],
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
                routes:[
                    { cb:'a', uri:'^/uri2/?$', bubble:true },
                    { cb:'b', uri:'^/uri2/?$', method:'get' },
                ],
                a:function() { marker.should.equal(3); done(); },
                b:function() { marker.should.equal(0); marker++; }
            });
            mediator.addModule('#uri1/uri2', {
                routes:[
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
                routes:[
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

