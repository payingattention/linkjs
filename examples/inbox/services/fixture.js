(function(Modules) {
    // Fixture
    // =======
    // Provides static debug data
    var FixtureService = function(name) {
        this.serviceName = name;
        // fixture data
        this.messages = [
            { date:new Date('April 23 2012 21:20'), author:'rodger', recp:['bsmith'], subject:'Hey, Buddy!', body:'How are you doing?', re:null },
            { date:new Date('April 24 2012 12:49'), author:'bsmith', recp:['bsmith', 'asmitherson'], subject:'About the meeting', body:'Important business conversation. Things people talk about and stuff', re:null },
            { date:new Date('April 25 2012 15:12'), author:'asmitherson', recp:['bsmith', 'asmitherson'], subject:'RE: About the meeting', body:'Other stuff about business or whatever.', re:2 }
        ];
    };

    // Resource Metadata
    // =================
    FixtureService.prototype.resources = {
        '/':{
            desc:'Fake message source.',
            _get:'Provides messages from static data.',
            validate:function(request) {
                if (request.method != 'get') { throw { code:405, reason:'bad method' }; }
                if (request.accept && request.accept.indexOf('object') == -1) { throw { code:406, reason:'not acceptable' }; }
            }
        }
    };
    
    // Handler Routes
    // ==============
    FixtureService.prototype.routes = [
        { cb:'messagesHandler', uri:'^/?$', accept:'js/object' },
        { cb:'messageHtmlHandler', uri:'^/([0-9]+)/?$', accept:'text/html' }
    ];
    
    // Handlers
    // ========
    FixtureService.prototype.messagesHandler = function(request) {
        // Collect messages
        var retMessages = [];
        for (var i=0; i < this.messages.length; i++) {
            var message = this.messages[i];
            retMessages.push({
                id:i,
                service:this.serviceName,
                date:message.date,
                summary:'<strong>' + message.author + '</strong> ' + message.subject,
                view_link:this.uri + '/' + i
            });
        }
        return { code:200, body:retMessages, 'content-type':'js/object' };
    };    
    FixtureService.prototype.messageHtmlHandler = function(request, response, match) {
        // Find message
        var message = this.messages[match.uri[1]];
        if (!message) { return { code:404 }; }
        // Build html
        var messageView = new Views.Message(message);
        return { code:200, body:messageView.toString(), 'content-type':'text/html' };
    };

    // Export
    Modules.FixtureService = FixtureService;
})(Modules);