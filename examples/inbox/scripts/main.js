require([
    "link/app",
    "inbox",
    "services/fixture",
    "services/remotefixture"
], function(app, Inbox, FixtureService, RemoteFixtureService) {
    app.addModule(new Inbox('#'));
    app.addModule(new FixtureService('#/services/fixture'));
    app.addModule(new RemoteFixtureService('#/services/remote'));
    app.logMode('traffic', true);
    app.init();
});