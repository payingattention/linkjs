window.env.scripts.forecast = {
    exec: function(provider_path, zip) {
	if (!provider_path) {
	    console.log('ERR -- provider resource is required')
	    console.log('  usage: forecast <provider resource path> [zipcode]')
	    return
	}
	if (!zip) { zip = 78728 /* default to north austin...my commute sucks */ }
	// make a call to the weatherbug api
	$('#output').html("<h3>Requesting forecast</h3>")
	env.proxy.request({
	    url: provider_path //'/services/weatherbug/daily-forecast'
	    , type: 'GET'
	    , dataType: 'json'
	    , data: {
		zip: zip
		, nf: 1
		, ih: 1
		, c: 'US'
		, l: 'en'
		, api_key: 'phxgnzpnsgcg587wqer78p6h'
	    }
	}).success(function(data, statusCode, jqXHR) {
	    var output = ''
	    for (var i=0, ii=data.forecastList.length; i < ii; i++) {
		var forecast = data.forecastList[i]
		if (forecast.hasDay) {
		    output += '<h3>' + forecast.dayTitle + ': ' + forecast.dayDesc + '</h3>'
		    output += '<p>' + forecast.dayPred + '</p>'
		}
		if (forecast.hasNight) {
		    output += '<h3>' + forecast.nightTitle + ': ' + forecast.nightDesc + '</h3>'
		    output += '<p>' + forecast.nightPred + '</p>'
		}
	    }
	    $('#output').html(output)
	})
    }
}