// P(ersonal)index
// ===============
// Provides the app environment with the user's configured links & settings
link.App.configure('#/pindex', {
    indexed_values: {},
    "->": function(request, agent, callback) {
        // Search for values
        if (request.matches({'method':'get', 'accept':'application/javascript'})) {
            // Parse the search query
            try {
                var param_q = JSON.parse(request.get_query().get('q'));
            } catch(e) {
                return callback((new link.Response(400,"Bad Request").body('unable to parse JSON in \'q\' query parameter', 'text/plain')));
            }
            if (typeof(param_q) == 'string') { param_q = {all:[param_q]}; }
            else if (param_q instanceof Array) { param_q = {all:param_q}; }
            if (param_q.any && typeof(param_q.any) == 'string') { param_q.any = [param_q.any]; }
            if (param_q.all && typeof(param_q.all) == 'string') { param_q.all = [param_q.all]; }
            // Build a set of matches from our index
            var matches = [];
            for (var k in this.indexed_values) {
                var tags = this.indexed_values[k];
                if (param_q.all && !this.allValuesMatch(param_q.all, tags)) { continue; }
                if (param_q.any && !this.oneValueMatches(param_q.any, tags)) { continue; }
                matches.push(k);
            }
            callback((new link.Response(200).body(matches,'application/javascript')));
        }
        // Index new values
        else if (request.matches({'method':'post', 'content-type':'application/javascript'})) {
            var values = request.get_body();
            if (typeof(values) != 'object' && !(values instanceof Array)) { return callback((new link.Response(400,"Bad Request").body('body must be a javascript object of format {key1:[string1,string2,..stringN], key2:[string1,..stringN],...keyN:[string1,..stringN]}'))); }
            // Add/overwrite values
            for (var k in values) {
                if (!values.hasOwnProperty(k)) { continue; }
                this.indexed_values[k] = values[k];
            }
            callback(new link.Response(200));
        }
        // List the index
        else if (request.matches({'method':'get', 'content-type':'text/html'})) {
            var html = '<ul>';
            for (var k in this.indexed_values) {
                html += '<li><strong>' + k + '</strong>: ' + this.indexed_values[k].join(', ') + '</li>';
            }
            html += '</ul>';
            callback((new link.Response(200)).body(html,'text/html'));
        }
        else {
            callback(new link.Response(501,"Not Implemented"));
        }
    },
    hasValue: function(needle, haystack) {
        for (var i=0, ii=haystack.length; i < ii; i++) {
            if (needle == haystack[i]) { return true; }
        }
        return false;
    },
    oneValueMatches: function(arr1, arr2) {
        for (var i=0, ii=arr1.length; i < ii; i++) {
            if (this.hasValue(arr1[i], arr2)) { return true; }
        }
        return false;
    },
    allValuesMatch: function(arr1, arr2) {
        for (var i=0, ii=arr1.length; i < ii; i++) {
            if (!this.hasValue(arr1[i], arr2)) { return false; }
        }
        return true;
    }
});