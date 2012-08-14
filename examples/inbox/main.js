require([
    'link',
    'request-events',
    'views',
    'inbox',
    'services/fixture',
    'services/remotefixture'
], function(Link, RequestEvents, AppViews, InboxModule, FixtureServiceModule, RemoteFixtureServiceModule) {

    // Service configuration
    var services = {
        local:{ module:FixtureServiceModule, name:'Fixture' },
        remote:{ module:RemoteFixtureServiceModule, name:'Remote' }
    };                    
            
    // Setup the app
    var app = new Link.Structure();
    var navView = new AppViews.Nav();
    app.addModule('', new InboxModule(app, { uri:'', services:services }));
    for (var slug in services) {
        // pull out config
        var cfg = services[slug];
        cfg.uri = '/services/' + slug; 
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

    // Begin listening to the DOM for request events
    var content_elem = document.getElementById('content');
    function handleResponse(response) {
        var html;
        if (response && response.body) {
            html = response.body.toString();
        } else {
            html = response.code + ' ' + response.reason;
        }
        // Write to DOM
        content_elem.innerHTML = html;
    }
    RequestEvents.observe(document.body);
    RequestEvents.addListener('request', function(request) {
        request['accept'] = 'text/html';
        app.dispatch(request).then(handleResponse);
    });

    // Start application
    Link.logMode('traffic', true);
    app.get({ uri:'/', accept:'text/html' }).then(handleResponse);
});
