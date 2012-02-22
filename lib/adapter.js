
// Head Adapter
// ============
// a router to adapt 3rd-party services to a namespace

// possible approaches to this:
// 1) resource-mapping
//    respond with the params (url, method, etc) for a request which fulfills the intent of the received request
//    the logic of mapping may be simple enough for config, in which case an adapter server would be overkill
// 2) proxy
//    maps & executes the given request, pipes the results back in a readable format
//    allows for logic & processing to occur, but requires the extra hop

var BaseAdapter = exports.BaseAdapter = function() {
}

