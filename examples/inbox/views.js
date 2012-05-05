(function(Views) {
    // Nav
    // ======
    var navTmplElem = document.getElementById('nav-template');
    var Nav = Tint.compile(navTmplElem.innerHTML, function() {
        this.item().header('Inbox');
        this.item().link('Messages', 'inbox', '#');
        this.item().link('Settings', 'cog', '#/settings');
        this.item().header('Services');
    });
    Nav.prototype.addService = function(service) {
        this.item().link(service.name, 'envelope', service.uri)
    };
    
    // Inbox
    // =====
    var inboxTmplElem = document.getElementById('inbox-template');
    var Inbox = Tint.compile(inboxTmplElem.innerHTML, function(uri) {
        this.inboxUri = uri;
    });
    Inbox.prototype.addMessages = function(messages) {
        if (!messages) { return ''; }
        // Sort by date
        messages.sort(function(a,b) { return ((a.date.getTime() < b.date.getTime()) ? 1 : -1); });
        // Add to template
        for (var i=0; i < messages.length; i++) {
            this.addMessage(messages[i]);
        }        
    };
    Inbox.prototype.addMessage = function(message) {
        this.message(message.service, message.view_link, message.summary, new Date(message.date).toLocaleDateString() + ' @' + new Date(message.date).toLocaleTimeString());
    };

    // Message
    // =======
    var messageTmplElem = document.getElementById('message-template');
    var Message = Tint.compile(messageTmplElem.innerHTML, function(message) {
        this.subject = message.subject;
        this.date = new Date(message.date).toLocaleDateString();
        this.time = new Date(message.date).toLocaleTimeString();
        this.author = message.author;
        for (var i=0; i < message.recp.length; i++) {
            if (i < message.recp.length - 1) {
                this.recp().add(message.recp[i]);
            } else {
                this.recp().last(message.recp[i]);
            }
        }
        this.body = message.body;
    });

    // Export
    Views.Nav = Nav;
    Views.Inbox = Inbox;
    Views.Message = Message;
})(Views);