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
    describe('#dispatch', function() {
        it('should async run the full handler chain', function(done) {
            var structure = new Link.Structure();
            var marker = 0;
            structure.addModule('/uri1', {
                routes:[
                    Link.route('a', { uri:'^/uri2/?$' }),
                    Link.route('b', { uri:'^/uri2/?$', method:'get' })
                ],
                a:function() { marker.should.equal(0); marker++; },
                b:function() { marker.should.equal(1); marker++; }
            });
            structure.addModule('/uri1/uri2', {
                routes:[
                    Link.route('c', { uri:'^/?$', method:'get' })
                ],
                c:function() { marker.should.equal(2); done(); }
            });
            structure.dispatch({ method:'get', uri:'/uri1/uri2' });
        });
        it('should give a valid response object to the dispatcher', function(done) {
            var structure = new Link.Structure();
            structure.addModule('/uri1', {
                routes:[ Link.route('a', { uri:'^/?$' }) ],
                a:function() { return Link.response(200); }
            });
            structure.dispatch({ uri:'/uri1' }, function(response) {
                response.should.be.ok;
                response.code.should.equal(200);
                structure.dispatch({ uri:'/bad-uri' }, function(response) {
                    response.should.be.ok;
                    response.code.should.equal(404);
                    done();
                });
            });            
        });
        it('should stall the handler chain for promises', function(done) {
            var structure = new Link.Structure();
            structure.addModule('/uri1', {
                routes:[ Link.route('a', { uri:'^/?$' }) ],
                a:function() {
                    var p = new Link.Promise();
                    setTimeout(function() { p.fulfill({ code:200 }); }, 5);
                    return p;
                }
            });
            structure.dispatch({ uri:'/uri1' }, function(response) {
                response.should.be.ok;
                response.code.should.equal(200);
                done();
            });
        });
        it('should run remote requests if the uri does not start with a hash');
        it('should order capture routes FIFO, bubble routes FILO', function(done) {
            var structure = new Link.Structure();
            var marker = 0;
            structure.addModule('/uri1', {
                routes:[
                    Link.route('a', { uri:'^/uri2/?$' }, true),
                    Link.route('b', { uri:'^/uri2/?$', method:'get' }),
                ],
                a:function() { marker.should.equal(3); done(); },
                b:function() { marker.should.equal(0); marker++; }
            });
            structure.addModule('/uri1/uri2', {
                routes:[
                    Link.route('c', { uri:'^/?$', method:'get' }),
                    Link.route('d', { uri:'^/?$', method:'get' }, true),
                ],
                c:function() { marker.should.equal(1); marker++; },
                d:function() { marker.should.equal(2); marker++; }
            });
            structure.dispatch({ method:'get', uri:'/uri1/uri2' });
        });
        it('should move queries into a `query` object in the request', function(done) {
            var structure = new Link.Structure();
            structure.addModule('/uri', {
                routes:[ Link.route('a', { uri:'^/?$' }) ],
                a:function(request) {
                    request.query.should.be.ok;
                    request.query.a.should.equal('5');
                    request.query.b.should.equal('6');
                    done();
                },
            });
            structure.dispatch({ uri:'/uri?a=5&b=6' });
        });
    });
});

