define(['link/module', './templates'], function(Module, templates) {
    // Fixture
    // =======
    // Provides static debug data
    var FixtureService = Module(function() {
        // Attributes
        this.messages = {};

        // Fixture data
        this.messages['1'] = { date:new Date(), author:'rodger', recp:['bsmith'], subject:'Hey, Buddy!', body:'How are you doing?', re:null };
        this.messages['2'] = { date:new Date(), author:'bsmith', recp:['bsmith', 'asmitherson'], subject:'About the meeting', body:'Important business conversation. Things people talk about and stuff', re:null };
        this.messages['3'] = { date:new Date(), author:'asmitherson', recp:['bsmith', 'asmitherson'], subject:'RE: About the meeting', body:'Other stuff about business or whatever.', re:2 };
    });
    
    // Routes
    // ======
    FixtureService.get({ uri:'^$', accept:'application/json' }, 'messagesJsonHandler');
    FixtureService.get({ uri:'^/([0-9]+)/?$', accept:'text/html' }, 'messageHtmlHandler');
    FixtureService.get({ uri:'^/settings/?$', accept:'application/json' }, 'settingsJsonHandler');
    FixtureService.get({ uri:'^/settings/?$', accept:'text/html' }, 'settingsHtmlHandler');

    // Handlers
    // ========
    FixtureService.prototype.messagesJsonHandler = function(request) {
        // Collect messages
        var retMessages = [];
        for (var mid in this.messages) {
            retMessages.push(this.buildMessage(mid, ['service','date','summary','view_link']));
        }
        request.respond(200, retMessages, 'application/json');
    };    
    FixtureService.prototype.messageHtmlHandler = function(request, response, urimatch) {
        var message = this.messages[urimatch[1]];
        if (!message) { return request.respond(404); }
        request.respond(200, this.templates.message(message), 'text/html');
    };
    FixtureService.prototype.settingsJsonHandler = function(request) {
        request.respond(200, {
            name: 'Fixture'
        }, 'application/json');
    };
    FixtureService.prototype.settingsHtmlHandler = function(request) {
        // :TODO:
        request.respond(200, 'Fixture Settings', 'text/html');
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
                message['service'] = 'Fixture';
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
    FixtureService.prototype.templates = templates;

    return FixtureService;
});