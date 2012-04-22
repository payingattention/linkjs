define(['link/module', 'link/request', './fixture'], function(Module, Request, Fixture) {
    // Remote Fixture
    // ==============
    // Provides static debug data from a remote source
    var RemoteFixture = Module.Extend(Fixture, function() {
        this.remoteSource = 'http://github.com/pfraze/link/examples/inbox/fixture.json';
        this.newGetMessagesRequest = Request.Factory('get', '', { accept:'application/json' });
    });

    // Handlers
    // ========
    RemoteFixture.prototype.messagesJsonHandler = function(orgRequest) {
        // Get messages
        this.newGetMessagesRequest(this.remoteSource).dispatch(function(request, response) {
            if (response.fail()) { return orgRequest.respond(response); }
            // Collect into a response
            this.messages = response.body();
            var retMessages = [];
            for (var mid in this.messages) {
                retMessages.push(this.buildMessage(mid, ['service','date','summary','view_link']));
            }
            orgRequest.respond(200, retMessages, 'application/json');
        }, this);
    };    
    RemoteFixture.prototype.messageHtmlHandler = function(orgRequest, response, urimatch) {
        // Get messages
        this.newGetMessagesRequest(this.remoteSource).dispatch(function(request, response) {
            if (response.fail()) { return orgRequest.respond(response); }
            // Build response
            this.messages = response.body();
            var message = this.messages[urimatch[1]];
            if (!message) { return orgRequest.respond(404); }
            orgRequest.respond(200, this.templates.message(message), 'text/html');
        }, this);
    };
    RemoteFixture.prototype.settingsJsonHandler = function(request) {
        request.respond(200, {
            name: 'Remote Fixture'
        }, 'application/json');
    };
    RemoteFixture.prototype.settingsHtmlHandler = function(request) {
        // :TODO:
        request.respond(200, 'Remote Fixture Settings', 'text/html');
    };

    return RemoteFixture;
});