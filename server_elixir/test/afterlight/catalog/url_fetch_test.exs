defmodule Afterlight.Catalog.UrlFetchTest do
  use ExUnit.Case, async: true

  alias Afterlight.Catalog.UrlFetch

  test "private IPv4 addresses are blocked" do
    assert UrlFetch.private_address?({127, 0, 0, 1})
    assert UrlFetch.private_address?({10, 0, 0, 1})
    assert UrlFetch.private_address?({192, 168, 1, 5})
    assert UrlFetch.private_address?({172, 16, 0, 1})
    refute UrlFetch.private_address?({8, 8, 8, 8})
  end

  test "fetch refuses private hosts" do
    assert {:error, _} = UrlFetch.fetch("http://127.0.0.1/list.m3u")
    assert {:error, _} = UrlFetch.fetch("http://localhost/playlist.m3u")
  end

  test "fetch rejects non-http schemes" do
    assert {:error, message} = UrlFetch.fetch("file:///tmp/list.m3u")
    assert message =~ "http"
  end
end
