// Iface - Active nav
// Takes...
//   POST: Change the active nav item

if (arg_request.matches({'method':'post'})) {
    var nav = $('#linkbox-nav');
    var body = arg_request.get_body();    
    // Remove current highlight
    nav.find('.active').removeClass('active').find('.icon-white').removeClass('icon-white');
    // Set given item's highlight
    nav.find(":contains('"+body.label+"')").closest('li').addClass('active').find('i').addClass('icon-white');
    arg_callback(new link.Response(200));
}