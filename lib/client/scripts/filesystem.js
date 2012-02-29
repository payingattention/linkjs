// Filesystem API
// :TODO:
// fs
// #define
// #listen
// fsdef

fs.request = function(method, path, options, cb) {
    // Call: method, path, cb
    if (!cb && typeof(options) == 'function') {
        cb = options
        options = {}
    }
    
    // Split into parts
    var path_parts = path.split('/')
    if (path_parts[0] == '') { path_parts = path_parts.slice(1) } // started with a /, drop the blank
    if (path_parts[path_parts.length-1] == '') { // ended with a /, drop the blank
        path_parts = path_parts.slice(0,path_parts.length-1)
        method += ' col' // collection request
    } else {
        method += ' elem' // element request
    }    

    // Find the most complete path in our fsdef
    ,   fs_node = fsdef // :TODO: fsdef
    ,   depth = 0, max_depth = path_parts.length
    for (; depth < max_depth; depth++) {
        var path_part = path_parts[depth]
        if (fs_node.chilren[path_part])
            fs_node = fs_node.children[path_part]
        else
            break
    }
    
    // Pass to the node
    var subpath_parts = path_parts.slice(depth)
    fs_node.request(method, subpath_parts, options, cb)
}