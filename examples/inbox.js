require([
    "link/app",
    "link/modules/test",
    "link/modules/cli",
    "inbox/main",
    "inbox/services/fixture",
    "inbox/services/remotefixture",
], function(app, Test, CLI, Inbox, FixtureService, RemoteFixtureService) {
    app.addModule(new CLI('#/cli'));
    app.addModule(new Test('#/test'));
    app.addModule(new Inbox('#'));
    app.addModule(new FixtureService('#/services/local'));
    app.addModule(new RemoteFixtureService('#/services/remote'));
    app.logMode('traffic', true);
    app.init();
});