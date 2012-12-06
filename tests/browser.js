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
Link.registerLocal('test.com', function(request, response) {
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
		response.writeHead(200, 'ok', { 'content-type':'text/plain', 'link':linkHeader });
		response.end(payload);
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
		response.writeHead(200, 'ok', { 'content-type':'application/json', 'link':linkHeader });
		// so we can experiment with streaming, write the json in bits:
		if (payload) {
			response.write('[');
			payload.forEach(function(p, i) { response.write((i!==0?',':'')+'"'+p+'"'); });
			response.write(']');
		}
		response.end();
	}
	else if (/^\/foo\/([A-z]*)\/?$/.test(request.path)) {
		var match = /^\/foo\/([A-z]*)\/?$/.exec(request.path);
		var itemName = match[1];
		var itemIndex = foos.indexOf(itemName);
		if (itemIndex === -1) {
			response.writeHead(404, 'not found');
			response.end();
			return;
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
		response.writeHead(200, 'ok', { 'content-type':'application/json', 'link':linkHeader });
		response.end('"'+payload+'"');
	}
	else if (/^\/events\/?$/.test(request.path)) {
		response.writeHead(200, 'ok', { 'content-type':'text/event-stream' });
		response.write({ event:'foo', data:{ c:1 }});
		response.write({ event:'foo', data:{ c:2 }});
		response.write({ event:'bar', data:{ c:3 }});
		response.write({ event:'foo', data:{ c:4 }});
		response.end({ event:'foo', data:{ c:5 }});
	}
	else {
		response.writeHead(404, 'not found');
		response.end();
	}
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

done = false;
startTime = Date.now();
var testLocal = new Link.Navigator('httpl://test.com');
testLocal.collection('foo').get(null, { stream:true },
	function(payload, headers, connIsOpen) {
		print('---');
		print(payload);
		print(typeof payload);
		print(connIsOpen ? 'connection open' : 'connection closed');
		if (!connIsOpen) {
			console.log(Date.now() - startTime, 'ms');
			done = true;
		}
	},
	function(payload, headers) { print('err'); print(payload); print(headers); console.log(Date.now() - startTime, 'ms'); done = true; }
);
wait(function () { return done; });

/* =>
---

string
connection open
---
[
string
connection open
---
["bar"
string
connection open
---
["bar","baz"
string
connection open
---
["bar","baz","blah"
string
connection open
---
["bar","baz","blah"]
string
connection open
---
["bar", "baz", "blah"]
object
connection closed
*/

done = false;
startTime = Date.now();
var stream = Link.subscribe({ url:'httpl://test.com/events' });
stream.on('message', function(m) { print(m); });
stream.on('foo', function(m) { print('foo', m.data); });
stream.on('bar', function(m) { print('bar', m.data); });
stream.on('error', function(e) {
	print('close', e);
	console.log(Date.now() - startTime, 'ms');
	done = true;
});
wait(function () { return done; });

/* =>
{data: {c: 1}, event: "foo"}
foo {c: 1}
{data: {c: 2}, event: "foo"}
foo {c: 2}
{data: {c: 3}, event: "bar"}
bar {c: 3}
{data: {c: 4}, event: "foo"}
foo {c: 4}
{data: {c: 5}, event: "foo"}
foo {c: 5}
{data: undefined, event: "error"}
close {data: undefined, event: "error"}
*/

done = false;
startTime = Date.now();
var stream2 = Link.subscribe({ url:'http://linkapjs.com:8080/events' });
stream2.on('message', function(m) { print(m); });
stream2.on('foo', function(m) { print('foo', m.data); });
stream2.on('bar', function(m) { print('bar', m.data); });
stream2.on('error', function(e) {
	print('close', e);
	console.log(Date.now() - startTime, 'ms');
	done = true;
});
wait(function () { return done; });

/* =>
{data: {c: 1}, event: "foo"}
foo {c: 1}
{data: {c: 2}, event: "foo"}
foo {c: 2}
{data: {c: 3}, event: "bar"}
bar {c: 3}
{data: {c: 4}, event: "foo"}
foo {c: 4}
{data: {c: 5}, event: "foo"}
foo {c: 5}
{data: undefined, event: "error"}
close {data: undefined, event: "error"}
*/