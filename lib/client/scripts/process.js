// Processes API
// :TODO:
// processes
// #get
// #get_info

// /proc handler
var fsh_proc = function(method, pathv, options, cb) {
    var pathc = pathv.length
    if (pathc == 0) {
        // GET [/] :TODO:
        return cb("Not yet implemented")
    } else {
        // get the process
        var pid = pathv[1]
        ,   process = processes.get(pid) // :TODO: processes, processes.get
        if (!process) {
            return cb("Process " + pid + " not found")
        }
        if (pathc == 1) {
            // GET /<pid>  retrieve process information
            if (method == 'GET elem') { 
                return cb(null, process.get_info()) // :TODO: process.get_info()
            }
        }
    }
    return cb("Invalid request")
}
