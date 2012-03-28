// Shell
// =====
// A Link interface environment
link.App.configure('#', {
    "->": function(request, agent, callback) {
        if (request.matches({'method':'get', 'accept':'text/html'})) {
            // Respond :TODO:
            callback((new link.Response(200)).body('','text/html'));
        } else {
            callback(new link.Response(501,"Not Implemented"));
        }
    }
});