var Link = require('../link.js');

describe('Type Interfaces', function() {
    describe('#getTypeInterface', function() {
        it('should give the requested interface', function() {
            Link.addToType('a', { val:5 });
            var ifaceA = Link.getTypeInterface('a', 'mydata');

            ifaceA.mimetype.should.equal('a');
            ifaceA.val.should.equal(5);
            ifaceA.data.should.equal('mydata');
        });
        it('should create the interface (and its parents) if it doesnt exist', function() {
            Link.getTypeInterface('a/c+b').should.be.ok;
            Link.getTypeInterface('a/b').should.be.ok;
            Link.getTypeInterface('a').should.be.ok;
        });
        it('should use the mime parent-types for prototypes', function() {
            Link.addToType('a', { foo:5 });
            Link.addToType('a/b', { foo:10, bar:5 });
            
            var ifaceA = Link.getTypeInterface('a');
            var ifaceB = Link.getTypeInterface('a/b');
            var ifaceC = Link.getTypeInterface('a/c+b');
            
            ifaceA.foo.should.equal(5);
            ifaceB.foo.should.equal(10);
            ifaceB.bar.should.equal(5);
            ifaceC.foo.should.equal(10);
            ifaceC.bar.should.equal(5);
        });
        it('should infer defaults from the data if no mimetype is given', function() {
            Link.getTypeInterface(null, 'string').mimetype.should.equal('text/plain');
            Link.getTypeInterface(null, { a:5 }).mimetype.should.equal('js/object');
            Link.getTypeInterface(null, 1).mimetype.should.equal('js/object');
            Link.getTypeInterface(null, null).mimetype.should.equal('js/object');
        });
    });
    describe('#addToType', function() {
        it('should add properties to the interface', function() {
            Link.addToType('z', { val:5 });
            Link.getTypeInterface('z').val.should.equal(5);
        });
        it('should overwrite parent type properties', function() {
            Link.addToType('z', { val:5 });
            Link.addToType('z/y', { val:6 });
            Link.addToType('z/x+y', { val:7 });
            Link.getTypeInterface('z').val.should.equal(5);
            Link.getTypeInterface('z/y').val.should.equal(6);
            Link.getTypeInterface('z/x+y').val.should.equal(7);
        });
        it('should not overwrite existing type properties unless forced', function() {
            Link.addToType('z', { val:5 });
            Link.getTypeInterface('z').val.should.equal(5);
            Link.addToType('z', { val:100 });
            Link.getTypeInterface('z').val.should.equal(5);
            Link.addToType('z', { val:100 }, true);
            Link.getTypeInterface('z').val.should.equal(100);
        });
    });
});