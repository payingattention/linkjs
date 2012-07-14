var Link = require('../link.js');
var should = require('should');

// test modules
var Module = function(id) { this.id = id; };

describe('En/Decoding', function() {
    describe('#encodeType', function() {
        // add encoders
        Link.setTypeEncoder('foo', function(obj) {
            return ''+obj.foo;
        });
        Link.setTypeEncoder('foo/bar', function(obj) {
            return ''+obj.foo+obj.bar;
        });
        Link.setTypeEncoder('foo/baz+bar', function(obj) {
            return ''+obj.foo+obj.bar+obj.baz;
        });

        // run checks
        it('should encode according to the best type available', function() {
            var obj = { foo:'a', bar:'b', baz:'c' };
            Link.encodeType(obj, 'foo').should.equal('a');
            Link.encodeType(obj, 'foo/bar').should.equal('ab');
            Link.encodeType(obj, 'foo/baz+bar').should.equal('abc');
            Link.encodeType(obj, 'foo/blah+bar').should.equal('ab');
            Link.encodeType(obj, 'foo/blah').should.equal('a');
        });
    });
    describe('#decodeType', function() {
        // add decoders
        Link.setTypeDecoder('foo', function(str) {
            return { foo:str[0] }
        });
        Link.setTypeDecoder('foo/bar', function(str) {
            return { foo:str[0], bar:str[1] };
        });
        Link.setTypeDecoder('foo/baz+bar', function(str) {
            return { foo:str[0], bar:str[1], baz:str[2] };
        });

        // run checks
        it('should encode according to the best type available', function() {
            var str = 'abc';
            Link.decodeType(str, 'foo').foo.should.equal('a');
            Link.decodeType(str, 'foo/bar').bar.should.equal('b');
            Link.decodeType(str, 'foo/baz+bar').baz.should.equal('c');
            Link.decodeType(str, 'foo/blah+bar').bar.should.equal('b');
            Link.decodeType(str, 'foo/blah').foo.should.equal('a');
        });
    });
});
