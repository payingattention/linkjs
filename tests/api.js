
// Nameserver Web API Test Suite
// =============================
// :NOTE: uses node unit

var restify = require('restify')
,   nconf = require('nconf')

// configure
nconf.argv().env().file({ file: 'conf.json' })
var config = nconf.get('nameserver')
config.port = 8081

// helpers
var tests_run = 0
,   tests_expected = 0
var server = null
function new_request() {
    // helper to create a new request
    return restify.createJsonClient({
        url: 'http://localhost:'+config.port,
        version: '*'
    })
}
function parse_headerlink(lh) {
    // helper to break the link header into an object
    if (!lh) { return null }
    var entries = lh.split(',') // Split on expect '<entry>, <entry>,'...
    ,   params // param list for an entry
    ,   kv // key-value for a param
    ,   obj = {} // result object
    ,   entry // an entry in the header
    ,   i, ii
    ,   j, jj
    for (i=0, ii=entries.length; i < ii; i++) {
        entry = {}
        params = entries[i].split(';') // Split on expect '<entry_param>; <entry_param>;'...
        for (j=0, jj=params.length; j < jj; j++) {
            if (j == 0) { // first entry, expect href (no key)
                entry.href = params[j].trim()
            } else {
                kv = params[j].split('=') // split on expect '<key>=<val>'
                entry[kv[0].trim()] = kv[1].trim()
            }
        }
        obj[entry.title || entry.href] = entry
    }
    return obj
}

exports.setUp = function(done) {
    if (tests_run == 0) {
        // global init
        console.log('Starting up server')
        server = require('../lib/nameserver').createNameServer(config)
        // build the defined names
        server.names.set('/a', 'http://a.webservice.com/api')
        server.names.set('/a/ac')
        server.names.set('/b', 'http://b.webservice.com/api')
        server.names.set('/c', 'http://c.webservice.com/api')
        server.names.set('/cb')
        // add cached subnames to emulate previous syncs
        server.names.set_cache('/a', { aa: true, ab: { aba: true } })
        server.names.set_cache('/b', { ba: true })
        server.names.set_cache('/c', { ca: true })
    }
    tests_run++
    done()
}
exports.tearDown = function(done) {
    if (tests_run == tests_expected) {
        // global deinit
        console.log('Shutting down server')
        server.close()
    }
    done()
}

exports["Test Helpers"] = {
    "#parse_headerlink": function(test) {
        var obj = parse_headerlink('<a>; rel="rela"; title="Title A", <b>; rel="relb"; title="Title B"')
        test.ok(obj['"Title A"'])
        test.equal(obj['"Title A"'].href, '<a>')
        test.equal(obj['"Title A"'].rel, '"rela"')
        test.equal(obj['"Title A"'].title, '"Title A"')
        test.ok(obj['"Title B"'])
        test.equal(obj['"Title B"'].href, '<b>')
        test.equal(obj['"Title B"'].rel, '"relb"')
        test.equal(obj['"Title B"'].title, '"Title B"')
        test.done()
        //===
    }
}

