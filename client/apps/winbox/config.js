// Winbox Configuration
// ====================
link.App.require_style(['/apps/bootstrap/css/bootstrap.css', '/apps/winbox/interfaces/winbox.css']);
link.App.require_script([
    'https://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js',
    '/apps/winbox/vendor/handlebars.runtime.js',
    '/apps/winbox/vendor/moment.min.js'
], function() {
    // depends on handlebars.runtime.js or jquery
    link.App.require_script([
        '/apps/winbox/templates/templates.js',
        'http://twitter.github.com/bootstrap/assets/js/bootstrap-dropdown.js'
    ], function() {
        // depends on templates.js
        link.App.require_script([
            '/apps/winbox/main.js',
            '/apps/winbox/services/fixture.js',
            '/apps/winbox/services/twitter.js'
        ]);
    });
});
link.App.configure_uris({
    "#/winbox": {
        "->isa": "Winbox"
    },
    "#/winbox/services/fixture": {
        "->isa": "Winbox.Fixture.Service"
    },
    "#/winbox/services/twitter": {
        "->isa": "Winbox.Twitter.Service"
    },

    // TODO...
    /*
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