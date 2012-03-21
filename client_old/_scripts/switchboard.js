// switchboard.js
// ==============
// A request router; prompts the user for the message destination, then replicates the request to that point.
// Usage:
//   uses method for its request method
//   uses data.content for its request data
//   uses data.$container for its container (defaults to body)
//   calls data.cb on send with (null,<the jqXHR>)
//   calls data.cb on cancel with (null,null)

var arg_content = arg_request.data.content
var arg_cb = arg_request.data.cb
var $arg_container = arg_request.data.$container
var dlg_pid = 0

var init = function($container) {
    
    // create prompt controls
    var $path_input = $('<input id="switchboardjs_path" type="text" />')
    var $path = $('<p>')
        .append($('<label for="switchboardjs_path">path:</label>'))
        .append($path_input)
    var $link_send = $('<a href="javascript:void(0)" title="send to the provided path"> ' + arg_request.method.toLowerCase() + '</a>')
    var $link_cancel = $('<a href="javascript:void(0)" title="cancel">cancel</a>')
    var $links = $('<p>')
        .append($link_send)
        .append($link_cancel)
    var $prompt = $('<div />')
        .append($path)
        .append($links)
    $container.append($prompt)

    // helpers
    var shutdown = function() {
    }

    // event handlers
    $link_send.on('click', function() {
        // start request
        var jqXHR = env.request({
            url: $path_input.val()
            , type: arg_request.method
            , data: arg_content
        })
        if (arg_cb) { arg_cb(null, jqXHR) } // pass on to our caller
        env.request({ url: arg_request.links.self, method: 'DELETE' }) // end process
    })
    $link_cancel.on('click', function() {
        if (arg_cb) { arg_cb(null, null) } // inform our caller
        env.request({ url: arg_request.links.self, method: 'DELETE' }) // end process
    })

    // register main cb (for deinit)
    var cb_main = function(request) {
        if (request.method == 'DELETE' && $prompt.html()) { // shutdown
            $prompt.empty() // removes event handlers = no memleaks
            $prompt.detach()
            // make sure our dialog shuts down
            env.request({ url: '/proc/' + dlg_pid, method: 'DELETE' }) // end process
        }
    }
    env.register(arg_request.links.self, cb_main)
}

// if no container is given, ask for a dialog
if (!$arg_container) {
    // register dialog init callback,
    var cb_dlginit = function(request) {
        // if a container is given, init
        if (request.data.$container) {        
            init(request.data.$container)
        }
    }
    env.register(arg_request.links.self + '/dlginit', cb_dlginit)
    // create dialog
    dlg_pid = env.exec({ url: '/ui/dlg', data: { org_href: arg_request.links.self, ready_href: arg_request.links.self + '/dlginit' } })
} else {
    // we have a container, go ahead and initialize now
    init($arg_container)
}