exports["Names Manager"] = {
    setUp: function(done) {
        this.nm = new (require('../lib/nameserver/manager').NamesManager)()
        this.nm.values = { '/a': '1', '/b/a': '2.1', '/b/a/a': '2.1.1', '/c': '3' }
        this.nm.cached_values = { '/a/a': '1.1', '/a/b': '1.2' }
        done()
    }
    , tearDown: function(done) {
        done()
    }
    , "#get gives a defined name's value": function(test) {
        test.equal(this.nm.get('/a'), '1')
        test.equal(this.nm.get('/b/a'), '2.1')
        test.equal(this.nm.get('/b/a/a'), '2.1.1')
        test.done()
        //===
    }
    , "#get gives a cached name's value": function(test) {
        test.equal(this.nm.get('/a/a'), '1.1')
        test.equal(this.nm.get('/a/b'), '1.2')
        test.done()
        //===
    }
    , "#get calculates an undefined name from the nearest defined parent and caches the result": function(test) {
        test.equal(this.nm.get('/b/a/b'), '2.1/b')
        test.equal(this.nm.get('/a/c/a'), '1/c/a')
        test.equal(this.nm.get('/d/a/a'), null)
        test.equal(this.nm.cached_values['/b/a/b'], '2.1/b')
        test.equal(this.nm.cached_values['/a/c/a'], '1/c/a')
        test.done()
        //===
    }
    , "#del removes a defined name and any child names, including cached names": function(test) {
        this.nm.set('/deleteme','val')
        this.nm.set('/deletemejustkidding','val')
        this.nm.del('/deleteme')
        test.equal(this.nm.get('/deleteme'), null)
        test.equal(this.nm.get('/deletemejustkidding'), 'val')
        this.nm.set('/deleteme', 'val')
        this.nm.set('/deleteme/child1', 'val')
        this.nm.set('/deleteme/child2', 'val')
        this.nm.set('/deleteme/child2/child2a', 'val')
        this.nm.set('/deleteme/child3', 'val')
        this.nm.del('/deleteme')
        test.equal(this.nm.get('/deleteme'), null)
        test.equal(this.nm.get('/deleteme/child1'), null)
        test.equal(this.nm.get('/deleteme/child2'), null)
        test.equal(this.nm.get('/deleteme/child2/child2a'), null)
        test.equal(this.nm.get('/deleteme/child3'), null)
        this.nm.del('/a/a')
        test.equal(this.nm.cached_values['/a/a'], null)
        test.done()
        //===
    }
    , "#get_children gets a list of all children 1 level beneath": function(test) {
        this.nm.values = { '/a': '1', '/a/a': '1.1', '/a/b': '1.2', '/a/a/a': '1.1.1' }
        this.nm.cached_values = { '/a/c': '1.3', '/a/a/b': '1.1.2' }
        var children = this.nm.get_children('/a')
        test.deepEqual(children, ['/a/a', '/a/b', '/a/c'])
        test.done()
        //===
    }
    , "#set_cache adds cache names from the given structure": function(test) {
        this.nm.cached_values = {}
        this.nm.set_cache('/c', { a: true, b: { a: true }, c: true })
        test.equal(this.nm.cached_values['/c/a'], '3/a')
        test.equal(this.nm.cached_values['/c/b'], '3/b')
        test.equal(this.nm.cached_values['/c/b/a'], '3/b/a')
        test.equal(this.nm.cached_values['/c/c'], '3/c')
        test.done()
        //===
    }
}

exports["Element HEAD"] = {
    setUp: function(done) {
	done()
    }
    , tearDown: function(done) {
	done()
    }
    , "A defined name gives the content-location header": function(test) {
	var client = new_request()
        client.head('/a', function(err, req, res) {
            test.ifError(err)
            test.equal(res.headers['content-location'], 'http://a.webservice.com/api')
	    test.done()
            //===
        })
        //---
    }
    , "A cached name (from a previous infer) gives the content-location header and a root link header": function(test) {
	var client = new_request()
        client.head('/a/aa', function(err, req, res) {
            test.ifError(err)
            test.equal(res.headers['content-location'], 'http://a.webservice.com/api/aa')
            test.deepEqual(parse_headerlink(res.headers['link']), {
                '"/a"': {
                    href: '</a>'
                    , rel: '"ns-root"'
                    , title: '"/a"'
                }
            })
	    test.done()
            //===
        })
        //---
    }
    , "An inferred name (undefined, but parent is defined) gives the content-location header and a root link header; the server caches the name": function(test) {
	var client = new_request()
        client.head('/a/ad', function(err, req, res) {
            test.ifError(err)
            test.equal(res.headers['content-location'], 'http://a.webservice.com/api/ad')
            test.deepEqual(parse_headerlink(res.headers['link']), {
                '"/a"': {
                    href: '</a>'
                    , rel: '"ns-root"'
                    , title: '"/a"'
                }
            })
            test.equal(server.names.cached_values['/a/ad'], 'http://a.webservice.com/api/ad')
	    test.done()
            //===
        })
        //---
    }
    , "An valueless name returns an empty content-location header": function(test) {
	var client = new_request()
        client.head('/a/ac', function(err, req, res) {
            test.ifError(err)
            test.equal(res.headers['content-location'], false)
	    test.done()
            //===
        })
        //---
    }
    , "404 is given for a parentless, non-existant route": function(test) {
	var client = new_request()
        client.head('/not/found', function(err, req, res) {
            test.ok(err)
            test.equal(res.statusCode, 404)
	    test.done()
            //===
        })
        //---
    }
}

exports["Element GET"] = {
    setUp: function(done) {
	done()
    }
    , tearDown: function(done) {
	done()
    }
    , "405 Not Allowed": function(test) {
	var client = new_request()
        client.get('/a', function(err, req, res, obj) {
            test.ok(err)
            test.equal(res.statusCode, 405)
	    test.done()
            //===
        })
        //---
    }
}

