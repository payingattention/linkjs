// Service - Fixture
// =================
// GET '/' application/json: message fetch
// - provides messages in an object with keys=message_ids and values=fields_requested
// - query params:
//   - '?v=[<field1>,<field2>,...<fieldN>]' specify values to fetch
//     - 'service' name of the origin service {service:<String>}
//     - 'date' date the message was received {date:<Date>}
//     - 'author' user who sent the message {author:<id string>}
//     - 'recp' users involved in the message {recp:{<id String>:<name String>...}}
//     - 'summary' a summary line of the message {summary:<any value>}
//     - 'body' the body of the message {body:<any value>}
//   - '?q=<query>' specify which messages to fetch
//     - 'unread' a list of unread messages
//     - 'byid' a list of messages by id (requires '&q_id')
//     - 'all' a list of messages with no filtering process
//   - '?q_id=<id>'|'?q_id=[<id1>,<id2>,...<idN>]' specify messages to retrieve by id (requires 'q=byid')
//   - '?offset=<:decimal>' specify a start offset, when retrieving a list
//   - '?limit=<:decimal>' specify a maximum number to fetch, when retrieving a list
// =================
// POST '/' application/json: message send
// - body params:
//   - '{ re: <message_id> }' message this new message replies to
//   - '{ recp: [<user_id1>,<user_id2>,...<user_idN>] }' users this message should go to
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

link.App.configure('#/winbox/services/fixture', {
    // Data
    "service": "Scaffold",
    "messages": {
        '1': { date:new Date(), author:'bsmith', recp:{ 'bsmith':'Bob Smith' }, subject:'Hey, Buddy!', body:'How are you doing?', re:null, read:false },
        '2': { date:new Date(), author:'bsmith', recp:{ 'bsmith':'Bob Smith', 'asmitherson':'Alice Smitherson' }, subject:'About the meeting', body:'Important business conversation. Things people talk about and stuff', re:null, read:true },
        '3': { date:new Date(), author:'asmitherson', recp:{ 'bsmith':'Bob Smith', 'asmitherson':'Alice Smitherson' }, subject:'About the meeting', body:'Important business conversation. Things people talk about and stuff', re:2, read:false }
    },

    // Handlers
    "->": {
        '': function(request, uri_params, respond) {
            var self = this;
            // Message(s) request
            if (request.matches({'method':'get', 'accept': 'application/json'})) {
                // :TODO: offset & limit
                var query = request.get_query();
                try { var req_fields = JSON.parse(query.get('v')); }
                catch(e) { req_fields = []; }
                // Collect messages
                var ret_messages = {};
                if (query.get('q') == 'unread') {
                    // Filter out messages that have been read
                    for (var mid in this.messages) {
                        if (this.messages[mid].read == false) {
                            ret_messages[mid] = this.build_message(mid,req_fields);
                        }
                    }
                } else if (query.get('q') == 'byid') {
                    // Parse the id list
                    var req_ids = query.get('q_id');
                    if (req_ids[0] == '[') {
                        try { req_ids = JSON.parse(req_ids); }
                        catch(e) { req_ids = []; }
                    }
                    if (req_ids && !(req_ids instanceof Array)) { req_ids = [req_ids]; }
                    // Filter out messages that arent in the list
                    for (var i=0, ii=req_ids.length; i < ii; i++) {
                        var rid = req_ids[i];
                        if (rid in this.messages) {
                            ret_messages[rid] = this.build_message(rid,req_fields);
                        }
                    }
                } else if (query.get('q') == 'all') {
                    // Get all messages
                    for (var mid in this.messages) {
                        ret_messages[mid] = this.build_message(mid,req_fields);
                    }
                }
                respond(200, ret_messages, 'application/json');
            }
            // Message send
            // :TODO:
        },
        '/[0-9]+$': function(request, uri_params, respond) {
            // Message update
            if (request.matches({'method':'get', 'accept': 'application/json'})) {
                // Find our message
                var param_id = uri_params[0];
                var message = null;
                if (param_id && param_id in this.messages) {
                    message = this.messages[param_id];
                }
                if (!message) {
                    respond(404, 'Message not found');
                }
                // Update
                var updates = request.get_body();
                if (read in updates) {
                    message.read = updates.read;
                }
                respond(200);
            }
        },
        '/config': function(request, respond) {
            // Config fetch
            // :TODO:
            // Config interface fetch
            // :TODO:
            // Config update
            // :TODO:
        }
    },

    // Helpers
    "build_message": function(id, fields) {
        var message = {},
        org = this.messages[id];
        if (!org) { return null; }
        // Assemble the return object from the fields requested
        for (var i=0,ii=fields.length; i < ii; i++) {
            if (fields[i] == 'service') {
                message['service'] = this.service;
            } else if (fields[i] == 'summary') {
                message['summary'] = '<strong>' + org.author + '</strong> ' + org.subject;
            } else {
                message[fields[i]] = org[fields[i]];
            }
        }
        return message;
    }
});