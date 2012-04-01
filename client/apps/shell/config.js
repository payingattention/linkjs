// Shell Configuration
// ===================
link.App.require_script([
    '/apps/shell/vendor/handlebars.runtime.js',
], function() {
    // depends on handlebars.runtime.js
    link.App.require_script('/apps/shell/templates/templates.js');
});
link.App.require_style(['/apps/bootstrap/css/bootstrap.css', '/apps/shell/shell.css']);
link.App.configure({
    "#": {
        "->": "/apps/shell/main.js",
        /*"->requires": [
            '/apps/shell/vendor/handlebars.runtime.js',
            '/apps/shell/templates/templates.js'
        ]*/
    },
    "#/shell/structure": {
        "->": "/apps/shell/structure.js"
    },
    "#/shell/ui": {
        "->": "/apps/shell/ui.js",
        "->requires": [
            '/apps/shell/vendor/handlebars.runtime.js',
            '/apps/shell/templates/templates.js'
        ],
    },
});
// Preload
link.App.load(['#', '#/shell/structure']);