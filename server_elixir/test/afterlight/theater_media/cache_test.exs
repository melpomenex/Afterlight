defmodule Afterlight.TheaterMedia.CacheTest do
  use ExUnit.Case, async: false

  alias Afterlight.TheaterMedia.Cache

  setup do
    tmp = System.tmp_dir!() |> Path.join("afterlight-media-test-#{System.unique_integer([:positive])}")
    File.mkdir_p!(tmp)
    previous = Application.get_env(:afterlight, :theater_media, [])

    Application.put_env(:afterlight, :theater_media, Keyword.put(previous, :cache_dir, tmp))
    Application.put_env(:afterlight, :runtime_cwd, tmp)

    on_exit(fn ->
      File.rm_rf(tmp)
      Application.put_env(:afterlight, :theater_media, previous)
    end)

    %{tmp: tmp, prepare_id: "med_test123"}
  end

  test "ready? false until manifest exists", %{prepare_id: prepare_id} do
    refute Cache.ready?(prepare_id)
    dir = Cache.ensure_dir!(prepare_id)
    File.write!(Path.join(dir, "index.m3u8"), "#EXTM3U\n")
    assert Cache.ready?(prepare_id)
    assert {:hit, ^prepare_id} = Cache.lookup_hit(prepare_id)
  end

  test "enforce_cap evicts oldest directory when over limit", %{tmp: tmp} do
    Application.put_env(:afterlight, :theater_media, cache_dir: tmp, cache_max_bytes: 250)

    payload = String.duplicate("x", 100)

    for id <- ["med_a", "med_b", "med_c"] do
      dir = Cache.ensure_dir!(id)
      File.write!(Path.join(dir, "index.m3u8"), payload)
      :timer.sleep(10)
    end

    assert length(File.ls!(tmp)) == 3
    Cache.enforce_cap()
    assert length(File.ls!(tmp)) < 3
  end
end
