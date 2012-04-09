(function() {
  var template = Handlebars.template, templates = Handlebars.templates = Handlebars.templates || {};
templates['box.html'] = template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  var buffer = "", stack1, foundHelper, self=this, functionType="function", helperMissing=helpers.helperMissing, undef=void 0;


  buffer += "<div class=\"btn-toolbar\"><div class=\"btn-group\">\n        <a class=\"btn\" href=\"#\" title=\"Check for new messages\"><i class=\"icon-refresh\"></i></a>\n        <a class=\"btn\" href=\"#\" title=\"Compose a message\"><i class=\"icon-pencil\"></i></a>\n    </div>\n    <div class=\"btn-group\">\n        <a class=\"btn\" href=\"#\" title=\"Mark selected messages as read\"><i class=\"icon-check\"></i></a>\n</div></div>\n<table class=\"table table-condensed\">\n    <tbody id=\"winbox-messages\">\n        ";
  foundHelper = helpers.messages;
  stack1 = foundHelper || depth0.messages;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "messages", { hash: {} }); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    </tbody>\n</table>\n";
  return buffer;});
templates['winbox-layout.html'] = template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  var buffer = "", stack1, foundHelper, self=this, functionType="function", helperMissing=helpers.helperMissing, undef=void 0;


  buffer += "<div id=\"winbox-container\">\n    <div class=\"well\">\n        <ul id=\"winbox-nav\" class=\"nav nav-list\">\n            ";
  foundHelper = helpers.nav;
  stack1 = foundHelper || depth0.nav;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "nav", { hash: {} }); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        </ul>\n    </div>\n    <div id=\"winbox-content\">";
  foundHelper = helpers.content;
  stack1 = foundHelper || depth0.content;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "content", { hash: {} }); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</div>\n</div>\n";
  return buffer;});
})();