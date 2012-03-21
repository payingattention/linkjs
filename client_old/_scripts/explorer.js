// explorer.js
// ===========
// A ProxyFS definition explorer
// usage:
//   'GET /' creates the tree
//      uses data.container_id to append its controls
//   'DELETE /' shuts down all trees
//   'DELETE /<container_id>' shuts down the tree created on container_id

// tracks containers for shutdown
var active_containers = []

// requests
// ========
this.register('/', function(request) {
    if (request.method == 'post') { // create an explorer
        return create_explorer.call(this, request.data.container_id)
    }
    if (request.method == 'delete') { // shutdown
        return destroy_all_explorers.call(this)
    }
})

// explorer init function
var create_explorer = function(container_id) {
    var $container = $('#'+container_id)
    if ($container.length == 0) { console.log(container_id, 'not found in the DOM'); return }
    // track the new container
    active_containers.push(container_id)
    this.register('/' + container_id, function(request) {
        if (request.method == 'delete') {
            return destroy_explorer.call(this, container_id)
        }
    })
    // add controls
    var $treeview = $('<ul class="treeview-black"></ul>').appendTo($container)
    $treeview.treeview({ root: '' })
}

// explorer destroy function
var destroy_explorer = function(container_id) {
    // remove from the list
    var ci = active_containers.indexOf(container_id)
    active_containers.splice(ci, 1)
    // destroy it
    $('#'+container_id).empty()
}

// explorer destroyall function
var destroy_all_explorers = function() {
    for (var i=0; i < active_containers.length; i++) {
        $('#'+active_containers[i]).empty()
    }
    active_containers = []
}

// helpers
// =======

// helper to create a node in the list
var create_node = function($parent) {
    if (this.rel != 'ns-child') { return; } // only add child links
    // create dom
    var label = '<span>' + this.name + '</span>'
    if (this.href) { label += ' <small>' + this.href + '</small>' }
    var $current = $("<li/>").attr("id", (this.path ? ('root' + this.path) : ""))
        .addClass("hasChildren")
        .html(label)
        .appendTo($parent)
    $current.data('path', this.path).data('binding', this.href)
    var $branch = $("<ul/>").appendTo($current)
    $("<li/>").addClass("ajax-loader").html("&nbsp;").appendTo($branch)
}

// ajax load function
var load = function(settings, root, child, container) {
    if (typeof(root) == 'undefined') { return }
    var jqXHR = env.ns.get(root)
    if (!jqXHR) { return }
    jqXHR.success(function(data, textStatus, jqXHR) {
        child.empty()
        var links = env.ns.parse_link_header(jqXHR.getResponseHeader('Link'))
        if (!links) { return }
        $.each(links, create_node, [child]) // add nodes
        $(container).treeview({add: child}) // create tree controls
    })
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
            var path = $this.data('path')
            if (path)
                load(settings, path, childList, container);
        }
    }));
};

