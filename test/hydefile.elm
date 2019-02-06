module = {
  test = ()
  hopla = 2
  toast = 2
}

all () =
  fs.read "a.md"
  |> Maybe.map (\content ->
    """<html><head></head><body>@(String.markdown content)</body></html>"""
    |> Write "b.html")
  |> Maybe.withDefault (Error "file a.md not found")