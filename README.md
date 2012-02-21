Link
====

Link is an experimental browser-based computing environment for running client-side JS apps on a
"filesystem" comprised of web services. It builds from some of the principles of Plan9
([the operating system from Bell Labs](http://plan9.bell-labs.com/plan9/)) with the
goal of separating apps from the online services they consume. This should give users more control
over their data and a lower barrier to deploying new applications.

*Link is only a proof of concept at this time, and is not ready for use.*

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

Resources are only acceptable through the file system, which manages any credentials the endpoint
requires without involving the executed Javascript. Conventions should be determined for common paths.

**Multi-tasking.** A single tab represents a single contained instance of the execution environment.
This provides some separation between multiple workspaces, and can allow changes to the environment
which are temporary and isolated to the tab. This might be used to follow Plan9's contained changes to
the namespace, so long as its usefulness is greater than its complexity. If not, Link can still
separate areas of memory or state.

It should be possible for scripts to execute script sub-processes which, after any computation, either
die or register callbacks and sleep. All scripts can then communicate through an event system. Rather than
manage those scripts through the browser environment, it should be possible for users to run window-manager
apps which provide multi-tasking through the sub-process tools.

**Data Flow.** The events model is a natural choice for cross-script communication, though there
are issues of precedence which may need adressing. If an event goes unhandled, Link can fall back to executing
scripts located in conventional areas of the file-system. This should make it possible for tools to automatically
trigger when needed, rather than waiting for the user to explicitly open them.

Data piping is a large facet of computing, and there may be an opportunity to experiment with callbacks
or the event system to see if there is any advantage over stdin/out/err. Doing so could create
a greater variety of channels for data to flow through, but that may not be a good thing.

Using JSON as the core data-type could provide useful meta-data. For instance, a JSON object might list links to
commands which the UI can present to the user. Alternatively, rules about the structure of the object could
determine default behavior, similar to Plan9's plumber.

Another use for metadata might be to track links to previous object states. This might be used to make versioning
core to the environment with a minimal burden to the tools.