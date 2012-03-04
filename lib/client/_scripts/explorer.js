// explorer.js
// ===========
// A ProxyFS definition explorer
// usage:
//   uses data.$container to append its controls

// load styling
if (document.createStyleSheet){
    document.createStyleSheet('/_scripts/vendor/jquery.treeview/jquery.treeview.css');
    document.createStyleSheet('/_scripts/vendor/uikit/ui.css');
    document.createStyleSheet('/_scripts/explorer.css');
} else {
    $("head").append($("<link rel='stylesheet' href='/_scripts/vendor/jquery.treeview/jquery.treeview.css' type='text/css' media='screen' />"));
    $("head").append($("<link rel='stylesheet' href='/_scripts/vendor/uikit/ui.css' type='text/css' media='screen' />"));
    $("head").append($("<link rel='stylesheet' href='/_scripts/explorer.css' type='text/css' media='screen' />"));
}

// load dependencies
var deps = [
    '/_scripts/vendor/jquery.treeview/jquery.treeview.js'
    , '/_scripts/vendor/jquery.treeview/jquery.treeview.edit.js'
    , '/_scripts/vendor/uikit/ui.js'
]
$.requireScript(deps, { parallel:false }, function() {

    // helper to make a text input control in the filetree
    var make_editable = function($elem, cb) {
        var org_contents = $elem.html()
        ,   org_value = $elem.text()
        $elem.empty()
        // create controls
        var $edit = $('<input type="text" />').val(org_value).appendTo($elem)
        var $ok = $('<button>ok</button>').appendTo($elem)
        var $cancel = $('<button>cancel</button>').appendTo($elem)
        $edit.focus()
        // register handlers
        var save = function() {
            // restore dom with new value
            var val = $edit.val()
            $elem.html(val)
            // run callback
            if (cb) { cb(val) }
        }
        var cancel = function() {
            // restore dom with old value
            $elem.html(org_contents)
        }
        $edit.on('keydown', function(e) {
            if (e.keyCode == 13) {
                e.preventDefault()
                save()
            }
        })
        $ok.on('click', save)
        $cancel.on('click', cancel)
    }

    var on_file_contextmenu = function(e) {
        e.preventDefault()
        var $file_ctrl = $(e.target).parent()
        var on_exec = function() {
            window.location = $file_ctrl.data('path')
        }
        var on_add_child = function() {
            var name = 'new_file'
            ,   path = $file_ctrl.data('path') + '/' + name
            // save new binding
            env.ns.alias(path, '')
            // add dom elements
            create_node.call({ name:name, path:path, href:'', rel:'ns-child' }, $file_ctrl.children('ul')) // available by hoist
            $file_ctrl.treeview({add: $file_ctrl.children('ul').children('li').last()}) // create tree controls
        }
        var on_rename = function() {
            var old_path = $file_ctrl.data('path')
            ,   binding = $file_ctrl.data('binding')
            // edit the name span
            make_editable($file_ctrl.children('span'), function (newname) {
                var new_path = old_path.slice(0,old_path.lastIndexOf('/')+1) + newname
                // update dom
                $file_ctrl.attr('id', 'root' + new_path)
                $file_ctrl.data('path', new_path)
                // update in the nameserver
                env.ns.unalias(old_path)
                env.ns.alias(new_path, binding)
            })
        }
        var on_rebind = function() {
            // edit the binding small, create if DNE
            var $binding_small = $file_ctrl.children('small')
            ,   $name_span = $file_ctrl.children('span')
            if (!$binding_small.length) {
                $binding_small = $('<small />')
                $name_span.after($binding_small)
            }
            make_editable($binding_small, function (newbinding) {
                if (newbinding == '') {
                    // remove a valueluess binding
                    $binding_small.detach()
                }
                // update dom
                $file_ctrl.data('binding', newbinding)
                // set in ns
                env.ns.alias($file_ctrl.data('path'), newbinding)
            })
        }
        var on_remove = function() {
            // confirm
            new ui.Confirmation({ title: 'remove binding', message: 'are you sure?' })
                .show(function(ok) {
                    if (ok) {
                        // remove ns binding
                        env.ns.unalias($file_ctrl.data('path'))
                        // remove control
                        $file_ctrl.detach()
                    }
                })
        }

        // open the file menu
        var filemenu = ui.menu()
            .add('exec')
            .add('add child')
            .add('rename')
            .add('rebind')
            .add('remove')
        filemenu.moveTo(e.pageX, e.pageY).show()
        filemenu.on('exec', on_exec)
        filemenu.on('add child', on_add_child)
        filemenu.on('rename', on_rename)
        filemenu.on('rebind', on_rebind)
        filemenu.on('remove', on_remove)
    }
    
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
        // register event handlers
        $current.on('contextmenu', on_file_contextmenu)
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

    // Create the tree control
    var $arg_container = arg_request.data.$container || $('body')
    $('<ul id="black" class="treeview-black"></ul>').appendTo($arg_container)
    $("#black").treeview({
        root: ''
    })
})