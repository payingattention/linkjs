// dlg.js
// ======
// Creates a dialog container for another script to use
// Usage:
//   calls data.cb once DOM is ready with (null, <the $container>)

// load styling
if (document.createStyleSheet){
    document.createStyleSheet('/_scripts/vendor/uikit/ui.css');
} else {
    $("head").append($("<link rel='stylesheet' href='/_scripts/vendor/uikit/ui.css' type='text/css' media='screen' />"));
}

// load dependencies
var deps = [
    '/_scripts/vendor/uikit/ui.js'
]
$.requireScript(deps, { parallel:false }, function() {
    // create the dialog
    var $container = $('<div />')
    var dlg = ui.dialog($container).closable().show()
    var isopen = true
    // destroy the contents on hide
    dlg.on('close', function() {
        env.request({ url: arg_request.data.org_href, method: 'DELETE' }) // send shutdown to originator
        $container.empty()
        $container.detach()
        isopen = false
    })
    // register main cb (for deinit)
    var cb_main = function(request) {
        if (request.method == 'DELETE' && isopen) { // shutdown
            dlg.hide()
        }
    }
    env.register(arg_request.links.self, cb_main)
    // send to caller
    env.request({ url: arg_request.data.ready_href, method: 'POST', data: { $container: $container } })
})