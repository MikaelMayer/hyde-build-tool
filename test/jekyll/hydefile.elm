
(jekylllib) = [
  ("|", \a b -> b a),
  ("downcase", String.toLowerCase),
  ("capitalize", Regex.replace "^[A-Z]" (\m -> String.toUpperCase m.match)),
  ("upcase", String.toUpperCase)
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

-- Converts the front matter to a Leo's object
(extractFrontMatter): String -> (Object, String)
(extractFrontMatter) text =
  case Regex.extract """^---([\s\S]*?\r?\n)---\r?\n([\s\S]*)$""" text of
  Just (code :: content :: _) ->
    let body = Regex.replace """(\r?\n\s*)([\w_]+)(\s*):(\s*)(.*?)(\s*)(?=\r?\n)""" (\{submatches=[nl,name,sp,sp2,d,sp3]} ->
      let content = case Regex.extract "^(\\d+)$" d of
        Just [n] -> n
        _ -> String.q3 + d + String.q3
      in nl + name + sp + "=" + sp2 + content + sp3
    ) code
    in
    let frontmatter =
          __evaluate__ jekylllib ("{\n" + body + "\n}")
          |> Result.withDefaultMapError (\msg -> {error= Debug.log "error in front matter" msg})
    in
    (frontmatter, content)
  _ -> ({}, text)
 
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
  let (newName, isMd) =
        case Regex.extract """^(.*)\.(html|md)$""" filename of
          Just [name, ext] -> ("_site/" + name + ".html", ext == "md")
          _ -> (filename, False)
  in
  fs.read filename
  |> Maybe.map (\source ->
    let (fm, sourceWithoutFrontMatter) =
          extractFrontMatter source in
    let (mbLayoutSource, contentEnv) =
          case fm of
            {layout} ->
              ( fs.read """_layouts/@(layout).html"""
                |> Maybe.withDefaultLazy (\_ -> """_layouts/@(layout).html not found """)
              , [("content",
                   sourceWithoutFrontMatter
                   |> applyObjects [("page", fm)]
                   |> (if isMd then String.markdown else identity))])
            _ -> (sourceWithoutFrontMatter, [])
    in
    extractFrontMatter mbLayoutSource -- TODO: Shall we integrate the layout's variables as well?
    |> Tuple.second
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
