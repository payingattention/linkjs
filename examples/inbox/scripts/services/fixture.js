define(['link/module', './views'], function(Module, Views) {
    // Fixture
    // =======
    // Provides static debug data
    var FixtureService = Module({}, function() {
        // Attributes
        this.messages = {};
        this.serviceName = "Local";

        // Fixed resources
        this.addResource('/', this.messagesResource);
        this.addResource('/settings', this.settingsResource);

        // Fixture data
        this.messages['1'] = this.addResource('/1', this.messageResource, { date:'April 23 2012 21:20', author:'rodger', recp:['bsmith'], subject:'Hey, Buddy!', body:'How are you doing?', re:null });
        this.messages['2'] = this.addResource('/2', this.messageResource, { date:'April 24 2012 12:49', author:'bsmith', recp:['bsmith', 'asmitherson'], subject:'About the meeting', body:'Important business conversation. Things people talk about and stuff', re:null });
        this.messages['3'] = this.addResource('/3', this.messageResource, { date:'April 25 2012 15:12', author:'asmitherson', recp:['bsmith', 'asmitherson'], subject:'RE: About the meeting', body:'Other stuff about business or whatever.', re:2 });
    });
    
    // Resources
    // ========
    FixtureService.prototype.messagesResource = function(resource, request) {
        if (request.matches({ 'accept':'application/json' })) {
            // Collect messages
            var retMessages = [];
            for (var mid in this.messages) {
                retMessages.push(this.buildMessage(mid, ['service','date','summary','view_link']));
            }
            return request.respond(200, retMessages, 'application/json');
        }
        return request.nextHandler();
    };    
    FixtureService.prototype.messageResource = function(resource, request) {
        var messageView = new Views.Message(resource);
        request.respond(200, messageView.toString(), 'text/html');
    };
    FixtureService.prototype.settingsResource = function(resource, request) {
        if (request.matches({ accept:'application/json' })) {
            return request.respond(200, {
                name:this.serviceName
            }, 'application/json');
        } else if (request.matches({ accept:'text/html' })) {
            // :TODO:
            return request.respond(200, 'Fixture Settings', 'text/html');
        }
        return request.nextHandler();
    };

    // Helpers
    // =======
    FixtureService.prototype.buildMessage = function(id, fields) {
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
    FixtureService.prototype.getNewID = function() {
        for (var id=1; id < Number.MAX_VALUE; id++) {
            if (!(id in this.messages)) {
                return id;
            }
        }
        return null; // lets assume this never happens
    };

    return FixtureService;
});