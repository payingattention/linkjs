var restify = require('restify')
,   nconf = require('nconf')

exports.createNameServer = function(options) {


    // :NOTE: restify currently sanitizes the trailing slash in request URLs (/lib/request.js:28)
    // a pull request to make that optional is coming; in the mean time, this server requires that restify's request.js:28-29 are commented out
    

    // Create the server
    var server = restify.createServer({
        name: options.name,
        version: options.version
    })
    server.config = nconf
    server.use(restify.acceptParser(server.acceptable)); // Parses accept header for formatters to use
    server.use(restify.authorizationParser()); // Parses auth header into req object
    //server.use(restify.dateParser()); :TODO: needed? // Parses date header
    server.use(restify.queryParser()); // Parses URL query into req.query & req.params
    server.use(restify.bodyParser()); // Provides request body as a parsed object
    /*server.use(restify.throttle({ :TODO: do this later // Connection throttling with a token bucket algorithm
        burst: 100,
        rate: 50,
        ip: true,
        overrides: {
            '192.168.1.1': {
                rate: 0,        // unlimited
                burst: 0
            }
        }
    }));*/
    //server.use(restify.conditionalRequest()); :TODO: do this later // Provides support for partial responses
    
    // Load the names manager
    server.names = new (require('./nameserver/manager').NamesManager)()

    // Attach server data to request
    server.use(function(req, res, next) {
        req.names = server.names
        req.options = options
        next()
    })

    // :DEBUG: populate the names manager
    server.names.set('/bin')
    server.names.set('/bin/explorer', 'http://localhost/_scripts/explorer.js')
    server.names.set('/bin/switchboard', 'http://localhost/_scripts/switchboard.js')
    server.names.set('/ui')
    server.names.set('/ui/dlg', 'http://localhost/_scripts/ui/dlg.js')
//    server.names.set('/env/helloworld', 'http://localhost/scripts/helloworld.js')
//    server.names.set('/env/forecast', 'http://localhost/scripts/forecast.js')
//    server.names.set('/services')
//    server.names.set('/services/weatherbug')
//    server.names.set('/services/weatherbug/daily-forecast', 'http://i.wxbug.net/REST/Direct/GetForecast.ashx')

    // Register routes & handlers
    var routes = require('./nameserver/routes')
    server.head({path: /(.*[^\/])$/, version: options.version}, routes.elem_head)
    server.put({path: /(.*[^\/])$/, version: options.version}, routes.elem_put)
    server.del({path: /(.*[^\/])$/, version: options.version}, routes.elem_delete)
    server.head({path: /(.*)\/$/, version: options.version}, routes.col_head)
    server.post({path: /(.*)\/$/, version: options.version}, routes.col_post)

    // Start handling requests
    server.listen(options.port, function() {
        console.log('%s v%s listening at %s', server.name, options.version, server.url)
    })

    return server
}