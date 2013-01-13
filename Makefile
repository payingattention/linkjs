src = src/
lib = lib/
link-js-files =\
	${src}_compiled_header.js\
	${lib}promises/promises.js\
	${src}helpers.js\
	${src}core.js\
	${src}events.js\
	${src}navigator.js\
	${src}uri-template.js\
	${src}_compiled_trailer.js

build: link.js
link.js: ${link-js-files}
	cat > $@ $^

clean: link.js
	rm link.js