defmodule Afterlight.TheaterMedia.Probe do
  @moduledoc """
  ffprobe wrapper with bounded analyze size.
  """

  require Logger

  @probe_size "5000000"
  @analyze_duration "5000000"

  @spec probe_url(String.t()) :: {:ok, map()} | {:error, atom()}
  def probe_url(url) when is_binary(url) do
    unless tools_available?() do
      {:error, :engine_unavailable}
    else
      args = [
        "-v",
        "error",
        "-probesize",
        @probe_size,
        "-analyzeduration",
        @analyze_duration,
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
        url
      ]

      case System.cmd("ffprobe", args, stderr_to_stdout: true, env: []) do
        {output, 0} ->
          parse_probe_json(output, url)

        {output, _} ->
          Logger.debug("theater_media probe failed", scrub: scrub_url(url), output: String.slice(output, 0, 200))
          {:error, :probe_failed}
      end
    end
  end

  def tools_available? do
    ffprobe_ok?() and ffmpeg_ok?()
  end

  def ffprobe_ok?, do: executable?("ffprobe")
  def ffmpeg_ok?, do: executable?("ffmpeg")

  defp executable?(name) do
    case System.find_executable(name) do
      nil -> false
      _ -> true
    end
  end

  defp parse_probe_json(output, url) do
    with {:ok, decoded} <- Jason.decode(output) do
      streams = decoded["streams"] || []
      video = Enum.find(streams, &(&1["codec_type"] == "video"))
      audio = Enum.find(streams, &(&1["codec_type"] == "audio"))
      format = decoded["format"] || %{}

      {:ok,
       %{
         "sourceUrl" => url,
         "container" => container_from_format(format),
         "duration" => parse_float(format["duration"]),
         "videoCodec" => video && video["codec_name"],
         "audioCodec" => audio && audio["codec_name"],
         "width" => video && video["width"],
         "height" => video && video["height"],
         "frameRate" => video && video["r_frame_rate"],
         "audioTracks" => Enum.count(streams, &(&1["codec_type"] == "audio")),
         "subtitleTracks" => Enum.count(streams, &(&1["codec_type"] == "subtitle"))
       }}
    else
      _ -> {:error, :probe_failed}
    end
  end

  defp container_from_format(%{"format_name" => names}) when is_binary(names) do
    names |> String.split(",") |> List.first() || ""
  end

  defp container_from_format(_), do: ""

  defp parse_float(nil), do: nil

  defp parse_float(value) when is_binary(value) do
    case Float.parse(value) do
      {f, _} -> f
      :error -> nil
    end
  end

  defp parse_float(value) when is_number(value), do: value * 1.0
  defp parse_float(_), do: nil

  defp scrub_url(url) do
    case URI.parse(url) do
      %URI{scheme: scheme, host: host, path: path} ->
        "#{scheme}://#{host}#{path}"

      _ ->
        "[invalid-url]"
    end
  end
end
