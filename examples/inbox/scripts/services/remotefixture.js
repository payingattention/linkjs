define(['link/module', 'link/request', './fixture'], function(Module, Request, Fixture) {
    // Remote Fixture
    // ==============
    // Provides static debug data from a remote source
    var RemoteFixture = Module.Extend(Fixture, function() {
        // Attributes
        this.remoteSource = 'remote_fixture.json';
        this.serviceName = 'Remote';

        // Request Templates
        this.newGetMessagesRequest = Request.Factory('get', '', { accept:'application/json' });
    });

    // Helpers
    // =======
    RemoteFixture.prototype.getMessages = function(cb) {
        // Get messages
        // (you'd want some kind of caching in real life)
        this.newGetMessagesRequest(this.remoteSource).dispatch(function(request, response) {
            if (response.fail()) { cb.call(this, response.code()); }
            // Collect into a response
            try {
                this.messages = JSON.parse(response.body());
                cb.call(this, null);
            } catch (e) {
                console.log(e);
                cb.call(this, 500);
            }
        }, this);
    };

    // Handlers
    // ========
    RemoteFixture.prototype.messagesJsonHandler = function(request) {
        this.getMessages(function(err) {
            if (err) {
                return request.respond(err);
            }
            // Build response
            var retMessages = [];
            for (var mid in this.messages) {
                retMessages.push(this.buildMessage(mid, ['service','date','summary','view_link']));
            }
            request.respond(200, retMessages, 'application/json');
        });
    };    
    RemoteFixture.prototype.messageHtmlHandler = function(request, response, urimatch) {
        this.getMessages(function(err) {
            if (err) {
                return request.respond(500, 'Malformed Json');
            }
            // Build response
            var message = this.messages[urimatch[1]];
            if (!message) { return request.respond(404); }
            request.respond(200, this.templates.message(message), 'text/html');
        });
    };
    RemoteFixture.prototype.settingsHtmlHandler = function(request) {
        // :TODO:
        request.respond(200, 'Remote Fixture Settings', 'text/html');
    };

    return RemoteFixture;
});