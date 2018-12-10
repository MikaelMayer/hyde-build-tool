module = {
  test = ()
  hopla = 2
  toast = 2
}

all =
  fs.read "src/a.md"
  |> Maybe.map (
    String.markdown >> Html.parseViaEval
    >> (\x -> <html><head></head><body>@x</body></html>)
    >> valToHTMLSource
    >> Write "b.html")
  |> Maybe.withDefault (Error "file not found")