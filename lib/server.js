var nconf = require('nconf')
,   http_proxy = require('http-proxy')
;

exports.createServer = function() {

    // load config
    nconf.argv().env().file({ file: 'conf.json' });
    var options = nconf.get('app');

    // create proxy server
    http_proxy.createServer(function(req, res, proxy) {
        // proxy request
        if (req.headers['x-link-host']) {
            var parsed_url = require('url').parse(req.headers['x-link-host']);
            var host_port = (parsed_url.port ? parsed_url.port : 80);
	    console.log('routing ' + req.url, '; host: ' + parsed_url.hostname, 'port: ' + host_port); 
	    proxy.proxyRequest(req, res, {
                host: parsed_url.hostname
		, port: host_port
	    });
        }
        // client
        else {
	    proxy.proxyRequest(req, res, {
                host: 'localhost'
		, port: options.client_port
	    });
        }
    }).listen(options.port, function() {
        console.log(options.name + ' v' + options.version + ' listening on ' + options.port + ', serving client from ' + options.client_port)
    });
};