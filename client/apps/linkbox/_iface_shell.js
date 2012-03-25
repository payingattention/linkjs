
// Require bootstrap
arg_agent.require_style(['/apps/bootstrap/css/bootstrap.css']);

if (arg_request.matches({'method':'get', 'accept':'text/html'})) {
    // Create the shell interface if it doesn't exist
    if ($('#linkbox-container').length == 0) {
        var html = '';
        html += '<div id="linkbox-container" class="container" style="margin-top: 5px">';
        html +=   '<div class="row">';
        html +=     '<div class="span2">';
        html +=       '<div class="well" style="padding: 8px 0;">';
        html +=         '<ul id="linkbox-nav" class="nav nav-list">';
        html +=           '<li class="nav-header">L<span style="color:#666">in</span>k<span style="color:#666">box</span></li>';
        html +=           '<li class="active"><a href="#"><i class="icon-white icon-inbox"></i> Messages</a></li>';
        html +=           '<li><a href="#"><i class="icon-cog"></i> Settings</a></li>';
        html +=           '<li class="nav-header">Services</li>';
        html +=           '<li><a href="#"><i class="icon-folder-open"></i> Gmail</a></li>';
        html +=           '<li><a href="#"><i class="icon-folder-open"></i> Twitter</a></li>';
        html +=           '<li><a href="#"><i class="icon-folder-open"></i> Facebook</a></li>';
        html +=         '</ul>';
        html +=       '</div>';
        html +=     '</div>';
        html +=     '<div class="span10" id="content">';
        html +=     '</div>';
        html +=   '</div>';
        html +=   '<div class="row"><div class="span12">debug: [<a href="#/_debug/structure">structure</a>]</div></div>';
        html += '</div>';
        arg_callback((new link.Response(200)).body(html,'text/html'));
    } else {
        arg_callback(new link.Response(200));
    }
}