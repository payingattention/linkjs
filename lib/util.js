define(function() {
    // Takes an array of strings and an arbitrary number of arguments
    //  - if the array element is a number, will replace that element with the argument in that position
    //  - recurses any elements which are arrays
    var arrayToString = function(arr) {
        var str = '', args = Array.prototype.splice.call(arguments, 1);
        for (var i=0; i < arr.length; i++) {
            if (typeof(arr[i]) == 'string') {
                str += arr[i];
            } else if (typeof(arr[i]) == 'number') {
                str += args[arr[i]];
            } else if (Array.isArray(arr[i])) {
                args.unshift(arr[i]);
                str += arrayToString.apply(null, args);
                args.shift();
            } else {
                str += arr[i].toString();
            }
        }
        return str;
    };

    var batchAsync = function(generator, finalCb, opt_context) {
        var cbCount = 0;
        var expectedCbs = generator.call(opt_context, function() {
            cbCount++;
            if (cbCount == expectedCbs) {
                finalCb.call(opt_context);
            }
        });
    };

    // Exports
    return {
        arrayToString:arrayToString,
        batchAsync:batchAsync
    };
});
