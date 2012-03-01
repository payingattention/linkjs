
var NamesManager = exports.NamesManager = function() {
    this.values = {}
    this.cached_values = {}
}

NamesManager.prototype.has = function(name) {
    return this.values[name] !== undefined
}
NamesManager.prototype.set = function(name, value) {
    this.values[name] = value || ''
}
NamesManager.prototype.get = function(name) {
    if (name == '') { return '' }
    // find the closest defined/cached name
    var base = name
    ,   relpath = ''
    ,   i
    while (base) {
        // name or cache defined?
        if (typeof(this.values[base]) == 'string') {
            if (!(relpath && this.values[base] == '')) { // dont infer if this is a valueless name
                if (relpath) { this.cached_values[name] = this.values[base] + relpath }
                return this.values[base] + relpath
            }
        }
        if (typeof(this.cached_values[base]) == 'string' && this.cached_values[base]) {
            if (relpath) { this.cached_values[name] = this.cached_values[base] + relpath }
            return this.cached_values[base] + relpath
        }
        // not found, so move up the path
        i = base.lastIndexOf('/')
        relpath = base.slice(i) + relpath
        base = base.slice(0, i)
    }
    // not found
    return null
}

NamesManager.prototype.del = function(name) {
    // iterate all defined names
    var names = Object.getOwnPropertyNames(this.values)
    ,   i, ii
    for (i=0, ii=names.length; i < ii; i++) {
        // remove if path starts with param, or if ==
        if (names[i].indexOf(name + '/') == 0 || // matches child
            names[i] == name) { // matches item
            delete this.values[names[i]]
        }
    }
    // iterate all cached names
    names = Object.getOwnPropertyNames(this.cached_values)
    for (i=0, ii=names.length; i < ii; i++) {
        // remove if path starts with param, or if ==
        if (names[i].indexOf(name + '/') == 0 || // matches child
            names[i] == name) { // matches item
            delete this.cached_values[names[i]]
        }
    }
}
NamesManager.prototype.get_defined_parent = function(name) {
    // find the closest defined name
    while (name) {
        // name defined?
        if (this.has(name))
            return name // return the name itself
        // not found, so move up the path
        name = name.slice(0, name.lastIndexOf('/'))
    }
    // not found
    return null
}
NamesManager.prototype.get_children = function(parent) {
    // iterate all defined names
    var names = Object.getOwnPropertyNames(this.values)
    ,   children = []
    ,   parent_len = parent.length
    ,   i, ii
    for (i=0, ii=names.length; i < ii; i++) {
        // add if path starts with parent and is 1 level deep
        if (names[i].indexOf(parent + '/') == 0 &&
            parent != names[i] &&
            names[i].indexOf('/',parent_len+1) == -1) {
            children.push(names[i])
        }
    }
    // iterate all cached names
    names = Object.getOwnPropertyNames(this.cached_values)
    for (i=0, ii=names.length; i < ii; i++) {
        // add if path starts with parent
        if (names[i].indexOf(parent + '/') == 0 && 
            parent != names[i] &&
            names[i].indexOf('/', parent_len+1) == -1) {
            children.push(names[i])
        }
    }
    return children
}
NamesManager.prototype.set_cache = function(name, obj, root) {
    var i, k, props, cname, cval
    root = root || this.get(name) // first recursion, root = given name's value
    props = Object.getOwnPropertyNames(obj)
    for (i in props) {
        k = props[i]
        // Add entries with names and values relative to the given root
        cname = name + '/' + k
        cval = root + '/' + k
        this.cached_values[cname] = cval
        // If this entry is an object, recurse
        if (typeof(obj[k]) == 'object') {
            this.set_cache(cname, obj[k], cval)
        }
    }
}