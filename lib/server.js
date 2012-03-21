var nconf = require('nconf')
,   http_proxy = require('http-proxy')

exports.createServer = function() {

    // load config
    nconf.argv().env().file({ file: 'conf.json' })
    var options = nconf.get('app')

    // create proxy server
    http_proxy.createServer(function(req, res, proxy) {
        // proxy request
        if (req.headers['x-link-dest']) {
	    req.url = req.headers['x-link-dest']
	    console.log('routing to ' + req.url)
	    proxy.proxyRequest(req, res, {
                host: require('url').parse(req.url).host
		, port: options.port
	    })
        }
        // client
        else {
	    proxy.proxyRequest(req, res, {
                host: 'localhost'
		, port: options.client_port
	    })
        }
    }).listen(options.port, function() {
        console.log(options.name + ' v' + options.version + ' listening on ' + options.port + ', serving client from ' + options.client_port)
    })
}