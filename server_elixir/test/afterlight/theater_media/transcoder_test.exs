defmodule Afterlight.TheaterMedia.TranscoderTest do
  use ExUnit.Case, async: false

  @moduletag :integration

  setup do
    start_supervised!(Afterlight.TheaterMedia.Supervisor)
    :ok
  end

  alias Afterlight.TheaterMedia.{Cache, Probe, Transcoder, Compatibility}

  @tag :ffmpeg
  test "remux mkv fixture to playable hls manifest" do
    unless Probe.tools_available?() do
      flunk("ffmpeg/ffprobe required for integration test")
    end

    tmp = Path.join(System.tmp_dir!(), "afterlight-transcode-#{System.unique_integer([:positive])}")
    File.mkdir_p!(tmp)
    src = Path.join(tmp, "src.mkv")
    prepare_id = "med_smoke"

    on_exit(fn -> File.rm_rf(tmp) end)

    {_, 0} =
      System.cmd("ffmpeg", [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "testsrc=duration=2:size=160x90:rate=24",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=440:duration=2",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-shortest",
        src
      ])

    {:ok, probe} = Probe.probe_url(src)
    plan = Compatibility.plan(probe)
    assert plan.strategy == "remux"

    previous = Application.get_env(:afterlight, :theater_media, [])
    cache_root = Path.join(tmp, "cache")
    Application.put_env(:afterlight, :theater_media, Keyword.merge(previous, cache_dir: cache_root))
    Application.put_env(:afterlight, :runtime_cwd, tmp)

    assert :ok = Transcoder.run(src, probe, plan, prepare_id)
    assert Cache.ready?(prepare_id)
    manifest = Cache.manifest_path(prepare_id)
    assert File.exists?(manifest)
    content = File.read!(manifest)
    assert content =~ "#EXTM3U"
  end
end
