// env_processmanager.js
// =====================
// Used to execute client-side javascript and route requests to their callbacks

// Process
// =======
var Process = function(path) {
    this.path = path
    this.func = null
    this.callbacks = {}
}
Process.prototype.exec = function(src, options) {
    //=evaluates and executes given source
    if (src) {
        this.func = new Function(src)
    }
    this.func(options)
}
Process.prototype.register = function(name, cb) {
    //=registers a callback
    if (name.charAt(0) != '/') { name = '/' + name }
    this.callbacks[name] = cb
}

// ProcessManager
// ==============
var ProcessManager = function() {
    this.processes = {}
}
ProcessManager.prototype.exec = function(path, funcdef) {
    //=evaluates the script and runs it as a process
    if (this.processes[path]) { this.kill(path) } // :TODO: will this ever happen?
    // create the process
    var process = new Process(path)
    this.processes[path] = process
    // evaluate and execute
    process.exec(funcdef)
    // if no callbacks were registered, kill the process
    if (process.callbacks.length == 0) {
        this.kill(path)
        return null
    }
    return process
}
ProcessManager.prototype.handle_request = function(request, cb) {
    //=runs the request through any clientside processes
    // see if any running processes have a callback registered for it
    for (var ppath in this.processes) {
        if (request.url.indexOf(ppath) == 0) {
            var process = this.processes[ppath]
            // pull relpath
            var cbname = request.url.slice(ppath.length)
            if (cbname.charAt(0) != '/') { cbname = '/' + cbname }
            // run if it exists
            var pcb = process.callbacks[cbname]
            if (pcb) {
                request.method = request.method.toLowerCase() // make everyone's life simpler
                var response = pcb.call(process, request)
                if (cb) {
                    cb(null, response, { 'content-type': 'application/json' })
                }
                return true
            }
        }
    }
    return false
}
ProcessManager.prototype.kill = function(path) {
    //=ends a process and frees its memory
    var process = this.processes[path]
    if (process) {
        // call main cb if it exists with die request
        var rootcb = process.callbacks['/']
        if (rootcb) {
            rootcb({ method: 'DELETE' })
        }
        // remove
        delete this.processes[path]
        this.processes[path] = null
    }
}