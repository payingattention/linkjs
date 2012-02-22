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
a similar set of concepts built over HTTP (instead of 9P). While browsers already handle local peripherals
well, it remains difficult to coordinate a user's web services. Often, the services must provide vendor-specific
tools to communicate with each other-- gaining privileged credentials in the process-- or remain walled
from one another. Moreover, due to the history of the web, most services are heavily tied into their
provider's interfaces, removing choice from the user and leading to a lot of repeated work. With modern
browsers, it should now be possible to to separate interfaces into contained Javascript tools which
complete single tasks and provide the services as read-and-writable "files" in a proxying namespace.

## Project Goals

Link is an environment for running multiple small, reusable javascripts in concert with a set of RESTful
api services. Depending on how the environment is configured, it can be used to create a personal computing
environment (a "web operating system") or a single application (the env as a framework).

The primary goals are to:

 1. Transport data between services & scripts without exposing origin or destination.
 2. Build a browser script-execution environment which unifies resource-access by convention.

For developers, this should allow a cleaner separation of concerns, which, in turn, leads to easier
reuse. For instance, rather than build a traditional e-commerce site, a vendor should be able to configure
a Link environment to use a storefront app, a cart app, and a payment processing app in cooperation with
inventory and payment services; so long as the data structures are compatible between the components, the
environment should cooperate. To add features, the vendor should only have to "install" (aka configure)
new apps, then add links which execute them (such as "/bin/ratings/view/shoe439").

When using Link as a PC env, this should offer finer control over data. Link behaves as a middle-man on
behalf of the user, asking where data should go, then conducting the transaction without exposing the two
ends to each other. This should, for instance, allow users to give an app their social graph without giving
access to their wall.

## Project Design

*The following is in development and contains proposals which may change in the future.*

Link provides two fundamental systems: the file-system proxy and a shell HTML application
which builds a (sandboxed) execution environment for 3rd-party javascripts.

### ProxyFS

**todo**

[The name server]

[The proxy]

[File system conventions and intended features]

### Browser Env

**Sandboxing.** Javascripts should be made safe to execute from a remote server with minimal
configuration. This could present several security issues (such as tracking or data-theft) so scripts
will require locks on access to remote resources and other scripts in execution. [Google Caja](http://code.google.com/p/google-caja/)
is a strong candidate for accomplishing this.

Resources are only available through the file system, which manages any credentials the endpoint
requires without involving the executed Javascript. (For instance, access to an email REST service may
require authentication, which the proxy & environment should handle without involving the requesting
application.) If necessary, the environment can confirm requests to the filesystem with the user
before executing them, caching the user's decision.

**Multi-tasking.** A single tab represents a contained instance of the execution environment.
This can provide multiple workspaces with separate sets of active scripts ("process-stacks").

Rather than manage windows with the env, it should be possible for users to run window-manager
apps which then utilize the sub-process tools. The default, unmanaged behavior would give invoked scripts
ownership of the environment and push a new state to the browser history. The parent script may choose
to end and replace itself with the child script, or it may sleep and remain in the process stack. Likewise, a
script can register callbacks, then return control to its parent.

The user could then press the back button to move up the process stack; likewise, a finished script might trigger
the back action to return to the parent. Whether the forward button should bring scripts back onto the stack
would require some consideration.

**Communication.** All processes communicate using the file-system and HTTP methods, whether interacting
with a resource or with another process. Pattern-matching may be used to allow multiple request targets; for
instance, ```GET /proc/*/name``` to retrieve the names of active processes (assuming /proc/ is dynamically
populated with running scripts). Scripts can then alias files to callbacks which handle the request (eg
```/proc/15/text/insert```). Paths can be passed between processes (as links) if discovery is needed.

This, of course, requires the browser env to populate the file-system with a number of virtual names. Alterations
to the fs should be possible on a per-process basis, to limit scripts to the resources required for execution.
Permissions are enforced by object capabilities, so, if a resource is visible in the namespace, it's authorized
for use. (This is called "authorization by designation," as [discussed by Mark Miller in this talk on Secure
Distributed Programming with OCaps](http://www.youtube.com/watch?v=w9hHHvhZ_HY&feature=related)). To grant access
to a non-standard resource, an alias could be written to the script's private folder, with the option to make
the alias remain for latter executions.
