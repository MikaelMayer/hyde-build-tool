# Contributing

## Getting started

- Clone [Hyde](https://github.com/MikaelMayer/hyde-build-tool)
- In the folder, run `npm install` to install all dependencies.

To run the build tool, the entry file is the executable `bin/generate.js` (that is named `hyde` after publishing).
For example, in the `test` folder, run: `../bin/generate.js --watch`

## Publishing

If you have the rights to publish, run:

    make publish
  
# Hyde to replace Jekyll

The folder [test/jekyll](test/jekyll) contains an experimental project that builds a Jekyll website using Hyde

- Navigate to [test/jekyll](test/jekyll) (this folder)
- Run

    `node ../../bin/generate.js --serve=_site`

This is equivalent to `hyde --serve=_site` if Hyde was installed.
This command opens [Editor](https://github.com/MikaelMayer/Editor) serving `_site`,
and listen to changes made on `index.html` and the folder `_layouts`.
Try to do the following to see that it works:

* In `index.html`, replace in your favorite editor `Hello` with `Hi`. Reload the page on the browser to see the changes
* In the browser, replace the `!` by a `?`. Since auto-save is on, Editor back-propagates the change automatically to `_site/index.html`, and then Hyde back-propagates the change automatically to the real source `index.html`, in a few seconds.

## Contributing

### Current state

The Hydefile that defines this Jekyll-like transformation is still a draft.
I followed [Jekyll's tutorial](https://jekyllrb.com/docs/step-by-step/01-setup/) and implemented

* Step 1: Basic website
* Step 2: Object, filters and Liquid. I did not implement the tags 'if/then/else/for/while/do'.
* Step 3: front matter
* Step 4: Layouts, markdown, about page

There remains to implement

* Step 5: Includes, current page highlighting
* Step 6: Data, Data file usage
* Step 7: Assets, Sass
* Step 8: Blogging, posts, List Posts, More posts
* Step 9: Collections, configurations, authors, staff page, output a page, front matter defaults, list author's posts, link to author's page
* Step 10: Deployment

### Learn Elm

The language Leo used in the hydefile is very similar to [Elm](https://guide.elm-lang.org/).
Elm has a [standard library](https://package.elm-lang.org/packages/elm/core/latest/Basics) that has been reimplemented. The most useful data structures and methods for this tool are
[List](https://package.elm-lang.org/packages/elm/core/latest/List),
[String](https://package.elm-lang.org/packages/elm/core/latest/String) and
[Regex](https://package.elm-lang.org/packages/elm/core/latest/Regex).
.
### Structure of the current `hydefile.elm` for Jekyll's website

The entry point of this file is the variable `all` at the end of the file `test/jekyll/hydefile.elm`.
It lists the file that are html and markdown and interpret them.

* `all` returns a list of commands of type `List (Write name content | Error String)`
* `interpret`
  * checks if a file is html or markdown (`isMd`), computes its final path (`newName`),
  * reads the file's content (which is a `Maybe String`)
  * Extract the front matter as an object (`frontmattercode`)
  * Removes the front matter (`sourceWithoutFrontMatter`)
  * If there is a layout, use this layout as the basic source 
* `applyObjects` takes an environment and a string and replaces the interpolated parts {{...}} by interpreting what's inside as code.
* `unjekyllify` takes a piece of code in Jekyll's syntax and transforms it to a piece of code in Leo's syntax

### Warm-up exercise

* Implement the [include procedure](https://jekyllrb.com/docs/step-by-step/05-includes/)
  * Add a regular expression to extract `{% include %}` in the function `applyObjects` (duplicate the lines 68-74)
  * Use `fs.read` to read a filename. It returns a `Maybe String`
  * Append `|> Maybe.map (\content -> ...) |> Maybe.withDefault "default"` to the right of something of type `Maybe String` to further process the string and return a default value if it was `Nothing`
  

