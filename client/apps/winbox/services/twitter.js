// Service - Twitter
// =================
(function() {
    // Cached requests
    var requests = {
        get_auth_url: (new link.Request('http://estate45.com:8002/auth_url')).for_json(),
        get_user: (new link.Request('http://estate45.com:8002/user?oauth_token={{oauth_token}}')).for_json(),
        get_dms: (new link.Request('http://estate45.com:8002/direct_messages?oauth_token={{oauth_token}}')).for_json(),
        post_dm: (new link.Request('http://estate45.com:8002/direct_messages/new')).method('post').headers({'content-type':'application/json'})
    };

    // Route handlers
    var handlers = {};
    handlers.messages = function(request, uri_params, respond) {
        var self = this;
        // Message(s) request
        if (!request.matches({'method':'get', 'accept': 'application/json'})) { return respond(400); }
        if (!this.is_authorized) { return respond(202); }

        // Parse params
        var query = request.get_query();
        try { var req_fields = JSON.parse(query.get('v')); }
        catch(e) { req_fields = []; }
        
        // Send out for DMs
        link.App.handle_request(requests.get_dms.uri_param('oauth_token', this.oauth_token), function(response) {
            // Validate
            if (response.get_status_code() != 200) { return respond(500); }
            
            // Grab messages
            try { var messages = JSON.parse(response.get_body()); }
            catch(e) { console.log(e); return respond(500); }
            
            // Save them in a way we prefer
            self.messages = {};
            for (var i=0, ii=messages.length; i < ii; i++) {
                var message = messages[i];
                save_message.call(self, message);
            }
            
            // Build response
            var ret_messages = {};
            for (var mid in self.messages) {
                ret_messages[mid] = build_message(mid, self.messages[mid], req_fields);
            }
            respond(200, ret_messages, 'application/json');
        });
    };
    handlers.message = function(request, uri_params, respond) {
        // Get message
        var message = get_message(uri_params[1], this.messages);
        if (!message) { return respond(404, 'Message ' + uri_params[1] + ' not found'); }
        // Message view
        if (request.matches({'method':'get', 'accept': 'text/html'})) {
            message.read = true; // Set read
            var html = [
                this.html_message(message),
                '<hr /><a href="', this.config.uri, '/', uri_params[1], '/reply" class="btn">Reply</a>'
            ].join('');
            respond(200, html, 'text/html');
        }
        // Message update
        else if (request.matches({'method':'put', 'accept': 'application/json'})) {
            // Run any updates
            var updates = request.get_body();
            if ('read' in updates) { // "read" state
                message.read = updates.read;
            }
            respond(200);
        } else { respond(400); }
    };
    handlers.reply = function(request, uri_params, respond) {
        // Get message
        var message = get_message(uri_params[1], this.messages);
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
            if (!inputs.body) { errors.body = 'This field is required.'; }
            for (var err in errors) { // basically tests if object is empty
                // Send error response
                var html = [
                    this.html_message(message),'<hr />',
                    this.html_message_form(inputs, errors)
                ].join('');
                return respond(200, html, 'text/html')
            }
            // Build message
            var dm = {
                oauth_token: this.oauth_token,
                screen_name: inputs.recp,
                text: inputs.body                
            };
            // Send to twitter
            var self = this;
            link.App.handle_request(requests.post_dm.body(JSON.stringify(dm)), function(response) {
                if (response.get_status_code() == 200) {
                    var data = JSON.parse(response.get_body());
                    // Add to our messages
                    save_message.call(self, data);
                    // View it
                    respond(303, null, null, { 'location':(self.config.uri + '/' + data.id) });
                } else { console.log(response); } // Dont respond for now
            });
            // Update UI with a status
            // :TODO:
        } else { respond(400); }
    };
    handlers.compose = function(request, uri_params, respond) {
        // Compose view
        if (request.matches({'method':'get', 'accept': 'text/html'})) {
            // Build response
            respond(200, '<legend>Compose New DM</legend>' + this.html_message_form(), 'text/html');
        }
        // Create
        else if (request.matches({'method':'post'})) {
            // Validate
            var inputs = request.get_body();
            var errors = {};
            if (!inputs.recp) { errors.recp = 'This field is required.'; }
            if (!inputs.body) { errors.body = 'This field is required.'; }
            for (var err in errors) { // basically tests if object is empty
                // Send error response
                return respond(200, '<legend>Compose New DM</legend>' + this.html_message_form(inputs, errors), 'text/html');
            }
            // Build message
            var dm = {
                oauth_token: this.oauth_token,
                screen_name: inputs.recp,
                text: inputs.body                
            };
            // Send to twitter
            var self = this;
            link.App.handle_request(requests.post_dm.body(JSON.stringify(dm)), function(response) {
                if (response.get_status_code() == 200) {
                    var data = JSON.parse(response.get_body());
                    // Add to our messages
                    save_message.call(self, data);
                    // View it
                    respond(303, null, null, { 'location':(self.config.uri + '/' + data.id) });
                } else { console.log(response); } // Dont respond for now
            });
            // Update UI with a status
            // :TODO:
        } else { respond(400); }
    };
    handlers.config = function(request, uri_params, respond) {
        // Config fetch
        if (request.matches({'method':'get', 'accept': 'application/json'})) {
            return respond(200, {
                name: 'Twitter',
                compose_link: this.config.uri + '/new',
                config_link: this.config.uri + '/config',
                color: '#2F96B4'
            }, 'application/json');
        }
        // Config interface fetch
        else if (request.matches({'method':'get', 'accept': 'text/html'})) {
            return respond(200, this.html_config_form({ username:this.username }), 'text/html', { 'pragma':'no-alter' });
        }
        // Config update
        else if (request.matches({'method':'post'})) {
            var inputs = request.get_body();
            if (inputs.username) { this.username = inputs.username; }
            document.getElementById('twitter-cfg-title').innerHTML = 'Twitter <span class="label">updated</span>';
            return respond(205);
        } else { respond(400); }
    };
    handlers.auth = function(request, uri_params, respond) {
        // Authorize user
        if (!request.matches({'method':'post'})) { return respond(400); }
        var self = this;
        link.App.handle_request(requests.get_auth_url, function(response) {
            // Validate
            if (response.get_status_code() != 200) { return respond(400); }

            // Parse params
            try { var oauth = JSON.parse(response.get_body()); }
            catch(e) { console.log(e, response.get_body()); return; }
            
            // Update status
            var tstat = document.getElementById('twitter-status');
            if (tstat) { tstat.innerHTML = 'Polling for authorization every 5 seconds...'; }
            
            // Open a window for the user to authorize us
            window.open(oauth.oauth_url,'_blank');
            
            // Hold onto the token and periodically check to see if we've been authorized
            self.oauth_token = oauth.oauth_token;
            self.authcheck_interval_id = window.setInterval(function() {
                // Try to get the user
                link.App.handle_request(requests.get_user.uri_param('oauth_token', self.oauth_token), function(response) {
                    // Update status if still waiting
                    if (response.get_status_code() == 202) { if (tstat) { tstat.innerHTML += ' Waiting...'; return; } }
                    else {
                        // Save data
                        window.clearInterval(self.authcheck_interval_id); // Stop looking
                        self.username = response.get_body();
                        self.is_authorized = true;
                        
                        // Update UI
                        var uname = document.getElementById('twitter-username');
                        if (uname) { uname.value = self.username; }
                        if (tstat) { tstat.innerHTML = 'Authorized!'; }
                    }
                });
            }, 5000);
        });
    };

    // Create our resource type
    link.App.add_resource_type('Winbox.Twitter.Service', {
        // Data
        messages: {},
        oauth_token: null,
        username: "",
        is_authorized: false,

        // Handlers
        "->": {
            '^$': handlers.messages,
            '^/([0-9]+)$': handlers.message,
            '^/([0-9]+)/reply/?$': handlers.reply,
            '^/new/?$': handlers.compose,
            '^/config/?$': handlers.config,
            '^/auth/?$': handlers.auth
        },

        // HTML renderers
        recursive_join: function(arr) {
            for (var i=0, ii=arr.length; i < ii; i++) {
                if (Array.isArray(arr[i])) {
                    arr[i] = this.recursive_join(arr[i]);
                }
            }
            return arr.join('');
        },
        html_message: function(message) {
            var recps = [];
            for (var i=0; i < message.recp.length; i++) {
                var user = message.recp[i];
                recps.push('<span class="label label-info">' + user + '</span>');
            }
            return this.recursive_join([
                '<h2 style="margin-bottom:5px">@', message.author, '</h2>',
                '<p><small>',[
                    'Sent on <span class="label" style="background:#444">', new Date(message.date).toLocaleDateString(), ' @', new Date(message.date).toLocaleTimeString(), '</span>',
                    ' by <span class="label label-success">', message.author, '</span>',
                    ' to ', recps.join(', '),
                    ' with <strong>Twitter</strong>',
                ], '</small></p>',
                '<hr /><p>', message.body, '</p>'
            ]);
        },
        html_form_input: function(element, label, name, classes, value, error, help) {
            return this.recursive_join([
                '<div class="control-group ', (error ? 'error' : ''),'">', [
                    '<label class="control-label" for="', name, '">', label, '</label>',
                    '<div class="controls">', [
                        element(name, classes, value),
                        (help ? '<span class="help-inline">' + help + '</span>' : ''),
                    ], '</div>',
                ], '</div>'
            ]);
        },
        html_form_elems: {
            single: function(id, classes, value) {
                return ['<input type="text" class="input-xlarge ', classes, '" id="twitter-', id, '" name="', id, '"', (value ? 'value="'+value+'"' : ''), ' />'].join('');
            },
            multi: function(id, classes, value) {
                return ['<textarea class="input-xlarge ', classes, '" id="twitter-', id, '" name="', id, '" rows="7">', (value ? value : ''), '</textarea>'].join('');
            },
            username: function(id, classes, value) {
                return ['<div class="input-prepend"><span class="add-on">@</span><input type="text" disabled="disabled" class="input-xlarge ', classes, '" id="twitter-', id, '" name="', id, '"', (value ? 'value="'+value+'"' : ''), ' /></div>'].join('');
            },
            button: function(id, classes, value) {
                return ['<button id="twitter-', id, '" class="btn ', classes, '">', value, '</button></div>'].join('');
            }
        },
        html_message_form: function(values, errors) {
            if (!values) { values = {}; }
            if (!errors) { errors = {}; }
            return this.recursive_join([
                '<form class="form-horizontal" method="post" action="">', [
                    this.html_form_input(this.html_form_elems.single, 'To:', 'recp', 'span4', values.recp, errors.recp, errors.recp),
                    this.html_form_input(this.html_form_elems.multi, 'Message:', 'body', 'span5', values.body, errors.body, errors.body),
                    '<div class="form-actions"><button type="submit" class="btn btn-primary">Send</button>',
                ], '</form>'
            ]);
        },
        html_config_form: function(values, errors) {
            if (!values) { values = {}; }
            if (!errors) { errors = {}; }
            return this.recursive_join([
                '<h4 id="twitter-cfg-title">Twitter</h4>',
                '<form class="form-horizontal" method="post" action="', this.config.uri, '/auth">', [
                    this.html_form_input(this.html_form_elems.username, 'Username:', 'username', 'span3', values.username, errors.username, '<em id="twitter-status">' + (this.is_authorized ? 'Authorized' : 'Unauthorized') + '<em>'),
                    this.html_form_input(this.html_form_elems.button, '', '', 'btn-info', '<i class="icon-ok-sign icon-white"></i> ' + (this.is_authorized ? 'Re-' : '') + 'Connect to Twitter'),
                ], '</form>'
            ]);
        }
    });

    // Helpers
    var get_message = function(uri_param, messages) {
        var message = null;
        if (uri_param && uri_param in messages) {
            message = messages[uri_param];
        }
        return message;
    };
    var build_message = function(id, org, fields) {
        var message = {};
        if (!org) { return null; }
        // Assemble the return object from the fields requested
        for (var i=0,ii=fields.length; i < ii; i++) {
            if (fields[i] == 'service') {
                message['service'] = 'Twitter';
            } else if (fields[i] == 'summary') {
                message['summary'] = '<strong>' + org.author + '</strong> ' + org.body;
            } else {
                message[fields[i]] = org[fields[i]];
            }
        }
        return message;
    };
    var save_message = function(data) {        
        this.messages[data.id] = {
            date: new Date(data.created_at),
            author: data.sender_screen_name,
            recp: [data.recipient_screen_name],
            body: data.text,
            view_link: this.config.uri + '/' + data.id,
            read: true
        };
    };
})();