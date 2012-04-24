define(function() {
    // Templates
    var templates = {};
    templates.layout = function(inboxService, innerHtml) {
        // Nav
        // :TODO: active item
        var navHtmlParts = [
            '<li class="nav-header">Services</li>'
        ];
        for (var slug in inboxService.services) {
            var service = inboxService.services[slug];
            if (!service || !service.settings) { continue; }
            navHtmlParts.push('<li><a href="', service.uri, '"><i class="icon-envelope"></i> ', service.settings.name, '</a></li>');
        }
        // Layout
        return recursive_join([
            '<div id="inbox-container">', [
                '<div id="inbox-nav" class="well">', [
                    '<ul class="nav nav-list">', [
                        '<li class="nav-header">Inbox</li>',
                        '<li><a href="', inboxService.uri(), '"><i class="icon-inbox"></i> Messages</a></li>',
                        '<li><a href="', inboxService.uri(), '/settings"><i class="icon-cog"></i> Settings</a></li>',
                        recursive_join(navHtmlParts),
                    ], '</ul>'
                ], '</div>',
                '<div id="inbox-content">', innerHtml, '</div>'
            ], '</div>'
        ]);
    };
    templates.inbox = function(inbox, messages) {
        if (!messages) { return ''; }
        // Sort by date
        messages.sort(function(a,b) { return ((a.date.getTime() < b.date.getTime()) ? 1 : -1); });
        // Generate message html
        var messageHtmlParts = [];
        for (var i=0; i < messages.length; i++) {
            var message = messages[i];
            messageHtmlParts.push('<tr><td><span class="label">' + message.service + '</span></td><td><a href="' + message.view_link + '">' + message.summary + '</a></td><td>' + new Date(message.date).toLocaleDateString() + ' @' + new Date(message.date).toLocaleTimeString() + '</td></tr>');
        }
        // Generate layout html
        return recursive_join([
            '<div class="toolbar">', [
                '<form method="post">', [
                    '<button class="btn" formaction="', inbox.uri(), '/sync" title="Check for new messages"><i class="icon-refresh"></i></button>',
                ], '</form>'
            ], '</div>',
            '<table class="table table-condensed">', recursive_join(messageHtmlParts), '</table>'
        ]);
    };
    templates.settings = function(innerHTML) {
        return recursive_join([
            innerHTML
        ]);
    };
    templates.error = function(message) {
        return recursive_join([
            '<div class="alert alert-error">', message, '</div>'
        ]);
    };

    // Helper
    var recursive_join = function(arr) {
        for (var i=0, ii=arr.length; i < ii; i++) {
            if (Array.isArray(arr[i])) {
                arr[i] = recursive_join(arr[i]);
            }
        }
        return arr.join('');
    };

    // Export
    return templates;
});