require([
    "link/app",
    "link/modules/cli",
    "inbox",
    "services/fixture",
    "services/remotefixture",
], function(app, CLI, Inbox, FixtureService, RemoteFixtureService) {
    app.addModule(new CLI('#/cli'));
    app.addModule(new Inbox('#'));
    app.addModule(new FixtureService('#/services/local'));
    app.addModule(new RemoteFixtureService('#/services/remote'));
    app.logMode('traffic', true);
    app.init();
});