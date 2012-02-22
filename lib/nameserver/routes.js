var restify = require('restify')
,   uuid = require('restify/node_modules/node-uuid')

exports.elem_head = function(req, res, next) {
    debugger
    // get the requested name
    var name = req.params[0]
    ,   val = req.names.get(name)
    ,   links = []
    ,   i, ii
    // found?
    if (val !== null) {
        res.header('Content-Location', val)
        // a defined name?
        if (name === '' || req.names.has(name)) {
            // --
        } else {
            // cached, add root
            var parent_name = req.names.get_defined_parent(name)
            links.push('<'+parent_name+'>; rel="ns-root"; title="'+parent_name+'"')
        }
        res.header('Link', links.join(', '))
    } else {
        return next(new restify.ResourceNotFoundError())
    }
    res.end()
    return next()
}

exports.elem_put = function(req, res, next) {
    // set
    var name = req.params[0]
    req.names.set(name, req.params.url || '')
    // make sure parents exist
    do {
        // move up the path
        name = name.slice(0, name.lastIndexOf('/'))
        // name defined?
        if (name == '' || req.names.has(name))
            break // we're done
        // set
        req.names.set(name, '')
    } while (name)
    res.end()
    return next()
}

exports.elem_delete = function(req, res, next) {
    // defined (or possibly cached) name?
    if (req.names.get(req.params[0]) !== null) { // :NOTE: this will actually create a cached value if inference is possible, but it'll be deleted anyway
        req.names.del(req.params[0])
    } else {
        return next(new restify.ResourceNotFoundError())
    }
    res.end()
    return next()
}

exports.col_head = function(req, res, next) {
    debugger
    // get the requested name
    var name = req.params[0]
    ,   val = req.names.get(name)
    ,   links = []
    ,   i, ii
    // found?
    if (val !== null) {
        res.header('Content-Location', val)
        // a defined name?
        if (name === '' || req.names.has(name)) {
            // get children
            var children = req.names.get_children(name) // gets array of names
            ,   childval
            for (i=0, ii=children.length; i < ii; i++) {
                childval = req.names.get(children[i]) // get the child value
                links.push('<'+childval+'>; rel="ns-child"; title="'+children[i]+'"')
            }
        } else {
            // cached, add root
            var parent_name = req.names.get_defined_parent(name)
            links.push('<'+parent_name+'>; rel="ns-root"; title="'+parent_name+'"')
        }
        res.header('Link', links.join(', '))
    } else {
        return next(new restify.ResourceNotFoundError())
    }
    res.end()
    return next()
}

exports.col_post = function(req, res, next) {
    // find a unique name
    var name
    do {
        name = req.params[0] + '/' + uuid()
    } while (req.names.has(name))
    // add
    var val = req.params.url || ''
    req.names.set(name, val)
    // respond
    res.header('Location', name)
    res.end()
    return next()
}