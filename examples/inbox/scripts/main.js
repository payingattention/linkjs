require([
    "link/app",
    "inbox",
    "services/fixture"
], function(app, Inbox, FixtureService) {
    app.addModule(new Inbox('#'));
    app.addModule(new FixtureService('#/services/fixture'));
    app.logMode('traffic', true);
    app.init();
});