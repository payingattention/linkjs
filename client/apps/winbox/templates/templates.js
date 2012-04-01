(function() {
  var template = Handlebars.template, templates = Handlebars.templates = Handlebars.templates || {};
templates['box.html'] = template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  var foundHelper, self=this;


  return "<div class=\"btn-toolbar\"><div class=\"btn-group\">\n        <a class=\"btn\" href=\"#\" title=\"Check for new messages\"><i class=\"icon-refresh\"></i></a>\n        <a class=\"btn\" href=\"#\" title=\"Compose a message\"><i class=\"icon-pencil\"></i></a>\n    </div>\n    <div class=\"btn-group\">\n        <a class=\"btn\" href=\"#\" title=\"Mark selected messages as read\"><i class=\"icon-check\"></i></a>\n</div></div>\n<table class=\"table table-condensed\">\n    <tbody id=\"winbox-messages\">\n        <tr><td colspan=\"3\">Loading...</td></tr>\n    </tbody>\n</table>\n";});
templates['winbox-layout.html'] = template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  var buffer = "", stack1, foundHelper, self=this, functionType="function", helperMissing=helpers.helperMissing, undef=void 0;


  buffer += "<div id=\"winbox-container\">\n    <div class=\"well\">\n        <ul id=\"winbox-nav\" class=\"nav nav-list\">\n            <li class=\"nav-header\" style=\"color: #666\"><span style=\"text-transform:none\">\\o/</span>inbox</li>\n            <li class=\"active\"><a href=\"#\"><i class=\"icon-white icon-inbox\"></i> Messages</a></li>\n            <li><a href=\"#\"><i class=\"icon-cog\"></i> Settings</a></li>\n            <li class=\"nav-header\">Services</li>\n            <li><a href=\"#\"><i class=\"icon-folder-open\"></i> Gmail</a></li>\n            <li><a href=\"#\"><i class=\"icon-folder-open\"></i> Twitter</a></li>\n            <li><a href=\"#\"><i class=\"icon-folder-open\"></i> Facebook</a></li>\n        </ul>\n    </div>\n    <div id=\"winbox-content\">";
  foundHelper = helpers.content;
  stack1 = foundHelper || depth0.content;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "content", { hash: {} }); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</div>\n</div>\n";
  return buffer;});
})();