exports["Element PUT"] = {
    setUp: function(done) {
	done()
    }
    , tearDown: function(done) {
	done()
    }
    , "Creates name with value when not previously defined": function(test) {
	var client = new_request()
        client.put('/b/bb', { 'url': 'http://bb.webservice.com/api' }, function(err, req, res, obj) {
            test.ifError(err)
            test.equal(server.names.get('/b/bb'), 'http://bb.webservice.com/api')
	    test.done()
            //===
        })
        //---
    }
    , "Changes name value when previously defined": function(test) {
	var client = new_request()
        client.put('/b/bb', { 'url': 'http://bb.webservice.com/api2' }, function(err, req, res, obj) {
            test.ifError(err)
            test.equal(server.names.get('/b/bb'), 'http://bb.webservice.com/api2')
	    test.done()
            //===
        })
        //---
    }
    , "Allows valueless set (name only)": function(test) {
	var client = new_request()
        client.put('/b/bc', {}, function(err, req, res, obj) {
            test.ifError(err)
            test.equal(server.names.get('/b/bc'), '')
	    test.done()
            //===
        })
        //---
    }
    , "Automatically defines non-existant parents as valueless names": function(test) {
	var client = new_request()
        client.put('/b/bd/bda', { 'url': 'http://bda.webservice.com/api' }, function(err, req, res, obj) {
            test.ifError(err)
            test.equal(server.names.get('/b/bd/bda'), 'http://bda.webservice.com/api')
            test.equal(server.names.get('/b/bd'), '')
	    test.done()
            //===
        })
        //---
    }
}

exports["Element POST"] = {
    setUp: function(done) {
	done()
    }
    , tearDown: function(done) {
	done()
    }
    , "405 Not Allowed": function(test) {
	var client = new_request()
        client.post('/a', { 'url': 'http://c.webservice.com/api' }, function(err, req, res, obj) {
            test.ok(err)
            test.equal(res.statusCode, 405)
	    test.done()
            //===
        })
        //---
    }
}

exports["Element DELETE"] = {
    setUp: function(done) {
	done()
    }
    , tearDown: function(done) {
	done()
    }
    , "Removes a defined name": function(test) {
	var client = new_request()
        server.names.set('/z', 'value')
        client.del('/z', function(err, req, res) {
            test.ifError(err)
            test.equal(server.names.get('/z'), null)
	    test.done()
            //===
        })
        //---
    }
    , "Removes defined child names": function(test) {
	var client = new_request()
        server.names.set('/z', 'value')
        server.names.set('/z/zz', 'value')
        client.del('/z', function(err, req, res) {
            test.ifError(err)
            test.equal(server.names.get('/z'), null)
            test.equal(server.names.get('/z/zz'), null)
	    test.done()
            //===
        })
        //---
    }
    , "Removes cached names": function(test) {
	var client = new_request()
        server.names.set_cache('/a', { af: 'a' })
        client.del('/a/af', function(err, req, res) {
            test.ifError(err)
            test.equal(server.names.cached_values['/a/af'], undefined)
	    test.done()
            //===
        })
        //---
    }
    , "Gives 200 for inferrable names, but has no effect": function(test) {
	var client = new_request()
        server.names.set_cache('/a', { af: 'a' })
        client.del('/a/ag', function(err, req, res) {
            test.ifError(err)
	    test.done()
            //===
        })
        //---
    }
    , "Gives a 404 for parentless, non-existant names": function(test) {
	var client = new_request()
        client.del('/not/found', function(err, req, res) {
            test.ok(err)
            test.equal(res.statusCode, 404)
	    test.done()
            //===
        })
        //---
    }
}

