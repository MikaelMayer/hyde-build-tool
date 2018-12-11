# Hyde: The Reversible Build Tool

Hyde is an experimental *reversible* build tool for text-based generation.
It is based on [Sketch-n-Sketch](https://github.com/ravichugh/sketch-n-sketch)'s reversible semantics.  
*Reversible* means that it does not only compute and write the output files based on inputs files, but it can also listen to changes in these output files and back-propagate them to the input.

Hyde can be useful to:

- Reversibly generate a website based on templates and content.
  The [Sketch-n-Sketch's website](http://ravichugh.github.io/sketch-n-sketch/) is now generated this way.
- Reversibly convert markdown files to HTML files.
- Reversibly create new files based on sources and regular expression replacements
- More generally, any computation producing new text files from old text files.

In combination with [Editor][editor], the following workflow makes it very easy to modify statically generated websites.

- Hyde generates a website statically from sources
- [Editor][editor] display the generated generated website in the Browser
- [Editor][editor] automatically or interactively replicates the changes in the browser to the generated website.
- Hyde automatically or interactively back-propagates these changes to the sources.

## Installation

    npm install -g hyde-build-tool

This installs the executable `hyde` and the synonym `hbt`.

## Quick start: Reversible Markdown to HTML

In a blank folder, we'll create the following structure.

    src/a.md
    src/hydefile
    b.html

In `src/a.txt`, write the following content:

    # Hello [world](https://en.wikipedia.org/wiki/World)[^world]
    This is *a.md*.
    [^world]: The world is the planet Earth and all life upon it.

In hydefile, write the following task (if no task is specified, `all` will be called)

    all =
      fs.read "src/a.md"
      |> Maybe.map (\content ->
        """<html><head></head><body>@(String.markdown content)</body></html>"""
        |> Write "b.html")
      |> Maybe.withDefault (Error "file src/a.md not found")

Open a command line and run:

    hyde --watch

You can now modify either `src/a.md` or `b.html`, and see the changes to be back-propagated.
To witness the interaction Hyde provides in case of ambiguity, just insert "new text" and a newline right after `<body>` in `b.html`

## Caution

When back-propagating changes, Hyde does not only modify the source files, it can actually modify the build file... This can be sneaky. However, with proper care, you should be fine.
If you want to avoid that, make sure to prefix parts you don't want to be modified with `Update.expressionFreeze` (allow variables to change but not the constants) or `Update.freeze` (fail if modifications are back-propagated to the argument).

## List of commands

In a folder containing a file `hydefile`:

* `hyde` performs once the forward pipeline computation and writes the output files.
* `hyde --backward` performs once the forward pipeline computation, compare with the existing outputs, and writes the *input* files.
  It might ask a question if it finds ambiguity.
  To auto-resolve ambiguities, just add the "--autosync" option.
* `hyde --watch` watches the inputs and the outputs, propagating one to the other.
  To auto-resolve ambiguities, just add the "--autosync" option.
* `hyde --watch --forward` watches the inputs and updates the outputs only.
* `hyde resolve` or `hyde resolve _`computes the pipeline and displays the top-level list of tasks.
* `hyde resolve module` or `hyde resolve module._` displays all the tasks that are under `module`
* `hyde resolve m_` displays all the tasks that start with `m`
* `hyde resolve moduel.sub_` displays all the tasks in `module` that start with `sub`



[editor]: https://github.com/MikaelMayer/Editor