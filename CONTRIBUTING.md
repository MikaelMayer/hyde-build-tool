## Testing

To test the build tool locally, for example in the test folder, run:

    ../bin/generate.js

This is exactly like running `hyde` once it is installed

## Publishing

Maybe first update sketch-n-sketch's and editor's version

```
npm update sketch-n-sketch
npm update http-server-editor
```

If necessary, commit these changes.

Then, to publish to npm and Github:

```
npm version patch
npm publish
git push origin master
```

## TODO:

* Once the lazy optimization for Update is ready, tasks could be defined as closures, e.g. all (), so that:
  * We can do partial builds (e.g. just a subsection of a website)
  * We can define variables there, e.g.
    * the inputs to watch by a field `inputs` or `sources`
    * `forward = True` to only build forward
    
    ```
  
  
