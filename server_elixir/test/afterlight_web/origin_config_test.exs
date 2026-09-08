defmodule AfterlightWeb.OriginConfigTest do
  use ExUnit.Case, async: true

  alias AfterlightWeb.OriginConfig

  # The dev client origin MUST be in the default allow-list: when it is
  # not, the browser fails its WS upgrade with 403 and every theater
  # source kind silently stops streaming (the cutover regression).
  test "defaults include the Vite dev origins and the frontend wildcard" do
    origins = OriginConfig.resolve(nil)

    assert "//localhost:5173" in origins
    assert "//localhost:4173" in origins
    assert "//127.0.0.1:5173" in origins
    assert "//*.vercel.app" in origins
  end

  test "\"false\" disables the check (documented escape hatch)" do
    assert OriginConfig.resolve("false") == false
  end

  test "empty string falls back to defaults" do
    assert OriginConfig.resolve("") == OriginConfig.default_origins()
  end

  test "CSV override splits into the listed origins" do
    assert OriginConfig.resolve("//a.example:1,//b.example:2") == [
             "//a.example:1",
             "//b.example:2"
           ]
  end

  test "CSV items are trimmed, so a space after the comma cannot break matching" do
    assert OriginConfig.resolve("//a.example:1, //b.example:2") == [
             "//a.example:1",
             "//b.example:2"
           ]
  end

  test "non-string garbage falls back to defaults instead of raising" do
    assert OriginConfig.resolve(12_345) == OriginConfig.default_origins()
    assert OriginConfig.resolve([]) == OriginConfig.default_origins()
  end
end
