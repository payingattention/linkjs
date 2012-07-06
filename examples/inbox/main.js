require.config({
    paths:{
        link:'../link',
        tint:'../tint'
    }
});
require([
    'link',
    'views',
    'inbox',
    'services/fixture',
    'services/remotefixture'
], function(Link, AppViews, InboxModule, FixtureServiceModule, RemoteFixtureServiceModule) {

    // Service configuration
    var services = {
        local:{ module:FixtureServiceModule, name:'Fixture' },
        remote:{ module:RemoteFixtureServiceModule, name:'Remote' }
    };                    
            
    // Setup the app
    var app = new Link.Structure();
    var navView = new AppViews.Nav();
    app.addModule('#', new InboxModule(app, { uri:'#', services:services }));
    for (var slug in services) {
        // pull out config
        var cfg = services[slug];
        cfg.uri = '#services/' + slug; 
        // instantiate the module
        var Module = cfg.module;
        var inst = new Module(app, cfg);
        // add to structure
        app.addModule(cfg.uri, inst);
        // add to nav view
        navView.item().link(cfg.name, 'folder-open', cfg.uri);
    }
    // put nav view into the DOM
    document.getElementById('nav').innerHTML = navView.toString();

    // Start application
    Link.logMode('traffic', true);
    var content_elem = document.getElementById('content');
    Link.attachToWindow(app, function(request, response) {
        var html;
        if (response && response.body) {
            html = response.body.toString();
        } else {
            html = response.code + ' ' + response.reason;
        }
        // Write to DOM
        content_elem.innerHTML = html;
    });
});