exports["Collection HEAD"] = {
    setUp: function(done) {
	done()
    }
    , tearDown: function(done) {
	done()
    }
    , "A defined name gives the content-location header and child links": function(test) {
	var client = new_request()
        client.head('/a/', function(err, req, res) {
            test.ifError(err)
            test.equal(res.headers['content-location'], 'http://a.webservice.com/api')
            var links = parse_headerlink(res.headers['link'])
            test.deepEqual(links['"/a/aa"'], {
                href: '<http://a.webservice.com/api/aa>'
                , rel: '"ns-child"'
                , title: '"/a/aa"'
            })
            test.deepEqual(links['"/a/ab"'], {
                href: '<http://a.webservice.com/api/ab>'
                , rel: '"ns-child"'
                , title: '"/a/ab"'
            })
            test.deepEqual(links['"/a/ac"'], {
                href: '<>' // bound to nothing
                , rel: '"ns-child"'
                , title: '"/a/ac"'
            })
	    test.done()
            //===
        })
        //---
    }
    , "A cached name (from a previous infer) gives the content-location header and the root link header": function(test) {
	var client = new_request()
        client.head('/a/aa/', function(err, req, res) {
            test.ifError(err)
            test.equal(res.headers['content-location'], 'http://a.webservice.com/api/aa')
            var links = parse_headerlink(res.headers['link'])
            test.deepEqual(links, {
                '"/a"': {
                    href: '</a>'
                    , rel: '"ns-root"'
                    , title: '"/a"'
                }
            })
            test.equal(server.names.cached_values['/a/aa'], 'http://a.webservice.com/api/aa')
	    test.done()
            //===
        })
        //---
    }
    , "An inferred name (undefined, but a defined parent) gives the content-location header and the root link header; the server caches the name": function(test) {
	var client = new_request()
        client.head('/a/ae/', function(err, req, res) {
            test.ifError(err)
            test.equal(res.headers['content-location'], 'http://a.webservice.com/api/ae')
            var links = parse_headerlink(res.headers['link'])
            test.deepEqual(links, {
                '"/a"': {
                    href: '</a>'
                    , rel: '"ns-root"'
                    , title: '"/a"'
                }
            })
            test.equal(server.names.cached_values['/a/ae'], 'http://a.webservice.com/api/ae')
	    test.done()
            //===
        })
        //---
    }
    , "An valueless name gives a blank content-location header": function(test) {
	var client = new_request()
        client.head('/a/ac/', function(err, req, res) {
            test.ifError(err)
            test.equal(res.headers['content-location'], '')
            test.equal(res.headers['link'], false)
	    test.done()
            //===
        })
        //---
    }
    , "A 404 is given for a parentless, non-existant route": function(test) {
	var client = new_request()
        client.head('/not/found/', function(err, req, res) {
            test.ok(err)
            test.equal(res.statusCode, 404)
	    test.done()
            //===
        })
        //---
    }
}

exports["Collection GET"] = {
    setUp: function(done) {
	done()
    }
    , tearDown: function(done) {
	done()
    }
    , "405 Not Allowed": function(test) {
	var client = new_request()
        client.get('/a/', function(err, req, res, obj) {
            test.ok(err)
            test.equal(res.statusCode, 405)
	    test.done()
            //===
        })
        //---
    }
}

exports["Collection PUT"] = {
    setUp: function(done) {
	done()
    }
    , tearDown: function(done) {
	done()
    }
    , "405 Not Allowed": function(test) {
	var client = new_request()
        client.put('/z/', { 'url': 'http://z.webservice.com/api' }, function(err, req, res, obj) {
            test.ok(err)
            test.equal(res.statusCode, 405)
	    test.done()
            //===
        })
        //---
    }
}

exports["Collection POST"] = {
    setUp: function(done) {
	done()
    }
    , tearDown: function(done) {
	done()
    }
    , "Creates a name with the value & gives the new name in the location header": function(test) {
	var client = new_request()
        client.post('/b/bb/', { 'url': 'http://bbx.webservice.com/api' }, function(err, req, res, obj) {
            test.ifError(err)
            test.equal(server.names.get(res.headers['location']), 'http://bbx.webservice.com/api')
	    test.done()
            //===
        })
        //---
    }
    , "When no value is given, creates a name with an empty value & gives the new name in the location header": function(test) {
	var client = new_request()
        client.post('/b/bb/', {}, function(err, req, res, obj) {
            test.ifError(err)
            test.equal(server.names.get(res.headers['location']), '')
	    test.done()
            //===
        })
        //---
    }
    , "Automatically creates parents that dont exist": function(test) {
	var client = new_request()
        client.post('/b/be/', { 'url': 'http://bex.webservice.com/api' }, function(err, req, res, obj) {
            test.ifError(err)
            test.equal(server.names.get(res.headers['location']), 'http://bex.webservice.com/api')
	    test.done()
            //===
        })
        //---
    }
}

exports["Collection DELETE"] = {
    setUp: function(done) {
	done()
    }
    , tearDown: function(done) {
	done()
    }
    , "405 Not Allowed": function(test) {
	var client = new_request()
        client.del('/z/', function(err, req, res) {
            test.ok(err)
            test.equal(res.statusCode, 405)
	    test.done()
            //===
        })
        //---
    }
}

function count_functions(obj) {
    var count=0
    var props = Object.getOwnPropertyNames(obj)
    for (var i in props) {
        k = props[i]
        if (typeof(obj[k]) == 'function' && k != 'setUp' && k != 'tearDown') {
            count++
        } else if (typeof(obj[k]) == 'object') {
            count += count_functions(obj[k])
        }
    }
    return count
}
tests_expected = count_functions(exports)
console.log('Expecting to run ' + tests_expected + ' tests')