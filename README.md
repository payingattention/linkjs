I wanted:
 - 1) A simple way to build web apps which don't care WHERE the data comes from or goes...
      ...so long as it comes and goes
 - 1) Total user control over where my data comes from or goes
 - 1) Total user control over which tools & interfaces I use for my services

Turns out, it might not be that hard

-

 HEAD /

  A platform for running client-side JS apps on a filesystem comprised of websites.

## ...what

Basically, I ripped off Plan9, the awesome OS that the founders of unix built (after unix).

REST APIs operate under the philosophy that each access point is just a resource. That's the 
same idea that Plan9 used for file-systems: each file is just a resource. 

The window manager, the mouse, the network, hard-drive data collections (you know, files) -- 
they're just resources which do reads & writes 

(or, in our case, GETS, PUTS and POSTS).


So If a piece of software knows how to read/write with a given resource, then it's just a matter
of which resources are available. Thus: the bindable namespace.

-

## How? ##

 - HEAD / provides a proxy which routes traffic according to a user-defined namespace 
   (the "filesystem"). 

 - Your javascript apps only know the paths within that proxy namespace, and, due to a
   sandbox (probably google-caja) can only interact with those resources via provided 
   functions (proxy.request, namespace.ls, etc). NO REQUESTS OUTSIDE OF NAMESPACE!

 - Credentials are stored in the proxy service when the user aliases the service in, 
   so your JS apps can come from anywhere, safely operate on your data, then forget 
   all about you.

 - This is currently done in nodejs, and can be viewed as 3 components (at the moment): the 
   namespace web api, the proxy server, and the browser api.


## What I plan to do with this ##


**A contained sharing-service running on the Frazee family server.**

    If messaging & sharing apps work with contacts provided from any source...
    ...then the sources are swappable, while the tools stay the same.

    We'll store our own contact lists, photos, events, etc

    We'll probably also have secure tools for reaching private family data in emergencies.
    
    
**A multi-interface message transport**

    I want to deploy new interfaces with as little up-front effort as possible.

    If I have a messaging transport that sets interface on a per-conversation level...
    ...I'll never be limited by the medium I started with.


    Friend: Oh crap, we need to decide on an event date.
    Me: So? Here's a calendar interface. I say tomorrow at three.
    Friend: OMFG.

As a bonus, HEAD / can behave like a private nameserver by caching DNS resolutions

which is good if somebody decides to wipe out a DNS record.
