define(['link/module', 'link/request', './views'], function(Module, Request, Views) {
    // Remote Fixture
    // ==============
    // Provides static debug data from a remote source
    var RemoteFixture = Module({
        // Handler routes
        routes:[
            { messageHandler:{ uri:'^/([0-9]+)/?$', accept:'text/html' }}
        ],
    }, function() {
        // Attributes
        this.messages = {};
        this.remoteSource = 'remote_fixture.json';
        this.serviceName = 'Remote';
        
        // Fixed resources
        this.addResource('/', this.messagesResource);
        this.addResource('/settings', this.settingsResource);
    });

    // Helpers
    // =======
    RemoteFixture.prototype.getMessages = function(cb) {
        // Get messages
        // (you'd want some kind of caching in real life)
        var request = new Request('get', this.remoteSource, { accept:'application/json' });
        request.dispatch(function(request, response) {
            if (response.fail()) { cb.call(this, response.code()); }
            // Parse JSON
            try {
                this.messages = JSON.parse(response.body());
                cb.call(this, null);
            } catch (e) {
                console.log(e);
                cb.call(this, 500);
            }
        }, this);
    };

    // Resources
    // ========
    RemoteFixture.prototype.messagesResource = function(resource, request) {
        if (!request.matches({ accept:'application/json' })) { return request.nextHandler(); }
        this.getMessages(function(errCode) {
            if (errCode) { return request.respond(errCode); }
            // Build response
            var retMessages = [];
            for (var mid in this.messages) {
                retMessages.push(this.buildMessage(mid, ['service','date','summary','view_link']));
            }
            request.respond(200, retMessages, 'application/json');
        });
    };    
    RemoteFixture.prototype.messageHandler = function(request, response, urimatch) {
        this.getMessages(function(errCode) {
            if (errCode) { return request.respond(errCode); }
            // Build response
            var message = this.messages[urimatch[1]];
            if (!message) { return request.respond(404); }
            var messageView = new Views.Message(message);
            request.respond(200, messageView.toString(), 'text/html');
        });
    };
    RemoteFixture.prototype.settingsResource = function(resource, request) {
        if (request.matches({ accept:'application/json' })) {
            return request.respond(200, {
                name:this.serviceName
            }, 'application/json');
        } else if (request.matches({ accept:'text/html' })) {
            // :TODO:
            return request.respond(200, 'Remote Fixture Settings', 'text/html');
        }
        return request.nextHandler();
    };
        
    // Helpers
    // =======
    RemoteFixture.prototype.buildMessage = function(id, fields) {
        var message={}, org=this.messages[id];
        if (!org) { return {}; }
        // Assemble the return object from the fields requested
        message.id = id;
        for (var i=0,ii=fields.length; i < ii; i++) {
            if (fields[i] == 'service') {
                message['service'] = this.serviceName;
            } else if (fields[i] == 'date') {
                message['date'] = new Date(org.date);
            } else if (fields[i] == 'summary') {
                message['summary'] = '<strong>' + org.author + '</strong> ' + org.subject;
            } else if (fields[i] == 'view_link') {
                message['view_link'] = this.uri() + '/' + id;
            } else {
                message[fields[i]] = org[fields[i]];
            }
        }
        return message;
    };

    return RemoteFixture;
});