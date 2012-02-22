
var static = require('node-static')
,   nconf = require('nconf')

exports.createClientServer = function(options) {

    // Run node-static
    var file_server = new(static.Server)('./lib/client');
    var server = require('http').createServer(function (request, response) {
        request.addListener('end', function () {
            file_server.serve(request, response)
        })
    })
    server.listen(options.port, function() {
        console.log('%s v%s listening at %s', options.name, options.version, options.port)
    })
    return server
}