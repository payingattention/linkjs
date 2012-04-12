// Winbox Configuration
// ====================
link.App.require_style(['/apps/bootstrap/css/bootstrap.css', '/apps/winbox/interfaces/winbox.css']);
link.App.require_script([
    'https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.js',
    '/apps/winbox/vendor/handlebars.runtime.js',
    '/apps/winbox/vendor/moment.min.js'
], function() {
    // depends on handlebars.runtime.js
    link.App.require_script('/apps/winbox/templates/templates.js', function() {
        // depends on templates.js
        link.App.require_script([
            '/apps/winbox/main.js',
            '/apps/winbox/services/fixture.js'
        ]);
    });
});
link.App.configure_uris({
    "#/winbox": {
        "->isa": "Winbox"
    },
    "#/winbox2": {
        "->isa": "Winbox",
        "title": "Winbox2"
    },
    "#/winbox/services/fixture": {
        "->isa": "Winbox.Service.Fixture"
    },

    // TODO...
    /*"#/winbox/interfaces/fixture/message": {
        "->requires": "/apps/winbox/interfaces/fixture/message.js"
    },
    "#/winbox/interfaces/twitter": {
        "->": "/apps/winbox/interfaces/twitter.js"
    },
    "#/winbox/services/restemail": {
        "->": "/apps/winbox/services/restemail.js",
        "service": "GMail",
        "host": "http://estate45.com:8001/"
    },
    "#/winbox/services/restwitter": {
        "->": "/apps/winbox/services/restwitter.js",
        "service": "Twitter",
        "host": "http://estate45.com:8002/"
    },
    "#/winbox/services/restfacebook": {
        "->": "/apps/winbox/services/restfacebook.js",
        "service": "Facebook",
        "host": "http://estate45.com:8003/"
    }*/
});