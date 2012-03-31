Link
====

Designed to help separate user interfaces from the web services they consume; enables users to customize, reuse, and independently evolve their interfaces and their services.

Browser JS apps are composed of client-side REST resources which may (or may not) poll remote servers for data, effectively behaving as proxies. This allows server-like decisions about response construction, but within the client, and with access to the client state. Additionally, client resources can attach rendering code to the response object, making it simple to handle content-types.


## Documentation

Some temporary notes until proper documentation can be written:

### Resources

[Configuration]
[URI structure]

### Resource interoperation

[Requests through the agent]
[To make precedent decisions based on the DOM tree, use frame agents]
[To make precedent decisions based on the URI tree, use request processors]

#### Frames & Frame Agents

[Link provides its own version of frames]

Each frame has an agent attached to it. That agent tracks an independent state and handles any requests originating from its DOM tree.
Frame controllers handle routing, creation, and deletion of frames.

#### Request Processors

Functions attached to resources which modify requests targetted at their URI or sub-URIs. An opportunity to modify the request, reroute it, or create new ones.

### API

#### link.App

The document's global application instance.

load_config()
configure()
get_uri_config()
load()
set_body_agent()
get_body_agent()
get_frame_agent()
handle_reuqest()
get_child_uris()
get_parent_uris()
require_script()
require_style()

#### link.Agent

Maintains a state and provides tools to navigate the application resources.

link.Agent()
get_current_state()
get_frame_element()
get_frame_element_id()
get_frame_controller()
set_frame_controller()
get_frame_agents()
get_frame_agent()
has_frame_agents()
add_frame_agents()
get_parent_agent()
attach_to_element()
attach_to_window()
follow()
get()
post()
get_child_uris()
get_uri_structure()

#### link.Request

link.Request()
get_uri()
get_query()
get_method()
get_headers()
get_header()
get_body()
uri()
method()
headers()
body()
for_javascript()
for_json()
for_html()
matches()

#### link.Response

link.Response()
get_status_code()
get_reason_phrase()
get_headers()
get_body()
headers()
body()
renderer()
render_to()
render()

## Contributing

If you would like to get involved, contact Paul Frazee at pfrazee@gmail.com.

## License

Link is released under the MIT License (found in the LICENSE file).