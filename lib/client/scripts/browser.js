

// Browser Env
// ===========
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
    }
    , proxy: {
	request: function(options) {
	    // add the proxy url (what a great wrapper!)
	    options.url = '/proxy' + options.url
	    return $.ajax(options)
	}
    }
    , exec: function(name) {
	// slice out other arguments
	var other_args = Array.prototype.slice.call(arguments, 1)
	$.getScript('/proxy/env/' + name, function() {
	    // pass remaining arguments to loaded script's exec function
	    window.env.scripts[name].exec.apply(null, other_args)
	})
    }
    , scripts: {} // storage for loaded scripts
}

$(document).ready(function(){

    // link header parser
    function parse_link_header(lh) {
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

    // ajax load function
    function load(settings, root, child, container) {
        function createNode(parent) {
	    if (this.rel != 'ns-child') { return; } // only add child links
	    var label = this.name + (this.href ? " (=" + this.href + ')' : '')
            var current = $("<li/>").attr("id", this.path || "").addClass("hasChildren").html("<span>" + label + "</span>").appendTo(parent);
	    var branch = $("<ul/>").appendTo(current);
            $("<li/>").addClass("ajax-loader").html("&nbsp;").appendTo(branch);

	}
	var jqXHR = env.ns.get(root)
	if (!jqXHR) { return }
	jqXHR.success(function(data, textStatus, jqXHR) {
            child.empty();
            var links = parse_link_header(jqXHR.getResponseHeader('Link'))
	    if (!links) { return }
            $.each(links, createNode, [child]);
            $(container).treeview({add: child});
        })
        /*$.ajax($.extend(true, {
            url: '/ns' + root + '/',
            type: 'HEAD',
            contentType: 'application/json',
            dataType: "json",
            success: function(response) {
                child.empty();
                var links = parse_link_header(jqXHR.getResponseHeader('Link'))
		if (!links) { return }
                $.each(links, createNode, [child]);
                $(container).treeview({add: child});
            }
        }, settings.ajax));*/
    }

    // extend treeview to get data from nameserver
    var proxied = $.fn.treeview;
    $.fn.treeview = function(settings) {
        var container = this;
        load(settings, settings.root, this, container);
        return proxied.call(this, $.extend(true, settings, {
            collapsed: true,
            toggle: function() {
                var $this = $(this)
                var childList = $this.removeClass("hasChildren").find("ul");
                load(settings, $this.attr('id'), childList, container);
            }
        }));
    };

    // Create the tree control
    $("#black").treeview({
	control: "#treecontrol"
        , url: 'http://estate45.com/ns'
        , root: ''
    })

});