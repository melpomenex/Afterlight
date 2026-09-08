defmodule Afterlight.TheaterMedia.CompatibilityTest do
  use ExUnit.Case, async: true

  alias Afterlight.TheaterMedia.Compatibility

  test "remux plan for h264+aac mkv" do
    plan =
      Compatibility.plan(%{
        "container" => "matroska",
        "videoCodec" => "h264",
        "audioCodec" => "aac"
      })

    assert plan.strategy == "remux"
    assert plan.output_kind == "hls"
  end

  test "transcode_audio when audio incompatible" do
    plan =
      Compatibility.plan(%{
        "container" => "matroska",
        "videoCodec" => "h264",
        "audioCodec" => "dts"
      })

    assert plan.strategy == "transcode_audio"
    assert plan.video_copy
    refute plan.audio_copy
  end

  test "cache key stable" do
    probe = %{"container" => "matroska", "videoCodec" => "h264", "audioCodec" => "aac"}
    plan = Compatibility.plan(probe)
    a = Compatibility.cache_key("https://example.com/a.mkv", probe, plan)
    b = Compatibility.cache_key("https://example.com/a.mkv", probe, plan)
    assert a == b
  end
end
