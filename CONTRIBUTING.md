## Contribution ideas

First, make sure that you can run the test below.
Then, it would be great to

* Update Jekyll's hydefile inside test to be able to interpret a Jekyll site.

## Testing

To test the build tool locally, for example in the `test` folder, run:

    ../bin/generate.js

This is exactly like running `hyde` once it is installed

## Publishing

Run

  make publish

## TODO:

* Once the lazy optimization for Update is ready, tasks could be defined as closures, e.g. all (), so that:
  * We can do partial builds (e.g. just a subsection of a website)
  * We can define variables there, e.g.
    * the inputs to watch by a field `inputs` or `sources`
    * `forward = True` to only build forward
    
    ```
  
  
