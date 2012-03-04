// env_processmanager.js
// =====================

var ProcessManager = function() {
    this.processes = []
    this.pcount = 0
}
ProcessManager.prototype.capture_pid = function() {
    var pid = this.pcount++
    this.processes.push(null)
    return pid
}
ProcessManager.prototype.exec = function(pid, funcdef, request) {
    if (pid < 0 || pid >= this.pcount) { return false }
    // create the process
    var process = {
        pid: pid
        , src_path: request.url
        , exec: new Function('arg_request', funcdef) // evaluate
        , callbacks: {}
    }
    this.processes[pid] = process
    this.pcount++
    // add links
    request.links = {
        self: '/proc/' + process.pid
        , script: request.url
    }
    // call
    process.exec(request)
    return process.pid
}
ProcessManager.prototype.register_callback = function(pid, name, cb) {
    if (name.charAt(0) != '/') { name = '/' + name }
    if (this.processes[pid]) {
        this.processes[pid].callbacks[name] = cb
    }
}
ProcessManager.prototype.send_request = function(pid, request) {
    var process = this.processes[pid]
    if (process) {
        // parse target cb path
        var rooturl = '/proc/' + pid
        var cbname = request.url.slice(rooturl.length)
        if (cbname.charAt(0) != '/') { cbname = '/' + cbname }
        // run if it exists
        var cb = process.callbacks[cbname]
        if (cb) {
            cb(request)
        }
    }
}
ProcessManager.prototype.kill = function(pid) {
    var process = this.processes[pid]
    if (process) {
        // call main cb if it exists with die request
        var rootcb = process.callbacks['/']
        if (rootcb) {
            rootcb({ method: 'DELETE' })
        }
        // remove
        delete this.processes[pid]
        this.processes[pid] = null
    }
}