// Link Browser Env
// ================
window.env = {
    ns: {
	get: function(name) {
	    if (!name && name !== '' ) { return }
	    if (name.charAt(name.length-1) != '/') // make sure we're operating on the collection
		name += '/'
	    return $.ajax({
		url: '/ns' + name
		, type: 'HEAD'
	    })
	}
	, alias: function(name, value) {
	    if (!name && name !== '' ) { return }
	    if (!value) { value = '' }
	    // if name is an element, we set using the elem name (/root/path/name)
	    // if name is a collection, we create using a generated name(/root/path/)
	    var method = 'PUT'
	    if (name.charAt(name.length-1) == '/') // operating on a collection?
		method = 'POST' // have nameserver generate the name for us
	    return $.ajax({
		url: '/ns' + name
		, data: { url: value }
		, type: method
	    })
	}
	, unalias: function(name) {
	    if (!name && name !== '' ) { return }
	    if (name.charAt(name.length-1) == '/') // make sure we're operating on the element
		name = name.slice(0,name.length-1)
	    return $.ajax({
		url: '/ns' + name
		, type: 'DELETE'
	    })
	}
        , parse_link_header: function (lh) {
            if (!lh) { return null }
            var entries = lh.split(',') // Split on expect '<entry>, <entry>,'...
            ,   params // param list for an entry
            ,   kv // key-value for a param
            ,   obj = {} // result object
            ,   entry // an entry in the header
            ,   i, ii
            ,   j, jj
            for (i=0, ii=entries.length; i < ii; i++) {
                entry = {}
                params = entries[i].split(';') // Split on expect '<entry_param>; <entry_param>;'...
                for (j=0, jj=params.length; j < jj; j++) {
                    if (j == 0) { // first entry, expect href (no key)
                        entry.href = params[j].replace(/[<>]/g,'').trim()
                    } else {
                        kv = params[j].split('=') // split on expect '<key>=<val>'
                        kv[1] = kv[1].replace(/\"/g, '') // remove quotes
                        entry[kv[0].trim()] = kv[1].trim()
                    }
                }
                entry.path = entry.title
                entry.name = entry.title.slice(entry.title.lastIndexOf('/') + 1)
                obj[entry.title || entry.href] = entry
            }
            return obj
        }
    }
    , pm: new ProcessManager()
    , request: function(options) {
        // sends ajax requests, either to virtual files or proxied urls
        // virtual files
        if (options.url.indexOf('/proc') == 0) {
            return vfs_proc_call(options)
        }
        // send to proxy
	options.url = '/proxy' + options.url
	return $.ajax(options)
    }
    , exec: function(request) {
        // special request, assumes the target is a javascript and starts it as a process, passing the request
        // capture a pid
        var pid = env.pm.capture_pid()
        // get the script
        $.get('/proxy' + request.url, '', function(funcdef, textStatus, jqXHR) {
            // send to process manager
            // :TODO: error management
            env.pm.exec(pid, funcdef, request)
        }, 'text')
        return pid
    }
    , register: function(path, cb) {
        // parse the pid
        var match = /\/proc\/(\d*)(\/.*)?/g.exec(path)
        ,   pid = match[1]
        ,   cbname = match[2]
        if (!cbname) { cbname = '' }
        // send to pm
        env.pm.register_callback(pid, cbname, cb)
        return true
    }
}

// virtual file system

// /proc/<pid>[/...] - executes callbacks on running processes
// usage:
//   calls process by pid; only matches up to '/proc/<pid>', so allows "sub-resources"
var vfs_proc_call = function(request) {
    // parse the pid
    var match = /\/proc\/(\d*)/g.exec(request.url)
    ,   pid = match[1]
    // if it's a delete request on the root resource, kill it
    if (request.method.toLowerCase() == 'delete' && request.url == '/proc/' + pid) {
        env.pm.kill(pid)
    } else { // all other requests
        env.pm.send_request(pid, request)
    }
}

