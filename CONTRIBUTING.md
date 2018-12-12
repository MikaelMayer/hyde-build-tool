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

## TODO:

* Editor
* The input for `--watch` should be all the files and folders used in the build. Instrument fs with a recording version.
* `--input` should accept a comma-separated list of folders and files


* Once the lazy optimization for Update is ready, tasks could be defined as closures, e.g. all (), so that:
  * We can do partial builds (e.g. just a subsection of a website)
  * We can define variables there, e.g.
    * the inputs to watch by a field `inputs` or `sources`
    * `forward = True` to only build forward
    
    ```
  
  
