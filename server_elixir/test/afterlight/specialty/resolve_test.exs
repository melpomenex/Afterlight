defmodule Afterlight.Specialty.ResolveTest do
  use ExUnit.Case, async: true

  alias Afterlight.Parity
  alias Afterlight.Specialty.Resolve
  alias Afterlight.Specialty.TorrentRules

  @magnet "magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel"

  test "parse_magnet parity fixtures match JS reference corpus" do
    assert {:ok, count} = Parity.run_file({"torrent-model.json", Afterlight.Parity.Reference.Torrent})
    assert count > 0
  end

  test "rejects invalid magnets before contacting the sidecar" do
    assert {:error, %{"message" => msg}} = Resolve.handle("guest", %{"magnet" => "not-a-magnet"})
    assert msg == TorrentRules.error_text("invalid_magnet")
  end

  test "torrent error text covers resolve bounds" do
    for reason <- ~w(resolve_in_flight resolve_cooldown invalid_magnet engine_unavailable) do
      assert String.length(TorrentRules.error_text(reason)) > 10
    end
  end
end
