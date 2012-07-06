define(['link', 'views'], function(Link, Views) {
    // Remote Fixture
    // ==============
    // Provides static debug data from a remote source
    var RemoteFixture = function(structure, config) {
        this.structure = structure;
        this.serviceName = config.name;
        this.uri = config.uri;
        this.messages = {};
        this.remoteLink = { uri:'/inbox/remote_fixture.json', accept:'application/json' };
    };
    
    // Handler Routes
    // ==============
    RemoteFixture.prototype.routes = [
        Link.route('messagesHandler', { uri:'^/?$', accept:'obj' }),
        Link.route('messageHtmlHandler', { uri:'^/([0-9]+)/?$', accept:'text/html' })
    ];

    // Handlers
    // ========
    RemoteFixture.prototype.messagesHandler = function(request) {
        var promise = new Link.Promise();
        // Sync messages
        this.getMessages(function(errCode) {
            if (errCode) { return promise.fulfill(Link.response(errCode)); }
            // Build response
            var retMessages = [];
            for (var mid in this.messages) {
                var message = this.messages[mid];
                retMessages.push({
                    id:mid,
                    service:this.serviceName,
                    date:new Date(message.date),
                    summary:'<strong>' + message.author + '</strong> ' + message.subject,
                    view_link:this.uri + '/' + mid
                });
            }
            promise.fulfill(Link.response(200, retMessages, 'obj/message'));
        });
        return promise;
    };    
    RemoteFixture.prototype.messageHtmlHandler = function(request, match) {
        var promise = new Link.Promise();
        // Sync messages
        this.getMessages(function(errCode) {
            if (errCode) { return promise.fulfill(Link.response(errCode)); }
            // Get message
            var message = this.messages[match.uri[1]];
            if (!message) { return promise.fulfill(Link.response(404)); }
            // Build response
            var messageView = new Views.Message(message);
            promise.fulfill(Link.response(200, messageView.toString(), 'text/html'));
        });
        return promise;
    };

    // Helpers
    // =======
    RemoteFixture.prototype.getMessages = function(cb) {
        // Get messages
        // (you'd want some kind of caching in real life)
        this.structure.get(this.remoteLink, function(response) {
            if (response.code >= 300) { cb.call(this, response.code); }
            // Parse JSON
            try {
                this.messages = JSON.parse(response.body);
                cb.call(this, false);
            } catch (e) {
                console.log(e);
                cb.call(this, 500);
            }
        }, this);
    };

    return RemoteFixture;
});
