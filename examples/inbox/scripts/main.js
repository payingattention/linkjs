require([
    "link/app",
    "inbox/module",
    "services/fixture"
    //"services/email",
    //"services/twitter"
], function(app, Inbox, FixtureService/*, EmailService, TwitterService*/) {
    var inbox = Inbox.addTo('#');
    FixtureService.addTo('#/service/fixture');
    //EmailService.addTo('#/service/email');
    //TwitterService.addTo('#/service/twitter');
    app.init();
});