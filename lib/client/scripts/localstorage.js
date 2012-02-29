// Localstorage API

// /local handler
var fsh_local = function(method, pathv, options, cb) {
    var key = pathv.join('/')
    // GET /...[/]  retrieve value
    // :TODO: collection GET?
    if (method.indexOf('GET') == 0) {
        return cb(null, localStorage[key])
    }
    // PUT /...[/]  set value
    if (method.indexOf('PUT') == 0) {
        var old = localStorage[key]
        localStorage[key] = options.body.value
        return cb(null, old)
    }
    // DELETE /...[/]  remove value
    if (method.indexOf('DELETE') == 0) {
        var old = localStorage[key]
        delete localStorage[key]
        return cb(null, old)
    }
    return cb("Invalid request")
}