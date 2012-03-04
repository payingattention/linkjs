var static = require('node-static')
,   nconf = require('nconf')
,   urlparse = require('url')
,   fs = require('fs')

exports.createClientServer = function(options) {

    // load index.html
    var index_html = ''
    fs.readFile('./lib/client/index.html', 'utf8', function (err, contents) {
        if (err) {
            console.log("Error: unable to load index.html")
            return
        }
        index_html = contents
    })

    // create node-static
    var file_server = new(static.Server)('./lib/client');
    var server = require('http').createServer(function (request, response) {
        // serve index.html
        var requrl = urlparse.parse(request.url, true)
        if (requrl.pathname.slice(0,2) != '/_') { // not a system resource
            // all app requests load index.html and pass the request data to the javascript
            var req_obj = {
                method: request.method
                , pathname: requrl.pathname
                , data: requrl.query // :TODO: request body on non-GET
                , hash: requrl.hash
            }
            req_index_html = index_html.replace("{{request}}", JSON.stringify(req_obj))
            
            // send to client
            response.writeHead(200, {
                "Content-Type": 'text/html'
            })
            response.write(req_index_html)
            response.end()
            
        } else { // system resource (starts with an underscore)
            // serve all other files
            file_server.serveFile(requrl.pathname, 200, {}, request, response)
        }
    })
    server.listen(options.port, function() {
        console.log('%s v%s listening at %s', options.name, options.version, options.port)
    })
    return server
}