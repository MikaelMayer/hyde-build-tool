## Testing

To test the build tool locally, for example in the test folder, run:

    ../bin/generate.js

This is exactly like running `hyde` once it is installed

## Publishing

### Update sketch-n-sketch's version

```
npm update sketch-n-sketch
```

### Publish to npm and github

```
npm version patch
npm publish
git push origin master
```