require([
    "vendor/jquery.1.7.2.min",
    "link/app",
    "inbox",
    "services/fixture",
    "services/remotefixture"
], function(_, app, Inbox, FixtureService, RemoteFixtureService) {
    app.useJQuery($);
    app.addModule(new Inbox('#'));
    app.addModule(new FixtureService('#/services/fixture'));
    app.addModule(new RemoteFixtureService('#/services/remote'));
    app.logMode('traffic', true);
    app.init();
});