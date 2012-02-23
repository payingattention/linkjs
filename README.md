Link
====

Link is an experimental browser environment for running client-side JS apps on a
"filesystem" comprised of web services. It builds from some of the principles of Plan9
([the operating system from Bell Labs](http://plan9.bell-labs.com/plan9/)) with the
goal of separating apps from the online services they consume. This should give users more control
over their data and a lower barrier to deploying new applications.

*Link is only a proof of concept at this time, and is not ready for use.*

## Running the Demo

This is currently 66% painless.

First run ```npm install -d``` to install dependencies. Next, open /node_modules/restify/lib/request.js
and remove lines 28 & 29 (to keep trailing slashes on request URLs) like so:

```javascript
function sanitizePath(path) {
  assert.ok(path);

  // Be nice like apache and strip out any //my//foo//bar///blah
  path = path.replace(/\/\/+/g, '/');

  // DONT Kill a trailing '/' - Link uses it to differentiate between collections and elements
  /*if (path.lastIndexOf('/') === (path.length - 1) && path.length > 1)
    path = path.substr(0, path.length - 1);*/

  return path;
}
```

(A pull request is forthcoming)

Finally, run ```sudo npm start``` (sudo to get access to port 80, or edit conf.json to use another port).
You can now navigate to localhost and browse your simple filesystem.

To execute commands, open your browser console and try the following commands:

```javascript
env.exec("helloworld")
env.exec("forecast", "/services/weatherbug/daily-forecast")
env.exec("forecast", "/services/weatherbug/daily-forecast", 10001) // 10001 = any zipcode you like
```

In each case, the aliased javascript will be downloaded and executed.

## Basic Theory

From the [Plan9 overview paper](http://plan9.bell-labs.com/sys/doc/9.html):

 > The view of the system is built upon three principles. First, resources are named and accessed like
 > files in a hierarchical file system. Second, there is a standard protocol, called 9P, for accessing
 > these resources. Third, the disjoint hierarchies provided by different services are joined together
 > into a single private hierarchical file name space. The unusual properties of Plan 9 stem from the
 > consistent, aggressive application of these principles.
 
Using these principles, the Bell Labs team placed the window manager, peripherals, network, hard-drive,
etc, into the filesystem-- a simple common interface for reads and writes. By controlling which "files"
(resources) a process could view, users could manipulate the flow of data through their tools.

Interestingly, RESTful API end-points are comparible to Plan9's resources, and should be able to follow
a similar set of concepts built over HTTP (instead of 9P). The "filesystem" needs only to be a proxy which
routes traffic according to bindings between local paths and the remote URLs. Javascripts can then read
& write to the files as if executing on a local machine, making the filesystem a configurable interface for
executing code with remote services.

The filesystem can also act as a private names server by caching DNS resolutions, which provides an
worth-while layer of redundancy for web-users.

## Project Description

Fundamentally: an environment for running multiple small, reusable javascripts in concert with a set of RESTful
api services. Depending on how the environment is configured, it can be used to create a personal computing
environment (a "web operating system") or a single application (using the env as a framework).

**Core Responsibilities:**

 1. Transport data between services & scripts without exposing origin or destination.
 2. Build a document-level JS environment which unifies resource-access with a convention-heavy API.

For developers, this should allow a cleaner separation of concerns, which, in turn, leads to better reuse. For
instance, rather than build a traditional e-commerce site, a vendor could build a Link environment to use a
storefront interface, a cart app, and a payment processing app in cooperation with inventory and payment
services; so long as the data structures are compatible between the components, the environment should
cooperate. To add features, the vendor should only have to "install" (configure) new apps/services,
then add links which execute them (such as "/bin/ratings/view/shoe439").

If using Link as a personal environment, the toolset should offer finer control over data. Link behaves as
a middle-man on behalf of the user by asking where data should go, then conducting the transaction without
exposing the two ends to each other. This should, for instance, allow users to give an app their social graph
without giving access to their wall. Web services will be able to inter-communicate without much
server-side preparation, as the (perhaps user-built) glue code will live on the client-side.

## Project Design

*The following is in development and contains proposals which may change in the future.*

### ProxyFS

**Protocol.** RESTful services should be able to cooperate with minimal changes to their implementation.
The only data that Link might use is the sub-names of a resource, to enable discovery. This data can
easily be packed into the ['link' response header](http://tools.ietf.org/html/rfc5988), which supports
k/v lists of attributes. Thus, it would be simple to expect HEAD requests to include a set of links which
are typed by the "rel" attribute; for instance:

```
 </root/resource/subres1>; rel="ns-child",
 </root/resource/subres2>; rel="ns-child",
 </root/resource/subres3>; rel="ns-child"...
```

If those headers are not supplied, Link will not be able to populate children until they are used. Otherwise,
the only requirement is to use true REST practices.

**Name Server.** The requests to alter the filesystem structure should be separated from the proxy
itself, so that the proxy can pass unaltered requests & responses. Those requests break down into a simple
set of core interactions: resolving an entry, retrieving name lists, aliasing a name, and removing a name.

### Browser Env

**Sandboxing.** Javascripts should be made safe to execute from a remote server with minimal
configuration. This could present several security issues (such as tracking or data-theft) so scripts
will require locks on access to remote resources and other scripts in execution. [Google Caja](http://code.google.com/p/google-caja/)
is a strong candidate for accomplishing this.

Resources are only available through the file system, which manages any credentials the endpoint
requires without involving the requesting Javascript. (For instance, access to an email REST service may
require authentication, which the proxy & environment should handle.) If necessary, the environment can
confirm requests to the filesystem with the user before executing them, caching the user's decision.

**Multi-tasking.** A single tab represents a contained instance of the execution environment.
This can provide multiple workspaces with separate sets of active scripts ("process-stacks").

Rather than manage windows with the env, it should be possible for users to run window-manager
apps which then utilize the sub-process tools. The default, unmanaged behavior would give invoked scripts
ownership of the environment and push a new state to the browser history. The parent script may choose
to end and replace itself with the child script, or it may sleep and remain in the process stack. Likewise, a
script can register callbacks, then return control to its parent.

The user could then press the back button to move up the process stack; likewise, a finished script might trigger
the back action to return to the parent.

**Communication.** All processes communicate using the file-system and HTTP methods, whether interacting
with a resource or with another process. Pattern-matching may be used to allow multiple request targets; for
instance, ```GET /proc/*/name``` to retrieve the names of active processes (assuming /proc/ is dynamically
populated with running scripts). Scripts can then alias files to callbacks which handle the request (eg
```/proc/15/text/insert```). Paths can be passed between processes (as links) if discovery is needed.

This, of course, requires the browser env to populate the file-system with a number of virtual names. Alterations
to the fs should be possible on a per-process basis, to limit scripts to the resources required for execution.
Permissions are enforced by object capabilities, so, if a resource is visible in the namespace, it's authorized
for use. (This is called "authorization by designation," as [discussed by Mark Miller in this talk on Secure
Distributed Programming with OCaps](http://www.youtube.com/watch?v=w9hHHvhZ_HY&feature=related)).

### Link Servers

**Server Software.** The Link server should itself remain open and extensible, though this particular fork
will focus on doing the least necessary. It should be simple for servers to enforce opinions, particularly
regarding the initial environment, so the owners can dictate what their instances are used for.

**User Management.** Link could implement a user registry, but it is far more interesting to let the
users' filesystem definition live off-site. Users could then carry their own fs defs, host them on their own
servers, or use a login service (which the Link instance-owners might provide).