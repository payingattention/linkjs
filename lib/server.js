var nconf = require('nconf')
,   http_proxy = require('http-proxy')

exports.createServer = function() {

    // load config
    nconf.argv().env().file({ file: 'conf.json' })
    var options = nconf.get('app')

    // create component servers
    var name_server = require('./nameserver.js').createNameServer(nconf.get('nameserver'))
    var client_server = require('./clientserver.js').createClientServer(nconf.get('clientserver'))

    // create proxy server
    var proxy_root = nconf.get('proxyserver:rooturl')
    ,   proxy_root_len = proxy_root.length
    ,   ns_root = nconf.get('nameserver:rooturl')
    ,   ns_root_len = ns_root.length
    http_proxy.createServer(function(req, res, proxy) {
        // proxies
        if (req.url.indexOf(proxy_root) == 0) {
            var requested_url = req.url.slice(proxy_root_len) // remove root
	    ,   query = ''
	    // separate the GET query
	    if (requested_url.indexOf('?')) {
		query = requested_url.slice(requested_url.indexOf('?'))
		requested_url = requested_url.slice(0,requested_url.indexOf('?'))
	    }
	    // find target
	    console.log('req = ', requested_url, 'query = ', query)
	    var target_url = name_server.names.get(requested_url)
	    if (target_url) {
		// found, route the request
		// :TODO: add link headers
		req.url = target_url + query
		console.log('routing to ' + target_url)
		proxy.proxyRequest(req, res, {
                    host: require('url').parse(target_url).host
		    , port: 80
		})
	    } else {
		// not found, 404
		res.writeHead(404)
		res.end()
	    }
        }
        // nameserver
        else if (req.url.indexOf(ns_root) == 0) {
            req.url = req.url.slice(ns_root_len) // remove root
            proxy.proxyRequest(req, res, {
                host: 'localhost'
                , port: nconf.get('nameserver:port')
            })
        }
        // client
        else {
            proxy.proxyRequest(req, res, {
                host: 'localhost'
                , port: nconf.get('clientserver:port')
            })
        }
    }).listen(options.port, function() {
        console.log(options.name + ' v' + options.version + ' listening on ' + options.port)
    })
}