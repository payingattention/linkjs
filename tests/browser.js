var testServer = new Link.Navigator('http://linkapjs.com:8080');

var done = false;
var startTime = Date.now();
testServer.collection('foo').get(
	function(payload, headers) {
		print('success');
		print(payload);
		print(headers);
		this.item('baz').get(
			function(payload, headers) { print('success'); print(payload); print(headers); console.log(Date.now() - startTime, 'ms'); done = true; },
			function(payload, headers) { print('err'); print(payload); print(headers); console.log(Date.now() - startTime, 'ms'); done = true; }
		);
	},
	function(payload, headers) { print('err'); print(payload); print(headers); console.log(Date.now() - startTime, 'ms'); done = true; }
);
wait(function () { return done; });

/* =>
success
["bar", "baz", "blah"]
{
  allow: "options, head, get",
  "content-type": "application/json",
  link: "</>; rel=\"up via service\", </foo>; rel=\"self current\", </foo/{item}>; rel=\"item\"",
  reason: "Ok",
  status: 200
}
success
baz
{
  allow: "options, head, get",
  "content-type": "application/json",
  link: "</>; rel=\"via service\", </foo>; rel=\"up collection index\", </foo/baz>; rel=\"self current\", </foo/bar>; rel=\"first\", </foo/blah>; rel=\"last\", </foo/bar>; rel=\"prev\", </foo/blah>; rel=\"next\"",
  reason: "Ok",
  status: 200
}
*/

done = false;
startTime = Date.now();
testServer.collection('foo').item('bar').up().via().self().collection('foo').get(
	function(payload, headers) { print('success'); print(payload); print(headers); console.log(Date.now() - startTime, 'ms'); done = true; },
	function(payload, headers) { print('err'); print(payload); print(headers); console.log(Date.now() - startTime, 'ms'); done = true; }
);
wait(function () { return done; });

/* =>
success
["bar", "baz", "blah"]
{
  allow: "options, head, get",
  "content-type": "application/json",
  link: "</>; rel=\"up via service\", </foo>; rel=\"self current\", </foo/{item}>; rel=\"item\"",
  reason: "Ok",
  status: 200
}
*/

done = false;
startTime = Date.now();
Link.registerLocal('test.com', function(request, cb) {
	var foos = ['bar', 'baz', 'blah'];
	var payload = null, linkHeader;
	if (/^\/?$/g.test(request.path)) {
		if (request.method === 'get') {
			payload = 'service resource';
		}
		linkHeader = [
			{ rel:'self current', href:'/' },
			{ rel:'collection', href:'/foo', title:'foo' },
			{ rel:'collection', href:'/{collection}' }
		];
		return cb(payload, { status:200, reason:'ok', 'content-type':'text/plain', 'link':linkHeader });
	}
	else if (/^\/foo\/?$/g.test(request.path)) {
		if (request.method === 'get') {
			payload = foos;
		}
		linkHeader = [
			{ rel:'up via service', href:'/' },
			{ rel:'self current', href:'/foo' },
			{ rel:'item', href:'/foo/{item}' }
		];
		return cb(payload, { status:200, reason:'ok', 'content-type':'application/json', 'link':linkHeader });
	}
	else if (/^\/foo\/([A-z]*)\/?$/.test(request.path)) {
		var match = /^\/foo\/([A-z]*)\/?$/.exec(request.path);
		var itemName = match[1];
		var itemIndex = foos.indexOf(itemName);
		if (itemIndex === -1) {
			return cb(null, { status:404, reason:'not found' });
		}
		if (request.method === 'get') {
			payload = itemName;
		}
		linkHeader = [
			{ rel:'via service', href:'/' },
			{ rel:'up collection index', href:'/foo' },
			{ rel:'self current', href:'/foo/'+itemName },
			{ rel:'first', href:'/foo/'+foos[0] },
			{ rel:'last', href:'/foo/'+foos[foos.length - 1] }
		];
		if (itemIndex !== 0) {
			linkHeader.push({ rel:'prev', href:'/foo/'+foos[itemIndex - 1] });
		}
		if (itemIndex !== foos.length - 1) {
			linkHeader.push({ rel:'next', href:'/foo/'+foos[itemIndex + 1] });
		}
		return cb(payload, { status:200, reason:'ok', 'content-type':'application/json', 'link':linkHeader });
	}
	cb(null, { status:404, reason:'not found' });
});

var testLocal = new Link.Navigator('httpl://test.com');
testLocal.collection('foo').get(
	function(payload, headers) {
		print('success');
		print(payload);
		print(headers);
		this.item('baz').get(
			function(payload, headers) { print('success'); print(payload); print(headers); console.log(Date.now() - startTime, 'ms'); done = true; },
			function(payload, headers) { print('err'); print(payload); print(headers); console.log(Date.now() - startTime, 'ms'); done = true; }
		);
	},
	function(payload, headers) { print('err'); print(payload); print(headers); console.log(Date.now() - startTime, 'ms'); done = true; }
);
wait(function () { return done; });

/* =>
success
["bar", "baz", "blah"]
{
  "content-type": "application/json",
  link: [
    {href: "/", rel: "up via service"},
    {href: "/foo", rel: "self current"},
    {href: "/foo/{item}", rel: "item"}
  ],
  reason: "ok",
  status: 200
}
success
baz
{
  "content-type": "application/json",
  link: [
    {href: "/", rel: "via service"},
    {href: "/foo", rel: "up collection index"},
    {href: "/foo/baz", rel: "self current"},
    {href: "/foo/bar", rel: "first"},
    {href: "/foo/blah", rel: "last"},
    {href: "/foo/bar", rel: "prev"},
    {href: "/foo/blah", rel: "next"}
  ],
  reason: "ok",
  status: 200
}
*/