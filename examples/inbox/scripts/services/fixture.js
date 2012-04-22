define(['local/module', './templates'], function(Module, templates) {
    // Module Definition
    // =================
    var FixtureService = new Module({
        // Attributes
        messages: {},
        username: "fixtureuser",

        // Helpers
        buildMessage:function(id, fields) {
            var message={}, org=this.messages[id];
            if (!org) { return {}; }
            // Assemble the return object from the fields requested
            for (var i=0,ii=fields.length; i < ii; i++) {
                if (fields[i] == 'service') {
                    message['service'] = 'Fixture';
                } else if (fields[i] == 'summary') {
                    message['summary'] = '<strong>' + org.author + '</strong> ' + org.subject;
                } else if (fields[i] == 'view_link') {
                    message['view_link'] = this.uri('./'+id);
                } else {
                    message[fields[i]] = org[fields[i]];
                }
            }
            return message;
        },
        getNewID: function() {
            for (var id=1; id < Number.MAX_VALUE; id++) {
                if (!(id in this.messages)) {
                    return id;
                }
            }
            return null; // lets assume this never happens
        },
        templates:templates
    });

    // Routes
    // ======
    FixtureService.get({ uri:'^$', accept:'application/json' }, messagesJsonHandler);
    FixtureService.get({ uri:'/([0-9]+)/?^$', accept:'text/html' }, messageHtmlHandler);
    FixtureService.get({ uri:'/settings/?^$', accept:'application/json' }, settingsJsonHandler);
    FixtureService.get({ uri:'/settings/?^$', accept:'text/html' }, settingsHtmlHandler);

    // Handlers
    // ========
    var messagesJsonHandler = function(request) {
        // Collect messages
        var retMessages = {};
        for (var mid in this.messages) {
            retMessages[mid] = this.buildMessage(mid, ['service','date','summary','view_link']);
        }
        request.respond(200, retMessages, 'application/json');
    };
    var messageHtmlHandler = function(request, response, urimatch) {
        var message = this.messages[urimatch[1]];
        if (!message) { return request.respond(404); }
        request.respond(200, this.templates.message(message), 'text/html');
    };
    var settingsJsonHandler = function(request) {
        request.respond(200, {
            name: 'Fixture',
            color: '#aaa',
            username: this.username
        }, 'application/json');
    };
    var settingsHtmlHandler = function(request) {
        // :TODO:
        request.respond(200, 'Fixture Settings', 'text/html');
    };

    // Fixture Data
    // ============
    FixtureService.messages['1'] = { date:new Date(), author:'rodger', recp:['bsmith'], subject:'Hey, Buddy!', body:'How are you doing?', re:null };
    FixtureService.messages['2'] = { date:new Date(), author:'bsmith', recp:['bsmith', 'asmitherson'], subject:'About the meeting', body:'Important business conversation. Things people talk about and stuff', re:null };
    FixtureService.messages['3'] = { date:new Date(), author:'asmitherson', recp:['bsmith', 'asmitherson'], subject:'RE: About the meeting', body:'Other stuff about business or whatever.', re:2 };

    return FixtureService;
});