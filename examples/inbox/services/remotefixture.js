(function(Modules) {
    // Remote Fixture
    // ==============
    // Provides static debug data from a remote source
    var RemoteFixture = function(name) {
        this.serviceName = name;
        this.messages = {};
        this.remoteLink = { uri:'/inbox/remote_fixture.json', accept:'application/json' };
    };
    
    // Handler Routes
    // ==============
    RemoteFixture.prototype.routes = [
        { cb:'messagesHandler', uri:'^/?$', accept:'js/object' },
        { cb:'messageHtmlHandler', uri:'^/([0-9]+)/?$', accept:'text/html' }
    ];
    RemoteFixture.prototype.getMessages = function(cb) {
        // Get messages
        // (you'd want some kind of caching in real life)
        this.mediator.get(this.remoteLink, function(response) {
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

    // Handlers
    // ========
    RemoteFixture.prototype.messagesHandler = function(request) {
        var promise = new Link.Promise();
        // Sync messages
        this.getMessages(function(errCode) {
            if (errCode) { return promise.fulfill({ code:errCode }); }
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
            promise.fulfill({ code:200, body:retMessages, 'content-type':'js/object' });
        });
        return promise;
    };    
    RemoteFixture.prototype.messageHtmlHandler = function(request, response, match) {
        var promise = new Link.Promise();
        // Sync messages
        this.getMessages(function(errCode) {
            if (errCode) { return promise.fulfill({ code:errCode }); }
            // Get message
            var message = this.messages[match.uri[1]];
            if (!message) { return promise.fulfill({ code:404 }); }
            // Build response
            var messageView = new Views.Message(message);
            promise.fulfill({ code:200, body:messageView.toString(), 'content-type':'text/html' });
        });
        return promise;
    };

    // Export
    Modules.RemoteFixtureService = RemoteFixture;
})(Modules);