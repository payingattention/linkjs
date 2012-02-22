Link
====

Link is an experimental browser-based computing environment for running client-side JS apps on a
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
a similar set of concepts built over HTTP (instead of 9P). While browsers already provide well-established
toolsets for accessing the peripherals of the local machine, it remains difficult to coordinate a user's
web services without a common computing environment. Often, services must provide explicit tools to
communicate with each other-- gaining privileged credentials in the process-- or remain walled
from one another. Moreover, due to the history of the web, most services are heavily tied into their
provider's interfaces, removing choice from the user and leading to a lot of repeated work. With modern
browsers, it should now be possible to to separate interfaces into contained Javascript tools which
complete single tasks, similar to how traditional computing environments operate, and provide the
services as read-and-writable "files" in a proxying namespace.

## Project Goals

Link was originally conceived to support web apps which only have to do one thing well. It follows that
all of [Eric Raymond's Rules of Design](http://en.wikipedia.org/wiki/Unix_philosophy) apply as well, but
there are a number of specific goals which Link should seek to fulfill:

*This list is only a proposal, and will need refining as the needs are better understood.*

 1. It should provide robust tools for manipulating the content and flow of data. (**No Barriers**)
 2. It should seek to enable lossless computing, sacrificing efficiency for availability & recoverability. (**No Fear**)
 3. It should leverage existing practices, protocols, and technologies whenever possible. (**No Surprises**)
 4. It should offer only what is needed and nothing more. (**No Reinvention**)
 4. It should prefer the mouse to the keyboard. (**No Carpal Tunnel**)

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

**Sandboxing.** Javascripts should be made safe to execute from a remote server without any system
configuration. This could present several security issues (such as tracking or data-theft) so scripts
will require locks on access to remote resources and other scripts in execution. [Google Caja](http://code.google.com/p/google-caja/)
is a strong candidate for accomplishing this.

Resources are only available through the file system, which manages any credentials the endpoint
requires without involving the executed Javascript. (For instance, access to an email REST service may
require authentication, which the proxy & environment should handle without involving the requesting
application.) If necessary, the environment can confirm requests to the filesystem with the user
before executing them, caching the user's decision.

**Multi-tasking.** A single tab represents one isolated instance of the execution environment.
This can provide multiple workspaces which allow temporary, contained changes to the environment.
Workspaces might be used to follow Plan9's per-process namespace paradigm (if its useful) or simply
to separate memory & state.

It should be possible for scripts to execute script sub-processes which, after any computation, either
die or register callbacks and sleep. All scripts would then communicate through an event system which is
core to the browser environment.

Rather than manage windows with the env, it should be possible for users to run window-manager
apps which then utilize the sub-process tools. The default, unmanaged behavior would be for invoked scripts
take ownership of the environment and to push a new state to the browser history. The parent script may choose
to end and replace itself with the child script, or it may sleep and remain in the process stack. The user can
press the back button to move up the process stack; likewise, a finished script might execute the back action to
return to the parent. Whether the forward button should bring scripts back onto the stack will require some
exploration.

**Data Flow.** The events model is a natural choice for cross-script communication, though there
are issues of precedence which may need adressing. If an event goes unhandled, Link can fall back to executing
scripts located in conventional areas of the file-system. This should make it possible for tools to automatically
trigger when needed without remaining in memory.

Data piping is a large facet of computing, and there may be an opportunity to experiment with callbacks
or the event system to see if there is any advantage over stdin/out/err. Doing so could create
a greater variety of channels for data to flow through, but that may not be a good thing.

Using JSON as the core data-type could provide useful meta-data. For instance, a JSON object might list links to
commands which the UI can present to the user. Alternatively, rules about the structure of the object could
determine default behavior, similar to Plan9's plumber.

Another use for metadata might be to track links to previous object states. This might be used to make versioning
(undo/redo) core to the environment with a minimal burden to the tools.