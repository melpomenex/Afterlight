defmodule Afterlight.TheaterMedia.SecureUrlTest do
  use ExUnit.Case, async: true

  alias Afterlight.TheaterMedia.SecureUrl

  test "blocks localhost" do
    assert {:error, :blocked} = SecureUrl.validate("http://127.0.0.1/video.mkv")
    assert {:error, :blocked} = SecureUrl.validate("http://localhost/movie.mkv")
  end

  test "blocks file scheme" do
    assert {:error, :blocked} = SecureUrl.validate("file:///tmp/video.mkv")
  end
end
