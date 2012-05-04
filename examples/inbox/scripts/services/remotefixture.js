define(['link/module', 'link/app', './views'], function(Module, app, Views) {
    // Remote Fixture
    // ==============
    // Provides static debug data from a remote source
    var RemoteFixture = Module({
        // Handler routes
        routes:[
            { cb:'messagesHandler', uri:'^/?$', accept:'js/array' },
            { cb:'messageHtmlHandler', uri:'^/([0-9]+)/?$', accept:'text/html' },
            { cb:'settingsHandler', uri:'^/settings/?$' }
        ],
        // Attributes
        messages:{},
        remoteLink:{ uri:'/inbox/remote_fixture.json', accept:'application/json' }
        serviceName:'Remote'
    });

    // Helpers
    // =======
    RemoteFixture.prototype.getMessages = function(cb) {
        // Get messages
        // (you'd want some kind of caching in real life)
        app.get(this.remoteLink, function(response) {
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
        var promise = _.makePromise();
        // Sync messages
        this.getMessages(function(errCode) {
            if (errCode) { return promise.fulfill({ code:errCode }); }
            // Build response
            var retMessages = [];
            _.each(this.messages, function(message, mid) {
                retMessages.push({
                    id:mid,
                    service:this.serviceName,
                    date:new Date(message.date),
                    summary:'<strong>' + message.author + '</strong> ' + message.subject,
                    view_link:this.uri + '/' + mid
                });
            });
            promise.fulfill({ code:200, body:retMessages, contenttype:'js/array' });
        });
        return promise;
    };    
    RemoteFixture.prototype.messageHtmlHandler = function(request, response, urimatch) {
        var promise = _.makePromise();
        // Sync messages
        this.getMessages(function(errCode) {
            if (errCode) { return promise.fulfill({ code:errCode }); }
            // Get message
            var message = this.messages[urimatch[1]];
            if (!message) { return promise.fulfill({ code:404 }); }
            // Build response
            var messageView = new Views.Message(message);
            promise.fulfill({ code:200, body:messageView.toString(), contenttype:'text/html');
        });
        return promise;
    };
    RemoteFixture.prototype.settingsResource = function(request) {
        if (request.accept == 'js/object') {
            return { code:200, body:{ name:this.serviceName }, contenttype:'js/array' };
        } else if (request.accept == 'text/html') {
            // :TODO:
            return { code:200, body:'Remote Fixture Settings', contenttype:'text/html' };
        }
    };

    return RemoteFixture;
});