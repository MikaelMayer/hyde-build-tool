replaceInstead y x = Update.lens {  apply y = x, update {outputNew,diffs} = Ok (InputsWithDiffs [(outputNew, Just diffs)]) } y

(downcase): String -> String
(downcase) string =
  Regex.replace "[A-Z]" (\m ->
    replaceInstead m.match <|
    case m.match of 
      "A" -> "a"; "B" -> "b"; "C" -> "c"; "D" -> "d"; "E" -> "e"; "F" -> "f"; "G" -> "g"; "H" -> "h"; "I" -> "i"; "J" -> "j"; "K" -> "k"; "L" -> "l"; "M" -> "m"; "N" -> "n"; "O" -> "o"; "P" -> "p"; "Q" -> "q"; "R" -> "r"; "S" -> "s"; "T" -> "t"; "U" -> "u"; "V" -> "v"; "W" -> "w"; "X" -> "x"; "Y" -> "y"; "Z" -> "z"; _ -> m.match
    ) string

(upcase): String -> String
(upcase) string =
  Regex.replace "[a-z]" (\m ->
    replaceInstead m.match <|
    case m.match of 
      "a" -> "A"; "b" -> "B"; "c" -> "C"; "d" -> "D"; "e" -> "E"; "f" -> "F"; "g" -> "G"; "h" -> "H"; "i" -> "I"; "j" -> "J"; "k" -> "K"; "l" -> "L"; "m" -> "M"; "n" -> "N"; "o" -> "O"; "p" -> "P"; "q" -> "Q"; "r" -> "R"; "s" -> "S"; "t" -> "T"; "u" -> "U"; "v" -> "V"; "w" -> "W"; "x" -> "X"; "y" -> "Y"; "z" -> "Z"; _ -> m.match
    ) string
  
(jekylllib) = [
  ("|", \a b -> b a),
  ("downcase", downcase),
  ("capitalize", Regex.replace "^[A-Z]" (\m -> upcase m.match))
  ] ++ __CurrentEnv__

-- Converts the pipe operator `|` and different operators to Leo's syntax
(unjekyllify) program =
  Regex.replace """(?:\|\|)|(?:\|(?!\|))|(?:!=)""" (\m -> case m.match of
    "!=" -> "/="
    "||" -> "||"
    "|" -> "|>"
    x -> x
  ) program

-- creates a multiline string literal in Leo out of the given string content
rawMultiline: String -> String
rawMultiline content = 
   String.q3 + Regex.replace String.q3 (always "@(\"\\\"\\\"\\\"\")") content + String.q3

-- NOT IMPLEMENTED YET: Try to replace Jekyll's control flow with Elm's control flow.
controlflowtags = Regex.replace """\{%\s*if\b((?:(?!%\}.)*)%\}([\s\S]*?)\{%\s*endif\s*%\}""" (\{submatches=[cond, content]} ->
  "{{ if " + cont + " then " + rawMultiline content + " else \"\" }}")

-- The regexp used to extract the front matter
(frontmatterregex): Regex
(frontmatterregex) = """^---([\s\S]*?\r?\n)---\r?\n([\s\S]*)$"""

-- Converts the front matter to a Leo's object
(frontmattercode): String -> Object
(frontmattercode) text =
  case Regex.extract frontmatterregex text of
  Just (code :: _) ->
    let body = Regex.replace """(\r?\n\s*)([\w_]+)(\s*):(\s*)(.*?)(\s*)(?=\r?\n)""" (\{submatches=[nl,name,sp,sp2,d,sp3]} ->
      let content = case Regex.extract "^(\\d+)$" d of
        Just [n] -> n
        _ -> String.q3 + d + String.q3
      in nl + name + sp + "=" + sp2 + content + sp3
    ) code
    in
    __evaluate__ jekylllib ("{\n" + body + "\n}")
    |> Result.withDefaultMapError (\msg -> {error= Debug.log "error in front matter" msg})
  _ -> {}

-- Removes the front matter from a source file
(removefrontmatter): String -> String
(removefrontmatter) string =
  Regex.replace frontmatterregex (\{submatches=[front,back]} -> back) string
  
-- Replaces interpolated strings like {{code}} by evaluating the jekyllified code and replacing it with the result
(applyObjects): Env -> String -> String
(applyObjects) furtherEnv src =
  src
  |> Regex.replace """\{\{(.*)\}\}""" (\{submatches=[code]} ->
    case __evaluate__ (furtherEnv ++ jekylllib) (unjekyllify code) of
      Ok x ->
        """@x""" -- Converts non-strings to strings
      Err msg ->
        """(error: @msg)"""
    )

-- Jekyll interpretation of the file
(interpret): String -> (Write Filename String | Error String)
(interpret) filename = 
  let (newName, isMd) = case Regex.extract """^(.*)\.(html|md)$""" filename of
    Just [name, ext] -> ("_site/" + name + ".html", ext == "md")
    _ -> (filename, False)
  in
  fs.read filename
  |> Maybe.map (\source ->
    let fm = frontmattercode source in
    let sourceWithoutFrontMatter = removefrontmatter source in
    let (source, contentEnv) = case fm of
      {layout} ->
        ( fs.read """_layouts/@(layout).html"""
          |> Maybe.withDefaultLazy (\_ -> """_layouts/@(layout).html not found """)
        , [("content",
             sourceWithoutFrontMatter
             |> applyObjects [("page", fm)]
             |> (if isMd then String.markdown else identity))])
      _ -> (sourceWithoutFrontMatter, [])
    in
    removefrontmatter source
    |> applyObjects ([("page", fm)] ++ contentEnv)
    |> Write newName)
  |> Maybe.withDefaultLazy (\_ -> Error <| "file " ++ filename ++ " not found")

-- main task
all: List (Write Filename String | Error String)
all =
  fs.listdir "."
  |> List.filter (\x -> fs.isfile x &&
    Regex.matchIn """^.*\.(html|md)$""" x)
  |> List.map interpret
