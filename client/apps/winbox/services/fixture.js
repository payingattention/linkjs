// Service - Fixture
// =================
// GET '/' application/json: message fetch
// - provides messages in an object with keys=message_ids
// - query params:
//   - '?v=[<field1>,<field2>,...<fieldN>]' specify values to fetch
//     - 'service' name of the origin service {service:<String>}
//     - 'date' date the message was received {date:<Date>}
//     - 'author' user who sent the message {author:<id String>}
//     - 'recp' users involved in the message [<id String>...]
//     - 'summary' a summary line of the message {summary:<any value>}
//     - 'body' the body of the message {body:<any value>}
//     - 'view_link' the uri of the message view renderer {view_link:<uri String>}
//   - '?offset=<:decimal>' specify a start offset, when retrieving a list
//   - '?limit=<:decimal>' specify a maximum number to fetch, when retrieving a list
// =================
// GET '/new' text/html: compose view
// - provides an interface for composing the message
// =================
// POST '/new' :TODO: : message send
// - body params:
//   - '{ recp: [<user_id1>,<user_id2>,...<user_idN>] }' users this message should go to
//   - '{ subject: <any value> }' the subject of the message
//   - '{ body: <any value> }' the contents of the message
// =================
// GET '/:id' text/html: message view
// - provides an interface for viewing the message
// =================
// GET '/:id/reply' text/html: compose reply view
// - provides an interface for composing the reply
// =================
// POST '/:id/reply' :TODO: : reply send
// - provides an interface for viewing the message
// - body params:
//   - '{ recp: [<user_id1>,<user_id2>,...<user_idN>] }' users this message should go to
//   - '{ subject: <any value> }' the subject of the message
//   - '{ body: <any value> }' the contents of the message
// =================
// PUT '/:id' application/json: message update
// - :id must map to an existing message
// - body params:
//   - '{ read: <bool> }' whether this message has been read
// =================
// GET '/config' application/json: service config fetch
// - provides config information regarding this service
//   - '{ name: <string> }' the name of this service
// =================
// GET '/config' text/html: service config interface fetch
// - provides an interface for updating this service's config
// =================
// PUT '/config' application/x-www-form-urlencoded: service config update
// =================

