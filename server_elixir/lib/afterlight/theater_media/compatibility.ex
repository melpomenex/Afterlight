defmodule Afterlight.TheaterMedia.Compatibility do
  @moduledoc """
  Pure compatibility planning (mirrors shared/mediaModel.js).
  """

  @browser_containers ~w(mp4 m4v webm mov ogv ogg)
  @browser_video ~w(h264 avc avc1 vp8 vp9 av1 theora)
  @browser_audio ~w(aac mp3 opus vorbis flac)

  def plan(%{} = probe) do
    if direct_playable?(probe) do
      %{strategy: "direct", output_kind: "direct", video_copy: true, audio_copy: true}
    else
      video_ok = video_playable?(probe["videoCodec"])
      audio_ok = audio_playable?(probe["audioCodec"])

      cond do
        video_ok and audio_ok ->
          %{strategy: "remux", output_kind: "hls", video_copy: true, audio_copy: true}

        video_ok and not audio_ok ->
          %{
            strategy: "transcode_audio",
            output_kind: "hls",
            video_copy: true,
            audio_copy: false,
            transcode_audio: true
          }

        true ->
          %{
            strategy: "transcode_full",
            output_kind: "hls",
            video_copy: false,
            audio_copy: false,
            transcode_video: true,
            transcode_audio: true
          }
      end
    end
  end

  def cache_key(source_url, probe, plan) do
    probe_sig =
      [
        norm(probe["container"]),
        norm(probe["videoCodec"]),
        norm(probe["audioCodec"]),
        probe["width"] || 0,
        probe["height"] || 0
      ]
      |> Enum.join("|")

    plan_sig = plan[:strategy] || plan["strategy"] || "unknown"
    base = String.trim(to_string(source_url || ""))
    hash = :erlang.phash2({base, probe_sig, plan_sig}, 16_777_216)
    "med_" <> Integer.to_string(hash, 36)
  end

  def direct_playable?(probe) do
    container = norm(probe["container"] || "")
    container = if container == "", do: "", else: container

    container_ok = container in @browser_containers

    if not container_ok do
      false
    else
      v = probe["videoCodec"]
      a = probe["audioCodec"]
      (is_nil(v) or video_playable?(v)) and (is_nil(a) or audio_playable?(a)) and
        (not is_nil(v) or not is_nil(a))
    end
  end

  def video_playable?(codec), do: codec_playable?(codec, @browser_video)
  def audio_playable?(codec), do: codec_playable?(codec, @browser_audio)

  defp codec_playable?(nil, _), do: true
  defp codec_playable?(codec, set) do
    n = norm(codec)
    n in set or String.starts_with?(n, "h264") or String.starts_with?(n, "avc")
  end

  defp norm(value) when is_binary(value) do
    value
    |> String.downcase()
    |> String.replace(~r/[^a-z0-9]/, "")
  end

  defp norm(_), do: ""
end
