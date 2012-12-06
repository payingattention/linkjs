src = src/
link-js-files =\
	${src}_compiled_header.js\
	${src}tools.js\
	${src}core.js\
	${src}events.js\
	${src}navigator.js\
	${src}helpers.js\
	${src}uri-template.js\
	${src}_compiled_trailer.js

build: link.js
link.js: ${link-js-files}
	cat > $@ $^

clean: link.js
	rm link.js