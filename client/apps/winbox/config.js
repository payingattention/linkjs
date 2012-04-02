// Winbox Configuration
// ====================
link.App.require_style(['/apps/bootstrap/css/bootstrap.css', '/apps/winbox/_iface/winbox.css']);
link.App.require_script([
    'https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.js',
    '/apps/winbox/vendor/handlebars.runtime.js',
    '/apps/winbox/vendor/moment.min.js'
], function() {
    // depends on handlebars.runtime.js
    link.App.require_script('/apps/winbox/templates/templates.js');
});
link.App.configure({
    "#/winbox": {
        "->": "/apps/winbox/main.js",
        "->requires": ['/apps/winbox/templates/templates.js']
    },
    "#/winbox/message": {
        "->": "/apps/winbox/message.js"
    },
    "#/winbox/settings": {
        "->": "/apps/winbox/settings.js"
    },
    "#/winbox/service": {
        "->": "/apps/winbox/service.js"
    },
    "#/winbox/_iface/layout": {
        "->": "/apps/winbox/_iface/layout.js"
    },
    "#/winbox/_iface/msg/twitter": {
        "->": "/apps/winbox/_iface/msg/twitter.js"
    },
    "#/winbox/_services/restemail": {
        "->": "/apps/winbox/_service/restemail.js",
        "service": "GMail",
        "host": "http://estate45.com:8001/"
    }
});