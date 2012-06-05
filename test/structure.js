var Link = require('../link.js');

// test modules
var Module1 = function(id) { this.id = id; };
Module1.prototype.$get = function(request) { return { code:200 }; }
Module1.prototype.$post = function(request) { return { code:200 }; }
Module1.prototype.$delete = function(request) { return { code:200 }; }
var Module2 = function(id) { this.id = id; };
Module2.prototype.$get = function(request) { return { code:200 }; }
Module2.prototype.suburi = {};
Module2.prototype.suburi.$get = function(request) { return { code:200 }; }
Module2.prototype.suburi.subsuburi = {};
Module2.prototype.suburi.subsuburi.$get = function(request) { return { code:200 }; }

describe('Structure', function() {
    describe('#route', function() {
        it('should map the request to a handler and run it asyncronously', function(done) {
            // set up a structure
            var s = new Link.Structure();
            s.addModule('/a', new Module1(100));
            s.addModule('/b', new Module1(101));
            s.addModule('/c', new Module2(102));
            s.addModule('/c/a', new Module2(103));
            s.addModule('/c/b', new Module1(104));

            var requests = [
                { promise:s.route({ uri:'/a', method:'get' }), assert:{ code:200 } },
                { promise:s.route({ uri:'/b', method:'get' }), assert:{ code:200 } },
                { promise:s.route({ uri:'/c', method:'get' }), assert:{ code:200 } },
                { promise:s.route({ uri:'/c', method:'post' }), assert:{ code:405 } },
                { promise:s.route({ uri:'/c/suburi', method:'get' }), assert:{ code:200 } },
                { promise:s.route({ uri:'/c/suburi/subsuburi', method:'get' }), assert:{ code:200 } },
                { promise:s.route({ uri:'/c/a', method:'get' }), assert:{ code:200 } },
                { promise:s.route({ uri:'/c/a/suburi', method:'get' }), assert:{ code:200 } },
                { promise:s.route({ uri:'/c/a', method:'suburi' }), assert:{ code:405 } },
                { promise:s.route({ uri:'/c/b', method:'get' }), assert:{ code:200 } },
                { promise:s.route({ uri:'/c/b/', method:'get' }), assert:{ code:200 } }
            ];
            __testRequests(requests, done);
        });
        it('should work with hash-rooted uris', function(done) {
            // set up a structure
            var s = new Link.Structure();
            s.addModule('#', new Module1(100));
            s.addModule('#a', new Module1(100));
            s.addModule('#b', new Module1(101));
            s.addModule('#c/a', new Module2(102));

            var requests = [
                { promise:s.route({ uri:'#', method:'get' }), assert:{ code:200 } },
                { promise:s.route({ uri:'#a', method:'get' }), assert:{ code:200 } },
                { promise:s.route({ uri:'#b', method:'get' }), assert:{ code:200 } },
                { promise:s.route({ uri:'#c/a', method:'get' }), assert:{ code:200 } },
                { promise:s.route({ uri:'#c/a/suburi', method:'get' }), assert:{ code:200 } }
            ];
            __testRequests(requests, done);
        });
    });
});

var __testRequests = function(requests, done) {
    var requestCount = requests.length;
    var responseCount = 0;
    for (var i=0; i < requestCount; i++) {
        Link.Promise.when(requests[i].promise, function(response) {
            for (var k in this) {
                response[k].should.equal(this[k]);
            }
            if (++responseCount == requestCount) { done(); }
        }, requests[i].assert);
    }
};