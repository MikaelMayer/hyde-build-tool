publish:
	npm update sketch-n-sketch
	npm update http-server-editor
	git diff --quiet && git diff --staged --quiet || git commit -am "Updated Editor and Sketch-n-sketch"
	npm version patch
	npm publish
	git push origin master
	npm install -g hyde-build-tool
