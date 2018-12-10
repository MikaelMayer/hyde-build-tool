downcase = Regex.replace "[A-Z]" (\m ->
    case m.match of 
      "A" -> "a"; "B" -> "b"; "C" -> "c"; "D" -> "d"; "E" -> "e"; "F" -> "f"; "G" -> "g"; "H" -> "h"; "I" -> "i"; "J" -> "j"; "K" -> "k"; "L" -> "l"; "M" -> "m"; "N" -> "n"; "O" -> "o"; "P" -> "p"; "Q" -> "q"; "R" -> "r"; "S" -> "s"; "T" -> "t"; "U" -> "u"; "V" -> "v"; "W" -> "w"; "X" -> "x"; "Y" -> "y"; "Z" -> "z"; _ -> m.match
    )

upcase = Regex.replace "[a-z]" (\m ->
    case m.match of 
      "a" -> "A"; "b" -> "B"; "c" -> "C"; "d" -> "D"; "e" -> "E"; "f" -> "F"; "g" -> "G"; "h" -> "H"; "i" -> "I"; "j" -> "J"; "k" -> "K"; "l" -> "L"; "m" -> "M"; "n" -> "N"; "o" -> "O"; "p" -> "P"; "q" -> "Q"; "r" -> "R"; "s" -> "S"; "t" -> "T"; "u" -> "U"; "v" -> "V"; "w" -> "W"; "x" -> "X"; "y" -> "Y"; "z" -> "Z"; _ -> m.match
    )
    
jekylllib = [
  ("|", \a b -> b a),
  ("downcase", downcase),
  ("capitalize", Regex.replace "^[A-Z]" (\m -> upcase m.match))
  ] ++ __CurrentEnv__

jekyllify = Regex.replace """ \|[^\|]""" (always "|>")

frontmatterregex = """^---([\s\S]*?\r?\n)---\r?\n([\s\S]*)$"""

frontmattercode text = case Regex.extract frontmatterregex text of
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

removefrontmatter = Regex.replace frontmatterregex (\{submatches=[front,back]} -> back)
  
applyObjects furtherEnv =
  Regex.replace """\{\{(.*)\}\}""" (\{submatches=[code]} ->
    case __evaluate__ (furtherEnv ++ jekylllib) (jekyllify code) of
      Ok x -> """@x"""
      Err msg -> """(error: @msg)"""
  )

park =
  fs.read "index.html"
  |> Maybe.map (\source ->
    let fm = frontmattercode source in
    let (source, contentEnv) = case fm of
      {layout} ->
        (fs.read """_layouts/@(layout).html""" |>
        Maybe.withDefaultLazy (\_ -> """_layouts/@(layout).html not found """), [("content", applyObjects [("page", fm)] <| removefrontmatter source)])
      _ -> (removefrontmatter source, [])
    in
    removefrontmatter source
    |> applyObjects ([("page", fm)] ++ contentEnv)
    |> Write "_site/index.html")
  |> Maybe.withDefault (Error "file not found")