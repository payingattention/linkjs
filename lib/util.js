define(function() {
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

    // Exports
    return {
        arrayToString:arrayToString
    };
});
