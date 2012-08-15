Structure
=========

2012/06/05 pfraze

Isolated 3 important parts of the project: paths to functionality, configurable module paths, and request/response objects. (A better types system-- based on content negotiation-- is 4, but dont have any ideas there yet.)

So I created a new mediator object-- Link.Structure-- which simplifies routing to match 1 handler using the object's actual structure (rather than a routing table). Request methods are exported by prepending a $ (as in .$get, .$delete). Should hopefully match Javascript better and simplify reasoning about linkjs systems.

---

2012/06/05 pfrazee

Didn't work: created handling context problems. Sub-resources have to exist before accessing (no lazy loading), and they always worked within their own object context, so they would have to call up to the parent manager to, say, delete itself. Not worth it.

