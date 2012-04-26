define(['link/module', 'link/response'], function(Module, Response) {
    // Test
    // ===
    // Run HTTP requests in the command line
    var Test = Module(function() {
    });
    
    // Handlers
    // ========
    Test.post({ uri:'^/(.*)', bubble:true }, function(request, response, urimatch) {
        if (!response) { response = new Response(404, 'Not found', {}, 'Invalid test'); }
        if (response.ok()) {
            response.body('<p style="color:#693">&#10004; ' + response.body() + '</p>');
        } else {
            response.body('<p style="color:#930">&times; ' + response.body() + '</p>');
        }
        request.respond(response);
    });
    Test.post({ uri:'^/isok$' }, function(request) {
        var param = request.body();
        request.respond((!param[0] ? 500 : 200), param[0] + " isok");
    });
    Test.post({ uri:'^/fails$' }, function(request) {
        var param = request.body();
        request.respond((param[0] ? 500 : 200), param[0] + " fails");
    });
    Test.post({ uri:'^/equals$' }, function(request) {
        var param = request.body();
        if (param[0] != param[1]) {
            request.respond(500, param[0] + " != " + param[1]);
        } else {
            request.respond(200, param[0] + " == " + param[1]);
        }
    });

    return Test;
});