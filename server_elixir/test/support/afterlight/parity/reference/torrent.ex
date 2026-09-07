defmodule Afterlight.Parity.Reference.Torrent do
  @moduledoc """
  Parity reference for shared/torrentModel.js + server/torrents.js parseRange.

  Ported 1:1 from the JavaScript; semantics pinned by
  tests/fixtures/parity/torrent-model.json. Key hazards honored here:
  js Number coercion (null → 0, absent → NaN), JS Math.round-free integer
  paths, WHATWG-style searchParams for magnets, and the exact stable-sort
  comparator of orderFilesForPicker.
  """

  @behaviour Afterlight.Parity.Reference

  alias Afterlight.Parity.Hazards

  @url_max 2048
  @path_max 512
  @picker_files_max 60

  @video_exts MapSet.new(["mp4", "m4v", "webm", "mov", "ogv", "ogg", "mkv", "avi"])
  @browser_playable MapSet.new(["mp4", "m4v", "webm", "mov", "ogv", "ogg"])
  @hex_re ~r/^[0-9a-fA-F]{40}$/
  @base32_re ~r/^[A-Z2-7]{32}$/
  @base32_alphabet "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

  def run_case_fn("parseMagnet", [url], _now), do: Afterlight.Specialty.TorrentRules.parse_magnet(url)
  def run_case_fn("sanitizeTorrentPick", [raw], _now), do: sanitize_torrent_pick(raw)
  def run_case_fn("orderFilesForPicker", [files], _now), do: order_files_for_picker(files, @picker_files_max)
  def run_case_fn("normalizeTorrentStatus", [raw], _now), do: normalize_torrent_status(raw)
  def run_case_fn("parseRange", [header, total], _now), do: parse_range(header, total)

  # -- parseMagnet ------------------------------------------------------------

  def parse_magnet(raw), do: Afterlight.Specialty.TorrentModel.parse_magnet(raw)

  # -- sanitizeTorrentPick ----------------------------------------------------

  def sanitize_torrent_pick(raw) when not is_map(raw) or is_struct(raw), do: nil

  def sanitize_torrent_pick(raw) do
    file_index = Hazards.js_to_number(Map.get(raw, "fileIndex", :absent))
    file_path = path_of(raw)
    file_bytes = Hazards.js_to_number(Map.get(raw, "fileBytes", :absent))

    cond do
      not is_integer(file_index) or file_index < 0 or file_index > 1_000_000 -> nil
      file_path == "" or String.length(file_path) > @path_max -> nil
      file_bytes == :nan or not is_number(file_bytes) or file_bytes < 0 -> nil
      true -> %{"fileIndex" => file_index, "filePath" => file_path, "fileBytes" => file_bytes}
    end
  end

  defp path_of(raw) do
    case Map.get(raw, "filePath", :absent) do
      path when is_binary(path) -> String.trim(path)
      _ -> ""
    end
  end

  # -- orderFilesForPicker ----------------------------------------------------

  def order_files_for_picker(files, cap) do
    list = if is_list(files), do: files, else: []

    videos =
      list
      |> Enum.filter(fn f ->
        index = Hazards.js_to_number(Map.get(f || %{}, "index", :absent))
        path = Map.get(f || %{}, "path", :absent)
        is_integer(index) and index >= 0 and is_binary(path) and video_file?(path)
      end)
      |> Enum.map(fn f ->
        path = Map.fetch!(f, "path")
        length = Hazards.js_to_number(Map.get(f, "length", :absent))

        bytes =
          cond do
            length == :nan -> 0
            is_number(length) and length >= 0 -> length
            true -> 0
          end

        %{"index" => Map.fetch!(f, "index"), "path" => path, "bytes" => bytes, "playable" => MapSet.member?(@browser_playable, ext_of(path))}
      end)

    # JS: videos.sort((a, b) => (a.playable === b.playable ? b.bytes - a.bytes : a.playable ? -1 : 1))
    # ES sort is stable; Enum.sort/2 is stable too.
    Enum.sort(videos, fn a, b ->
      cond do
        a["playable"] == b["playable"] -> a["bytes"] >= b["bytes"]
        a["playable"] -> true
        true -> false
      end
    end)
    |> Enum.take(max(0, cap))
  end

  defp ext_of(path) do
    case Regex.run(~r/\.([a-z0-9]+)$/i, path) do
      [_, ext] -> String.downcase(ext)
      _ -> ""
    end
  end

  def video_file?(path), do: MapSet.member?(@video_exts, ext_of(path))

  # -- normalizeTorrentStatus -------------------------------------------------

  def normalize_torrent_status(raw) when not is_map(raw), do: nil

  def normalize_torrent_status(raw) do
    infohash =
      case Map.get(raw, "infohash") do
        v when is_binary(v) ->
          if Regex.match?(~r/^[0-9a-f]{40}$/, v), do: v, else: nil

        _ ->
          nil
      end

    if infohash do
      progress = Hazards.js_to_number(Map.get(raw, "progress", :absent))
      peers = Hazards.js_to_number(Map.get(raw, "peers", :absent))
      downloaded = Hazards.js_to_number(Map.get(raw, "downloaded", :absent))

      %{
        "infohash" => infohash,
        "progress" => clamp_progress(progress),
        "peers" => coerce_nonneg_int(peers),
        "downloaded" => coerce_nonneg_num(downloaded),
        "ready" => Map.get(raw, "ready") == true
      }
    end
  end

  defp clamp_progress(:nan), do: 0

  defp clamp_progress(p) when is_number(p), do: min(1.0, max(0, p))

  defp clamp_progress(_), do: 0

  defp coerce_nonneg_int(p) when is_integer(p) and p >= 0, do: p
  defp coerce_nonneg_int(_), do: 0

  defp coerce_nonneg_num(p) when is_number(p) and p >= 0, do: p
  defp coerce_nonneg_num(_), do: 0

  # -- parseRange (server/torrents.js) ---------------------------------------

  def parse_range(header, total) when not is_binary(header), do: nil
  def parse_range(_header, total) when not is_number(total) or total == 0, do: nil

  def parse_range(header, total) when is_number(total) do
    case Regex.run(~r/^bytes=(\d*)-(\d*)$/, String.trim(header)) do
      [_, raw_start, raw_end] -> build_range(raw_start, raw_end, total)
      nil -> nil
    end
  end

  defp build_range("", "", _total), do: nil

  defp build_range("", raw_end, total) do
    suffix = parse_digits(raw_end)

    if is_integer(suffix) and suffix > 0 do
      %{"start" => max(0, total - suffix), "end" => total - 1}
    else
      nil
    end
  end

  defp build_range(raw_start, raw_end, total) do
    start = parse_digits(raw_start)

    if is_integer(start) and start >= 0 and start < total do
      if raw_end == "" do
        %{"start" => start, "end" => total - 1}
      else
        case parse_digits(raw_end) do
          end_ when is_integer(end_) and end_ >= start ->
            %{"start" => start, "end" => min(end_, total - 1)}

          _ ->
            nil
        end
      end
    else
      nil
    end
  end

  defp parse_digits(digits) do
    case Integer.parse(digits) do
      {n, ""} -> n
      _ -> :not_integer
    end
  end
end