link.App.add_resource_type('Winbox.Fixture.Service', {
    // Data
    "messages": {
        '1': { date:new Date() - Math.random() * 300000, author:'rodger', recp:['bsmith'], subject:'Hey, Buddy!', body:'How are you doing?', re:null, read:false },
        '2': { date:new Date() - Math.random() * 300000, author:'bsmith', recp:['bsmith', 'asmitherson'], subject:'About the meeting', body:'Important business conversation. Things people talk about and stuff', re:null, read:true },
        '3': { date:new Date() - Math.random() * 300000, author:'asmitherson', recp:['bsmith', 'asmitherson'], subject:'RE: About the meeting', body:'Other stuff about business or whatever.', re:2, read:false }
    },

    // Handlers
    "->": {
        '^$': function(request, uri_params, respond) {
            var self = this;
            // Message(s) request
            if (request.matches({'method':'get', 'accept': 'application/json'})) {
                // :TODO: offset & limit
                var query = request.get_query();
                try { var req_fields = JSON.parse(query.get('v')); }
                catch(e) { req_fields = []; }
                // Collect messages
                var ret_messages = {};
                for (var mid in this.messages) {
                    ret_messages[mid] = this.build_message(mid,req_fields);
                }
                respond(200, ret_messages, 'application/json');
            }
            // Message send
            // :TODO:
        },
        '^/([0-9]+)$': function(request, uri_params, respond) {
            // Message view
            if (request.matches({'method':'get', 'accept': 'text/html'})) {
                // Get message
                var message = this.get_message(uri_params[1]);
                if (!message) { return respond(404, 'Message ' + uri_params[1] + ' not found'); }
                // Respond
                var html = [
                    this.html_message(message),
                    '<hr /><a href="', this.config.uri, '/', uri_params[1], '/reply" class="btn">Reply</a>'
                ].join('');
                respond(200, html, 'text/html');
            }
            // Message update
            else if (request.matches({'method':'put', 'accept': 'application/json'})) {
                // Get message
                var message = this.get_message(uri_params[1]);
                if (!message) { return respond(404, 'Message ' + uri_params[1] + ' not found'); }
                // Update...
                var updates = request.get_body();
                if (read in updates) { // "read" state
                    message.read = updates.read;
                }
                respond(200);
            } else { respond(400); }
        },
        '^/([0-9]+)/reply/?$': function(request, uri_params, respond) {
            // Get message
            var message = this.get_message(uri_params[1]);
            if (!message) { return respond(404, 'Message ' + uri_params[1] + ' not found'); }
            
            // Reply view
            if (request.matches({'method':'get', 'accept': 'text/html'})) {
                // Build response
                var html = [
                    this.html_message(message),'<hr />',
                    this.html_message_form({ recp:message.recp.join(', '), subject:'RE: '+message.subject, body: '> '+message.body })
                ].join('');
                respond(200, html, 'text/html');
            }
            // Create
            else if (request.matches({'method':'post'})) {
                // Validate
                var inputs = request.get_body();
                var errors = {};
                if (!inputs.recp) { errors.recp = 'This field is required.'; }
                if (!inputs.subject) { errors.subject = 'This field is required.'; }
                if (!inputs.body) { errors.body = 'This field is required.'; }
                for (var err in errors) { // basically tests if object is empty
                    // Send error response
                    var html = [
                        this.html_message(message),'<hr />',
                        this.html_message_form(inputs, errors)
                    ].join('');
                    return respond(200, html, 'text/html')
                }
                // Build new message
                inputs.recp = inputs.recp.split(',');
                inputs.date = new Date();
                inputs.author = 'winboxuser';
                inputs.re = uri_params[1];
                inputs.read = true;
                var new_id = this.get_new_msg_id();
                this.messages[new_id] = inputs;
                respond(303, null, null, { 'location':(this.config.uri + '/' + new_id) });
            } else { respond(400); }
        },
        '^/new/?$': function(request, uri_params, respond) {
            // Compose view
            if (request.matches({'method':'get', 'accept': 'text/html'})) {
                // Build response
                respond(200, '<legend>Compose New Message</legend>' + this.html_message_form(), 'text/html');
            }
            // Create
            else if (request.matches({'method':'post'})) {
                // Validate
                var inputs = request.get_body();
                var errors = {};
                if (!inputs.recp) { errors.recp = 'This field is required.'; }
                if (!inputs.subject) { errors.subject = 'This field is required.'; }
                if (!inputs.body) { errors.body = 'This field is required.'; }
                for (var err in errors) { // basically tests if object is empty
                    // Send error response
                    return respond(200, '<legend>Compose New Message</legend>' + this.html_message_form(inputs, errors), 'text/html');
                }
                // Build new message
                inputs.recp = inputs.recp.split(',');
                inputs.date = new Date();
                inputs.author = 'winboxuser';
                inputs.re = null;
                inputs.read = true;
                var new_id = this.get_new_msg_id();
                this.messages[new_id] = inputs;
                respond(303, null, null, { 'location':(this.config.uri + '/' + new_id) });
            } else { respond(400); }
        },
        '^/config$': function(request, uri_params, respond) {
            // Config fetch
            if (request.matches({'method':'get', 'accept': 'application/json'})) {
                return respond(200, {
                    name: 'Fixture',
                    compose_link: this.config.uri + '/new',
                    config_link: this.config.uri + '/config'
                }, 'application/json');
            }
            // Config interface fetch
            else if (request.matches({'method':'get', 'accept': 'text/html'})) {
                return respond(200, 'todo', 'text/html', { 'pragma':'no-alter' });
            }
            // Config update
            // :TODO:
        }
    },

    // Helpers
    get_message: function(uri_param) {
        var message = null;
        if (uri_param && uri_param in this.messages) {
            message = this.messages[uri_param];
        }
        return message;
    },
    build_message: function(id, fields) {
        var message = {},
        org = this.messages[id];
        if (!org) { return null; }
        // Assemble the return object from the fields requested
        for (var i=0,ii=fields.length; i < ii; i++) {
            if (fields[i] == 'service') {
                message['service'] = 'Fixture';
            } else if (fields[i] == 'summary') {
                message['summary'] = '<strong>' + org.author + '</strong> ' + org.subject;
            } else if (fields[i] == 'view_link') {
                message['view_link'] = this.config.uri + '/' + id;
            } else {
                message[fields[i]] = org[fields[i]];
            }
        }
        return message;
    },
    get_new_msg_id: function() {
        for (var id=1; id < Number.MAX_VALUE; id++) {
            if (!(id in this.messages)) {
                return id;
            }
        }
        return null; // lets assume this never happens
    },

    // HTML renderers
    html_message: function(message) {
        var recps = [];
        for (var i=0; i < message.recp.length; i++) {
            var user = message.recp[i];
            recps.push('<span class="label label-info">' + user + '</span>');
        }
        return [
            '<h2 style="margin-bottom:5px">', message.subject, '</h2>',
            '<p><small>',
            'Sent on <span class="label" style="background:#444">', new Date(message.date).toLocaleDateString(), ' @', new Date(message.date).toLocaleTimeString(), '</span>',
            ' by <span class="label label-success">', message.author, '</span>',
            ' to ', recps.join(', '),
            ' with <strong>Fixture</strong>',
            '</small></p>',
            '<hr /><p>', message.body, '</p>'
        ].join('');
    },
    html_message_form: function(values, errors) {
        if (!values) { values = {}; }
        if (!errors) { errors = {}; }
        var multi = function(id, classes, value) {
            return ['<textarea class="input-xlarge ', classes, '" id="', id, '" name="', id, '" rows="12">', (value ? value : ''), '</textarea>'].join('');
        };
        var single = function(id, classes, value) {
            return ['<input type="text" class="input-xlarge ', classes, '" id="', id, '" name="', id, '"', (value ? 'value="'+value+'"' : ''), ' />'].join('');
        };
        var input = function(element, label, name, classes, value, error) {
            return [
                '<div class="control-group ', (error ? 'error' : ''),'">',
                '<label class="control-label" for="', name, '">', label, '</label>',
                '<div class="controls">',
                element(name, classes, value),
                (error ? '<span class="help-inline">' + error + '</span>' : ''),
                '</div>',
                '</div>'
            ].join('');
        };
        return [
            '<form class="form-horizontal" method="post" action="">',
            input(single, 'To:', 'recp', 'span8', values.recp, errors.recp),
            input(single, 'Subject:', 'subject', 'span10', values.subject, errors.subject),
            input(multi, 'Message:', 'body', 'span10', values.body, errors.body),
            '<div class="form-actions"><button type="submit" class="btn btn-primary">Send</button>',
            '</form>'
        ].join('');
    }
});