define(['link/tint', 'text!templates/layout.html', 'text!templates/inbox.html'], function(Tint, layoutHtml, inboxHtml) {
    // Pre-compile templates
    var LayoutTmpl = Tint.compile(layoutHtml);
    var InboxTmpl = Tint.compile(inboxHtml);
    
    // Views
    var Views = {};
    Views.layout = function(inboxService, content) {
        var tmpl = new LayoutTmpl();
        
        // Static nav
        tmpl.nav.item().header('Inbox');
        tmpl.nav.item().link('Messages', 'inbox', inboxService.uri());
        tmpl.nav.item().link('Settings', 'cog', inboxService.uri() + '/settings');
        
        // Services
        tmpl.nav.item().header('Services');
        for (var slug in inboxService.services) {
            var service = inboxService.services[slug];
            if (!service || !service.settings) { continue; }
            tmpl.nav.item().link(service.settings.name, 'envelope', service.uri);
        }
        
        // Content
        tmpl.content = content;

        return tmpl.toString();
    };
    Views.inbox = function(inbox, messages) {
        if (!messages) { return ''; }
        var tmpl = new InboxTmpl();
        tmpl.inboxUri = inbox.uri();
        
        // Sort by date
        messages.sort(function(a,b) { return ((a.date.getTime() < b.date.getTime()) ? 1 : -1); });
        
        // Add to template
        for (var i=0; i < messages.length; i++) {
            var message = messages[i];
            tmpl.message(message.service, message.view_link, message.summary, new Date(message.date).toLocaleDateString() + ' @' + new Date(message.date).toLocaleTimeString());
        }

        return tmpl.toString();
    };
    Views.settings = function(content) {
        return content;
    };
    Views.error = function(message) {
        return ['<div class="alert alert-error">', message, '</div>'].join('');
    };

    // Export
    return Views;
});