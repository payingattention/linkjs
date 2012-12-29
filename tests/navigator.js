// == SECTION navigator

var testServer = new Link.Navigator('http://linkapjs.com:8080');

// remote server navigation

done = false;
startTime = Date.now();
testServer.collection('foo').get(
  function(res) {
    printSuccess(res);
    this.item('baz').get(printSuccessAndFinish, printErrorAndFinish);
  },
  printErrorAndFinish
);
wait(function () { return done; });

/* =>
success
{
  _events: {},
  body: ["bar", "baz", "blah"],
  headers: {
    allow: "options, head, get",
    "content-type": "application/json",
    link: "</>; rel=\"up via service\", </foo>; rel=\"self current\", </foo/{item}>; rel=\"item\""
  },
  isConnOpen: true,
  reason: "Ok",
  status: 200
}
success
{
  _events: {},
  body: "baz",
  headers: {
    allow: "options, head, get",
    "content-type": "application/json",
    link: "</>; rel=\"via service\", </foo>; rel=\"up collection index\", </foo/baz>; rel=\"self current\", </foo/bar>; rel=\"first\", </foo/blah>; rel=\"last\", </foo/bar>; rel=\"prev\", </foo/blah>; rel=\"next\""
  },
  isConnOpen: true,
  reason: "Ok",
  status: 200
}
*/

// complex remote server navigation

done = false;
startTime = Date.now();
testServer.collection('foo').item('bar').up().via().self().collection('foo').get(
	function(res) { printSuccess(res); finishTest(); },
	function(err) { printError(err); finishTest(); }
);
wait(function () { return done; });

/* =>
success
{
  _events: {},
  body: ["bar", "baz", "blah"],
  headers: {
    allow: "options, head, get",
    "content-type": "application/json",
    link: "</>; rel=\"up via service\", </foo>; rel=\"self current\", </foo/{item}>; rel=\"item\""
  },
  isConnOpen: true,
  reason: "Ok",
  status: 200
}
*/

done = false;
startTime = Date.now();
var testLocal = new Link.Navigator('httpl://test.com');
testLocal.collection('foo').get(
	function(res) {
		printSuccess(res);
		this.item('baz').get(
			function(res) { printSuccess(res); finishTest(); },
			function(err) { printError(err); finishTest(); }
		);
	},
	function(err) { printError(err); finishTest(); }
);
wait(function () { return done; });

/* =>
success
{
  _events: {},
  body: ["bar", "baz", "blah"],
  headers: {
    "content-type": "application/json",
    link: [
      {href: "/", rel: "up via service"},
      {href: "/foo", rel: "self current"},
      {href: "/foo/{item}", rel: "item"}
    ]
  },
  isConnOpen: true,
  reason: "ok",
  status: 200
}
success
{
  _events: {},
  body: "baz",
  headers: {
    "content-type": "application/json",
    link: [
      {href: "/", rel: "via service"},
      {href: "/foo", rel: "up collection index"},
      {href: "/foo/baz", rel: "self current"},
      {href: "/foo/bar", rel: "first"},
      {href: "/foo/blah", rel: "last"},
      {href: "/foo/bar", rel: "prev"},
      {href: "/foo/blah", rel: "next"}
    ]
  },
  isConnOpen: true,
  reason: "ok",
  status: 200
}
*/

// local streaming

done = false;
startTime = Date.now();
var testLocal = new Link.Navigator('httpl://test.com');
testLocal.collection('foo').get({ stream:true },
	function(res) {
		printSuccess(res);
		print('---');
		res.on('data', function(payload) {
			print(payload);
			print(typeof payload);
			print(res.isConnOpen ? 'connection open' : 'connection closed');
		});
		res.on('end', function() {
			print(res.isConnOpen ? 'connection open' : 'connection closed');
			finishTest();
		});
	},
	function(err) { printError(err); finishTest(); }
);
wait(function () { return done; });

/* =>
success
{
  _events: {},
  body: null,
  headers: {
    "content-type": "application/json",
    link: [
      {href: "/", rel: "up via service"},
      {href: "/foo", rel: "self current"},
      {href: "/foo/{item}", rel: "item"}
    ]
  },
  isConnOpen: true,
  reason: "ok",
  status: 200
}
---
[
string
connection open
["bar"
string
connection open
["bar","baz"
string
connection open
["bar","baz","blah"
string
connection open
["bar","baz","blah"]
string
connection open
connection closed
*/