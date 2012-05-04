define(['link/tint', 'text!templates/layout.html', 'text!templates/inbox.html'], function(Tint, layoutHtml, inboxHtml) {
    
    // Layout
    // ======
    var Layout = Tint.compile(layoutHtml, function(baseUri, content) {
        this.baseUri = baseUri;
        // Standard nav
        this.nav.item().header('Inbox');
        this.nav.item().link('Messages', 'inbox', baseUri);
        this.nav.item().link('Settings', 'cog', baseUri + '/settings');
        this.nav.item().header('Services');
        // Set content
        this.content = content;
    });
    Layout.prototype.addNavService = function(service) {
        if (!service || !service.settings) { return; }
        this.nav.item().link(service.settings.name, 'envelope', this.baseUri + service.uri)
    };
    
    // Inbox
    // =====
    var Inbox = Tint.compile(inboxHtml, function(uri) {
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

    // Export
    return {
        Layout:Layout,
        Inbox:Inbox
    };
});