define(['link/module', './views'], function(Module, Views) {
    // Fixture
    // =======
    // Provides static debug data
    var FixtureService = Module({
        // Handler routes
        routes:[
            { cb:'messagesHandler', uri:'^/?$', accept:'js/array' },
            { cb:'messageHtmlHandler', uri:'^/([0-9]+)/?$', accept:'text/html' },
            { cb:'settingsHandler', uri:'^/settings/?$' }
        ],
        // Attributes
        serviceName:'Local',
        // Fixture data
        messages: [
            { date:new Date('April 23 2012 21:20'), author:'rodger', recp:['bsmith'], subject:'Hey, Buddy!', body:'How are you doing?', re:null },
            { date:new Date('April 24 2012 12:49'), author:'bsmith', recp:['bsmith', 'asmitherson'], subject:'About the meeting', body:'Important business conversation. Things people talk about and stuff', re:null },
            { date:new Date('April 25 2012 15:12'), author:'asmitherson', recp:['bsmith', 'asmitherson'], subject:'RE: About the meeting', body:'Other stuff about business or whatever.', re:2 }
        ]
    });
    
    // Handlers
    // ========
    FixtureService.prototype.messagesHandler = function(request) {
        // Collect messages
        var retMessages = [];
        _.each(this.messages, function(message, mid) {
            retMessages.push({
                id:mid,
                service:this.serviceName,
                date:message.date,
                summary:'<strong>' + message.author + '</strong> ' + message.subject,
                view_link:this.uri + '/' + mid
            });
        }, this);
        return { code:200, body:retMessages, contenttype:'js/array' };
    };    
    FixtureService.prototype.messageHtmlHandler = function(request, response, urimatch) {
        // Find message
        var message = this.messages[urimatch[1]];
        if (!message) { return { code:404 }; }
        // Build html
        var messageView = new Views.Message(message);
        return { code:200, body:messageView.toString(), contenttype:'text/html' };
    };
    FixtureService.prototype.settingsHandler = function(request) {
        if (request.accept == 'js/object') {
            return { code:200, body:{ name:this.serviceName }, contenttype:'js/array' };
        } else if (request.accept == 'text/html') {
            // :TODO:
            return { code:200, body:'Fixture Settings', contenttype:'text/html' };
        }
    };

    return FixtureService;
});