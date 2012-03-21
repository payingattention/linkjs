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
    , request: function(options, cb) {
        //=sends ajax requests, either to virtual files or proxied urls
        var self = this
        // check process callbacks
        if (this.pm.handle_request(options, cb)) {
            return
        }
        
        // send to proxy
        var org_path = options.url
	options.url = '/proxy' + options.url
        options.complete = function(jqxhr, text_status) {
            // if mimetype is javascript, exec
            if (jqxhr.getResponseHeader('Content-Type') == 'text/javascript') {
                // exec script
                self.pm.exec(org_path, jqxhr.responseText)
                // give a chance to handle request again
                options.url = org_path
                self.pm.handle_request(options, cb)
            } else {
                // send on to callback
                if (cb) {
                    cb(null, jqxhr.responseText, jqxhr.getAllResponseHeaders())
                }
            }
        }
	$.ajax(options)
    }
}