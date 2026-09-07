defmodule Afterlight.Catalog.Model do
  @moduledoc """
  Pure model for IPTV playlists and XMLTV program guide in Afterlight.

  Ported 1:1 from shared/iptvModel.js. Side-effect free; mutations flow
  state-in → state-out.
  """

  alias Afterlight.Catalog.M3U

  # IPTV_LIMITS (shared/iptvModel.js)
  @lists_max 24
  @list_text_max 8 * 1024 * 1024
  @channels_max 20_000
  @name_max 80
  @channel_name_max 200
  @group_max 120
  @epg_name_max 120
  @epg_channels_max 50_000
  @epg_programmes_max 250_000
  @epg_lookup_max 300
  @desc_max 200
  @http_re ~r{^https?://}i

  def lists_max, do: @lists_max
  def list_text_max, do: @list_text_max
  def channels_max, do: @channels_max
  def name_max, do: @name_max
  def group_max, do: @group_max
  def epg_name_max, do: @epg_name_max
  def epg_channels_max, do: @epg_channels_max
  def epg_programmes_max, do: @epg_programmes_max
  def epg_lookup_max, do: @epg_lookup_max

  # -- applyAddPlaylist --------------------------------------------------------

  def apply_add_playlist(library, opts, now_ms \\ nil)

  def apply_add_playlist(library, opts, now_ms) when is_map(opts) do
    now_ms = now_ms || System.system_time(:millisecond)
    text = Map.get(opts, "text")
    lists = library_lists(library)

    cond do
      not is_binary(text) or text == "" ->
        error_result("not_a_playlist")

      utf16_length(text) > @list_text_max ->
        error_result("text_too_large")

      length(lists) >= @lists_max ->
        error_result("too_many_lists")

      true ->
        parsed = M3U.parse_m3u(text)

        cond do
          not parsed["recognized"] ->
            error_result("not_a_playlist")

          parsed["entries"] == [] ->
            error_result("no_channels")

          length(parsed["entries"]) > @channels_max ->
            error_result("too_many_channels")

          true ->
            list = %{
              "id" => new_id(now_ms),
              "name" => clean_name(opts["name"], "Imported #{imported_date(now_ms)}"),
              "addedBy" => clean_added_by(opts["addedBy"]),
              "addedAt" => number_or(now_ms, now_ms || 0),
              "channels" => M3U.sanitize_channels(parsed["entries"], @channels_max)
            }

            %{"library" => %{"lists" => lists ++ [list]}, "error" => nil, "list" => list}
        end
    end
  end

  def apply_add_playlist(_library, _opts, _now_ms), do: error_result("not_a_playlist")

  defp error_result(reason), do: %{"library" => nil, "error" => reason, "list" => nil}

  # -- applyRemoveList ---------------------------------------------------------

  def apply_remove_list(library, list_id) do
    lists = library_lists(library)

    idx = Enum.find_index(lists, fn l -> is_map(l) and Map.get(l, "id") == list_id end)

    case idx do
      nil ->
        %{"library" => nil, "error" => "list_not_found"}

      found ->
        %{"library" => %{"lists" => List.delete_at(lists, found)}, "error" => nil}
    end
  end

  # -- normalizeIptvLibrary ----------------------------------------------------

  def normalize_iptv_library(raw, now_ms \\ nil) do
    now_ms = now_ms || System.system_time(:millisecond)

    raw_lists =
      case raw do
        %{"lists" => lists} when is_list(lists) -> lists
        _ -> []
      end

    lists =
      raw_lists
      |> Enum.reduce_while([], fn entry, acc ->
        if length(acc) >= @lists_max do
          {:halt, acc}
        else
          case normalize_list_entry(entry, now_ms) do
            nil -> {:cont, acc}
            list -> {:cont, [list | acc]}
          end
        end
      end)
      |> Enum.reverse()

    %{"lists" => lists}
  end

  defp normalize_list_entry(entry, now_ms) when is_map(entry) do
    channels = M3U.sanitize_channels(Map.get(entry, "channels"), @channels_max)

    if channels == [] do
      nil
    else
      id = Map.get(entry, "id")
      added_at = finite_number_or(Map.get(entry, "addedAt"), now_ms || 0)

      %{
        "id" => if(is_binary(id) and id != "", do: id, else: new_id(now_ms)),
        "name" => clean_name(Map.get(entry, "name"), "Untitled list"),
        "addedBy" => clean_added_by(Map.get(entry, "addedBy")),
        "addedAt" => added_at,
        "channels" => channels
      }
    end
  end

  defp normalize_list_entry(_entry, _now_ms), do: nil

  # -- applySetEpg -------------------------------------------------------------

  def apply_set_epg(_prev, guide, now_ms), do: apply_set_epg(guide, now_ms)

  def apply_set_epg(arg, now_ms \\ nil) do
    now_ms = now_ms || System.system_time(:millisecond)

    name =
      case arg do
        %{"name" => n} -> n
        _ -> nil
      end

    epg = %{
      "name" => name |> clean_name("Program guide") |> utf16_slice(@epg_name_max),
      "updatedAt" => number_or(now_ms, now_ms || 0),
      "channels" => sanitize_guide_channels(map_field(arg, "channels"), @epg_channels_max),
      "programmes" =>
        sanitize_guide_programmes(map_field(arg, "programmes"), @epg_programmes_max)
    }

    %{"epg" => epg}
  end

  # -- normalizeEpg ------------------------------------------------------------

  def normalize_epg(raw, now_ms \\ nil)

  def normalize_epg(nil, _now_ms), do: nil

  def normalize_epg(raw, now_ms) when is_map(raw) do
    updated = finite_number_or(Map.get(raw, "updatedAt"), now_ms || 0)
    %{"epg" => epg} = apply_set_epg(raw, updated)
    epg
  end

  def normalize_epg(_raw, _now_ms), do: nil

  # -- epgSummary --------------------------------------------------------------

  def epg_summary(nil), do: nil

  def epg_summary(epg) when is_map(epg) do
    programmes = map_field(epg, "programmes")

    {channel_count, programme_count} =
      Enum.reduce(programmes, {0, 0}, fn {_id, arr}, {c, p} ->
        if is_list(arr) and arr != [], do: {c + 1, p + length(arr)}, else: {c, p}
      end)

    %{
      "name" => Map.get(epg, "name"),
      "updatedAt" => Map.get(epg, "updatedAt"),
      "channels" => channel_count,
      "programmes" => programme_count
    }
  end

  # -- catalogSnapshot ---------------------------------------------------------

  def catalog_snapshot(arg) do
    lists =
      case arg do
        %{"lists" => ls} when is_list(ls) -> ls
        _ -> []
      end

    epg =
      case arg do
        %{"epg" => epg} -> epg
        _ -> nil
      end

    %{
      "lists" =>
        Enum.map(lists, fn l ->
          channels = Map.get(l, "channels")

          %{
            "id" => Map.get(l, "id"),
            "name" => Map.get(l, "name"),
            "addedBy" => Map.get(l, "addedBy"),
            "channelCount" => if(is_list(channels), do: length(channels), else: 0)
          }
        end),
      "epg" => epg_summary(epg)
    }
  end

  # -- private helpers ---------------------------------------------------------

  defp sanitize_guide_channels(raw, max) do
    entries = if is_map(raw), do: Enum.sort(Map.to_list(raw)), else: []
    guide_channels(entries, max, 0, %{})
  end

  defp guide_channels(_entries, max, count, acc) when count >= max, do: acc
  defp guide_channels([], _max, _count, acc), do: acc

  defp guide_channels([{id, ch} | rest], max, count, acc)
       when is_binary(id) and id != "" and is_map(ch) do
    names =
      case Map.get(ch, "names") do
        ns when is_list(ns) ->
          ns
          |> Enum.filter(fn n -> is_binary(n) and String.trim(n) != "" end)
          |> Enum.map(fn n -> utf16_slice(String.trim(n), @channel_name_max) end)
          |> Enum.take(6)

        _ ->
          []
      end

    icon =
      case Map.get(ch, "icon") do
        v when is_binary(v) ->
          if Regex.match?(@http_re, v), do: v, else: nil

        _ ->
          nil
      end

    guide_channels(rest, max, count + 1, Map.put(acc, id, %{"names" => names, "icon" => icon}))
  end

  defp guide_channels([_ | rest], max, count, acc), do: guide_channels(rest, max, count, acc)

  defp sanitize_guide_programmes(raw, max) do
    entries = if is_map(raw), do: Enum.sort(Map.to_list(raw)), else: []
    guide_programmes(entries, max, 0, %{})
  end

  defp guide_programmes([], _max, _count, acc), do: acc
  defp guide_programmes(_entries, max, count, acc) when count >= max, do: acc

  defp guide_programmes([{id, arr} | rest], max, count, acc)
       when is_binary(id) and id != "" and is_list(arr) do
    case collect_programme_entries(arr, max, count, []) do
      {:done, entries, count2} when entries != [] ->
        sorted = Enum.sort_by(entries, &hd/1)
        guide_programmes(rest, max, count2, Map.put(acc, id, sorted))

      {:done, _entries, count2} ->
        guide_programmes(rest, max, count2, acc)

      :capped ->
        acc
    end
  end

  defp guide_programmes([_ | rest], max, count, acc), do: guide_programmes(rest, max, count, acc)

  defp collect_programme_entries([], _max, count, out), do: {:done, Enum.reverse(out), count}
  defp collect_programme_entries(_arr, max, count, _out) when count >= max, do: :capped

  defp collect_programme_entries([e | rest], max, count, out) when is_list(e) and length(e) >= 3 do
    start = Enum.at(e, 0)
    stop = Enum.at(e, 1)
    title = Enum.at(e, 2)

    valid? =
      is_number(start) and is_number(stop) and stop > start and
        is_binary(title) and String.trim(title) != ""

    if valid? do
      title = utf16_slice(String.trim(title), @channel_name_max)

      desc =
        case Enum.at(e, 3) do
          d when is_binary(d) ->
            trimmed = String.trim(d)
            if trimmed == "", do: nil, else: utf16_slice(trimmed, @desc_max)

          _ ->
            nil
        end

      entry = if desc, do: [start, stop, title, desc], else: [start, stop, title]
      collect_programme_entries(rest, max, count + 1, [entry | out])
    else
      collect_programme_entries(rest, max, count, out)
    end
  end

  defp collect_programme_entries([_ | rest], max, count, out),
    do: collect_programme_entries(rest, max, count, out)

  defp library_lists(%{"lists" => lists}) when is_list(lists), do: lists
  defp library_lists(_), do: []

  defp map_field(arg, key) when is_map(arg) do
    case Map.get(arg, key) do
      v when is_map(v) -> v
      _ -> %{}
    end
  end

  defp map_field(_, _), do: %{}

  defp clean_name(value, fallback) when is_binary(value) do
    clean = value |> String.replace(~r/\s+/, " ") |> String.trim() |> utf16_slice(@name_max)
    if clean == "", do: fallback, else: clean
  end

  defp clean_name(_value, fallback), do: fallback

  defp clean_added_by(value) when is_binary(value) do
    trimmed = String.trim(value)
    if trimmed == "", do: "Someone", else: utf16_slice(trimmed, 40)
  end

  defp clean_added_by(_value), do: "Someone"

  defp new_id(now_ms) do
    tail = now_ms |> number_or(0) |> trunc() |> Integer.to_string(36) |> String.downcase()
    "iptv_#{tail}_x"
  end

  defp imported_date(now_ms) do
    case DateTime.from_unix(number_or(now_ms, 0), :millisecond) do
      {:ok, dt} -> Calendar.strftime(dt, "%Y-%m-%d")
      _ -> "1970-01-01"
    end
  end

  defp number_or(value, fallback) do
    case js_to_number(if(value == nil, do: :absent, else: value)) do
      n when is_number(n) and n != 0 -> n
      _ -> fallback
    end
  end

  defp finite_number_or(value, fallback) do
    case js_to_number(value) do
      n when is_number(n) -> n
      _ -> fallback
    end
  end

  def utf16_slice(value, max) when is_binary(value) do
    utf16 = :unicode.characters_to_binary(value, :utf8, {:utf16, :big})
    units = div(byte_size(utf16), 2) |> min(max)
    truncated = binary_part(utf16, 0, units * 2)
    :unicode.characters_to_binary(truncated, {:utf16, :big}, :utf8)
  end

  def utf16_slice(_value, _max), do: ""

  def utf16_length(value) when is_binary(value) do
    div(byte_size(:unicode.characters_to_binary(value, :utf8, {:utf16, :big})), 2)
  end

  def utf16_length(_), do: 0

  def js_to_number(n) when is_number(n), do: n
  def js_to_number(:absent), do: :nan
  def js_to_number(""), do: 0

  def js_to_number(<<char, rest::binary>>) when char in [?\s, ?\t, ?\n, ?\r] do
    case String.trim(rest) do
      "" -> 0
      _ -> js_parse(rest)
    end
  end

  def js_to_number(value) when is_binary(value), do: js_parse(value)
  def js_to_number(nil), do: 0
  def js_to_number(true), do: 1
  def js_to_number(false), do: 0
  def js_to_number(_), do: :nan

  defp js_parse("0x" <> hex) do
    case Integer.parse(hex, 16) do
      {n, ""} -> n
      _ -> :nan
    end
  end

  defp js_parse(value) do
    trimmed = String.trim(value)

    case Float.parse(trimmed) do
      {f, ""} ->
        if f == trunc(f) and not (trimmed =~ "." or trimmed =~ "e" or trimmed =~ "E") do
          trunc(f)
        else
          f
        end

      _ ->
        :nan
    end
  end
end
