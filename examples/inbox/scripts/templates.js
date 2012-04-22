require(function() {
    var templates = {};

    templates.message = function(message) {
        var recps = [];
        for (var i=0; i < message.recp.length; i++) {
            var user = message.recp[i];
            recps.push('<span class="label label-info">' + user + '</span>');
        }
        return recursive_join([
            '<h2 style="margin-bottom:5px">@', message.author, '</h2>',
            '<p><small>',[
                'Sent on <span class="label" style="background:#444">', new Date(message.date).toLocaleDateString(), ' @', new Date(message.date).toLocaleTimeString(), '</span>',
                ' by <span class="label label-success">', message.author, '</span>',
                ' to ', recps.join(', '),
                ' with <strong>Twitter</strong>',
            ], '</small></p>',
            '<hr /><p>', message.body, '</p>'
        ]);
    };
    

    // Helper
    var recursive_join = function(arr) {
        for (var i=0, ii=arr.length; i < ii; i++) {
            if (Array.isArray(arr[i])) {
                arr[i] = this.recursive_join(arr[i]);
            }
        }
        return arr.join('');
    };

    // Export
    return templates;
});