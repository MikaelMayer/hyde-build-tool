(downcase) = Regex.replace "[A-Z]" (\m ->
    case m.match of 
      "A" -> "a"; "B" -> "b"; "C" -> "c"; "D" -> "d"; "E" -> "e"; "F" -> "f"; "G" -> "g"; "H" -> "h"; "I" -> "i"; "J" -> "j"; "K" -> "k"; "L" -> "l"; "M" -> "m"; "N" -> "n"; "O" -> "o"; "P" -> "p"; "Q" -> "q"; "R" -> "r"; "S" -> "s"; "T" -> "t"; "U" -> "u"; "V" -> "v"; "W" -> "w"; "X" -> "x"; "Y" -> "y"; "Z" -> "z"; _ -> m.match
    )

(upcase) = Regex.replace "[a-z]" (\m ->
    case m.match of 
      "a" -> "A"; "b" -> "B"; "c" -> "C"; "d" -> "D"; "e" -> "E"; "f" -> "F"; "g" -> "G"; "h" -> "H"; "i" -> "I"; "j" -> "J"; "k" -> "K"; "l" -> "L"; "m" -> "M"; "n" -> "N"; "o" -> "O"; "p" -> "P"; "q" -> "Q"; "r" -> "R"; "s" -> "S"; "t" -> "T"; "u" -> "U"; "v" -> "V"; "w" -> "W"; "x" -> "X"; "y" -> "Y"; "z" -> "Z"; _ -> m.match
    )
    
(jekylllib) = [
  ("|", \a b -> b a),
  ("downcase", downcase),
  ("capitalize", Regex.replace "^[A-Z]" (\m -> upcase m.match))
  ] ++ __CurrentEnv__

-- Convert pipe and different operators to Leo's syntax
(jekyllify) = Regex.replace """ \|([^\|])|!=""" (\m -> case m.match of
  "!=" -> "/="
  _ -> "|>" + nth m.group 1)

rawMultiline content = 
   String.q3 + Regex.replace String.q3 (always "@(\"\\\"\\\"\\\"\")") content + String.q3

controlflowtags = Regex.replace """\{%\s*if\b((?:(?!%\}.)*)%\}([\s\S]*?)\{%\s*endif\s*%\}""" (\{submatches=[cond, content]} ->
  "{{ if " + cont + " then " + rawMultiline content + " else \"\" }}")

-- The regexp used to extract the front matter
(frontmatterregex) = """^---([\s\S]*?\r?\n)---\r?\n([\s\S]*)$"""

-- Converts the front matter to a Leo's object
(frontmattercode) text = case Regex.extract frontmatterregex text of
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
(removefrontmatter) = Regex.replace frontmatterregex (\{submatches=[front,back]} -> back)
  
(applyObjects) furtherEnv =
  Regex.replace """\{\{(.*)\}\}""" (\{submatches=[code]} ->
    case __evaluate__ (furtherEnv ++ jekylllib) (jekyllify code) of
      Ok x -> """@x"""
      Err msg -> """(error: @msg)"""
  )

-- Jekyll interpretation of the file
(interpret) file = 
  let (newName, isMd) = case Regex.extract """^(.*)\.(html|md)$""" file of
    Just [name, ext] -> ("_site/" + name + ".html", ext == "md")
    _ -> (file, False)
  in
  fs.read file
  |> Maybe.map (\source ->
    let fm = frontmattercode source in
    let (source, contentEnv) = case fm of
      {layout} ->
        (fs.read """_layouts/@(layout).html""" |>
        Maybe.withDefaultLazy (\_ -> """_layouts/@(layout).html not found """), [("content", (if isMd then String.markdown else identity) <| applyObjects [("page", fm)] <| removefrontmatter source)])
      _ -> (removefrontmatter source, [])
    in
    removefrontmatter source
    |> applyObjects ([("page", fm)] ++ contentEnv)
    |> Write newName)
  |> Maybe.withDefaultLazy (\_ -> Error <| "file " ++ file ++ " not found")

-- main task
park =
  fs.listdir "."
  |> List.filter (\x -> fs.isfile x &&
    Regex.matchIn """^.*\.(html|md)$""" x)
  |> List.map interpret

build = park
all = park

{-
TODO: https://jekyllrb.com/docs/step-by-step/01-setup/
- Convert tags to control flow
-}

serve = let _ = Debug.log "hyde serve not implemented yet" in
  -- let _ =  __jsEval__ """require("editor")""" 
  []

