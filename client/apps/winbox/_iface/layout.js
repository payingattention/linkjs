// Iface - Shell
//   GET text/html: responds with the shell interface's HTML
//   POST application/json: enacts the specified command(s)
//     {'highlight-nav': { 'label': '<target>' }}: highlight 'target' in the nav
link.App.configure('#/winbox/_iface/layout', {
    "->": function(request, agent, callback) {
        var self = this;
        // Interface HTML request
        if (request.matches({'accept':'text/html'})) {
            var content = '';
            if (request.matches({'method': 'post'})) { content = request.get_body(); }
            var html = Handlebars.templates['winbox-layout.html']({content: content});
            callback((new link.Response(200)).body(html,'text/html'));
        }
        // Interaction request
        /*else if (request.matches({'method':'post', 'accept': 'application/json'})) {
            var nav = $('#winbox-nav');
            var body = request.get_body();    
            // Remove current highlight
            nav.find('.active').removeClass('active').find('.icon-white').removeClass('icon-white');
            // Set given item's highlight
            nav.find(":contains('"+body.label+"')").closest('li').addClass('active').find('i').addClass('icon-white');
            callback(new link.Response(200));
        }*/
    },
    "->requires": ['/apps/winbox/templates/templates.js']
});