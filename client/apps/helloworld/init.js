// Hello World
// ===========
// the first Link app

console.log('init.js called');
// Load jquery
arg_agent.load_script(['https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.js'], function() {
    // Create the document
    var html = '<p><a href="#/test">Test Link 1</a></p><p><a href="#/test2">Test Link 2</a></p><p><a href="#/">Index</a></p>';
    arg_callback((new link.Response(200)).body(html,'text/html'));
});