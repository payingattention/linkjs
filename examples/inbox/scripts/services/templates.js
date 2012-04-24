define(function() {
    var templates = {};

    templates.message = function(message) {
        var recps = [];
        for (var i=0; i < message.recp.length; i++) {
            var user = message.recp[i];
            recps.push('<span class="label">' + user + '</span>');
        }
        return recursive_join([
            '<h3 style="margin-bottom:5px">', message.subject, '</h3>',
            '<p>', [
                '<small>',[
                    'Sent on <span class="label">', new Date(message.date).toLocaleDateString(), ' @', new Date(message.date).toLocaleTimeString(), '</span>',
                    ' by <span class="label">', message.author, '</span>',
                    ' to ', recps.join(', '),
                ], '</small>'
            ], '</p>',
            '<hr />',
            '<p>', message.body, '</p>'
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