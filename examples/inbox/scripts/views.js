define(['link/tint', 'text!templates/layout.html', 'text!templates/inbox.html'], function(Tint, layoutHtml, inboxHtml) {
    
    // Layout
    // ======
    var LayoutView = Tint.compile(layoutHtml, function(baseUri, content) {
        // Standard nav
        this.nav.item().header('Inbox');
        this.nav.item().link('Messages', 'inbox', baseUri;
        this.nav.item().link('Settings', 'cog', baseUri + '/settings');
        this.nav.item().header('Services');
        // Set content
        this.content = content;
    });
    LayoutView.addNavService = function(service) {
        if (!service || !service.settings) { return; }
        this.nav.item().link(service.settings.name, 'envelope', service.uri)
    };
    
    // Inbox
    // =====
    var InboxView = Tint.compile(inboxHtml, function(uri) {
        this.inboxUri = uri;
    });
    InboxView.addMessages = function(messages) {
        if (!messages) { return ''; }
        // Sort by date
        messages.sort(function(a,b) { return ((a.date.getTime() < b.date.getTime()) ? 1 : -1); });
        // Add to template
        for (var i=0; i < messages.length; i++) {
            this.addMessage(messages[i]);
        }        
    };
    InboxView.addMessage = function(message) {
        this.message(message.service, message.view_link, message.summary, new Date(message.date).toLocaleDateString() + ' @' + new Date(message.date).toLocaleTimeString());
    };
    
    // OLD
    // ===
    Views.settings = function(content) {
        return content;
    };
    Views.error = function(message) {
        return ['<div class="alert alert-error">', message, '</div>'].join('');
    };

    // Export :TODO:
    return Views;
});