// System API
// :TODO:
// processes
// #get_singleton
// #set_singleton
// #exec

// /sys/exec handler
var fsh_sys_exec = function(method, pathv, options, cb) {
    if (pathc == 0 && method.indexOf('POST') == 0) {
        var toolpath = options.body.path
        ,   pid = 0
        // POST /exec  singleton exec
        // :TODO: fallback url for DNE
        if (method == 'POST elem') {
            // check if the singleton exists
            pid = processes.get_singleton(toolpath) // :TODO: processes.get_singleton
            // doesnt exist? exec
            if (!pid) {
                pid = processes.exec(toolpath) // :TODO: processes.exec
                processes.set_singleton(toolpath, pid) // :TODO: processes.set_singleton
            }
        }
        // POST /exec/  multiprocess exec
        if (method == 'POST col') {
            pid = processes.exec(toolpath) // :TODO: processes.exec
        }
        return cb(null, '/proc/' + pid)
    }
    return cb("Invalid request")
}