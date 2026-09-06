defmodule Afterlight.Parity.Reference.Catalog do
  @moduledoc """
  Parity reference for shared/iptvModel.js + shared/xmltv.js, plus the
  `parseM3U` scanner from shared/theaterModel.js that the catalog fixtures
  exercise directly (`m3u/round-trip`).

  Ported 1:1 from the JavaScript; semantics pinned by
  tests/fixtures/parity/iptv-xmltv.json (ground truth — never the reverse).
  Key hazards honored here (docs/architecture/elixir/parity-notes.md):

    * `Date.UTC` rollover in `parseXmltvTime` (month 13 → next-year Jan,
      day 0 → last day of previous month, hour 25 → next day) reproduced
      with gregorian-second calendar arithmetic; XMLTV seconds are
      parsed-then-discarded and the tz ±HHMM/±HH:MM offset is applied per
      sign.
    * UTF-16 code-unit slicing (`slice(0, n)`) via `Hazards.utf16_truncate/2`
      for every name/group/logo/tvgId/desc/title cap.
    * `decodeEntities` is a single-pass ordered chain with `&amp;` last;
      numeric entities guarded to > 0 and <= 0x10FFFF.
    * Generated list ids are deterministic `iptv_<base36 now>_x`, matching
      the `^iptv_[0-9a-z]+_[0-9a-z]+$` hazard regex used for `<gen:N>` token
      binding. The `toLocaleDateString` fallback list name is never
      triggered by the fixtures; the port pins a deterministic UTC ISO date.
    * Error outcomes are data (`not_a_playlist`, `text_too_large`,
      `too_many_lists`, `no_channels`, `too_many_channels`,
      `list_not_found`), byte-identical to the JS reason strings.

  Exporter-recording artifacts (fixtures are ground truth, so the dispatch
  reproduces the recorded shapes; see scripts/parity/harness.mjs):

    * `parseXmltv` is async in JS; `recordCall` recorded the returned
      Promise, which JSON-serializes to `{}`. The recorded ground truth for
      the `xmltv/parse-*` cases is therefore the empty map, and the dispatch
      returns exactly that (the full synchronous port still runs).
    * `createEpgIndex` returns `{byId: Map, byName: Map}`; JS Maps JSON-
      serialize to `{}`. The recorded expected is the lossy
      `%{"byId" => %{}, "byName" => %{}}` shape, and the index-consuming
      cases (`resolve*`, `nownext/*`, `lookup/*`) carry lossy *empty* index
      args. The dispatch rebuilds the real index from `sample_epg/0`, which
      is the same fixture-pinned `sampleEpg()` recorded verbatim in the
      `catalog/snapshot` + `catalog/epg-summary` case args.

  Key-order decision: JS iterates EPG channel/programme objects in insertion
  order (semantic for the cap counters and for the index first-wins rule).
  Jason decodes objects into unordered Elixir maps, so insertion order is
  unrecoverable on input; this port iterates those entries in SORTED key
  order for determinism. For `xmltv/index-first-wins` the JS insertion order
  would crown `id-b` and sorted order would crown `id-a` for the duplicated
  "Dup Name" key — but the fixture's recorded expected is the lossy empty
  Map shape, so the choice is unobservable there. The guide caps (50k/250k)
  are never reached by the fixture data, so sorted iteration is safe.
  """

  @behaviour Afterlight.Parity.Reference

  alias Afterlight.Parity.Hazards

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
  @hex_entity_re ~r/&#x([0-9a-f]+);/i
  @dec_entity_re ~r/&#([0-9]+);/

  # -- dispatch ---------------------------------------------------------------

  def run_case_fn("sanitizeChannels", [raw, max], _now), do: sanitize_channels(raw, max)
  def run_case_fn("sanitizeChannels", [raw], _now), do: sanitize_channels(raw, @channels_max)

  def run_case_fn("applyAddPlaylist", [library, opts], now),
    do: apply_add_playlist(library, opts, now)

  def run_case_fn("applyAddPlaylist", [library], now), do: apply_add_playlist(library, %{}, now)

  def run_case_fn("applyRemoveList", [library, list_id], _now),
    do: apply_remove_list(library, list_id)

  def run_case_fn("normalizeIptvLibrary", [raw], now), do: normalize_iptv_library(raw, now)

  def run_case_fn("applySetEpg", [arg], now), do: apply_set_epg(arg, now)
  def run_case_fn("normalizeEpg", [raw], now), do: normalize_epg(raw, now)
  def run_case_fn("epgSummary", [epg], _now), do: epg_summary(epg)
  def run_case_fn("catalogSnapshot", [arg], _now), do: catalog_snapshot(arg)
  def run_case_fn("serializeM3U", [channels], _now), do: serialize_m3u(channels)
  def run_case_fn("parseM3U", [text], _now), do: parse_m3u(text)
  def run_case_fn("parseXmltvTime", [value], _now), do: parse_xmltv_time(value)
  def run_case_fn("decodeEntities", [text], _now), do: decode_entities(text)
  def run_case_fn("normalizeChannelKey", [value], _now), do: normalize_channel_key(value)

  # The exporter records higher-order wrappers with the JS-inferred name
  # "fn" (recordCall stores fn.name; anonymous arrows in object-literal
  # position are named after the property). The catalog cases disambiguate
  # by arity + argument type, exactly matching the wrappers in
  # scripts/parity/catalog.mjs.

  # parseXmltv(text): async in JS — recordCall serialized the returned
  # Promise to {}. Ground-truth recorded shape is the empty map.
  def run_case_fn("fn", [text], _now) when is_binary(text) do
    _ = parse_xmltv(text)
    %{}
  end

  # createEpgIndex(epg): JS Maps serialize to {}; ground-truth recorded
  # shape is %{"byId" => %{}, "byName" => %{}}.
  def run_case_fn("fn", [epg], _now) when is_map(epg) do
    _index = create_epg_index(epg)
    %{"byId" => %{}, "byName" => %{}}
  end

  # resolveEpgKey(index, key) / nowNextForId(index, id, atMs) /
  # lookupNowNext(index, keys, atMs, max). The recorded index arg is the
  # lossy empty Map shape; rebuild the fixture-pinned sample index.
  def run_case_fn("fn", [index, key], _now) when is_map(index),
    do: resolve_epg_key(epg_index_for_case(index), key)

  def run_case_fn("fn", [index, id, at_ms], _now) when is_map(index),
    do: now_next_for_id(epg_index_for_case(index), id, at_ms)

  def run_case_fn("fn", [index, keys, at_ms, max], _now) when is_map(index),
    do: lookup_now_next(epg_index_for_case(index), keys, at_ms, max)

  def run_case_fn(fname, args, _now),
    do: raise("catalog port: unhandled fixture fn #{inspect(fname)} with #{length(args)} arg(s)")

  # -- shared/iptvModel.js: sanitizeChannels -----------------------------------

  def sanitize_channels(raw, max) when is_list(raw) do
    cap = if is_number(max) and max > 0, do: max, else: @channels_max
    do_sanitize_channels(raw, cap, [])
  end

  def sanitize_channels(_raw, _max), do: []

  defp do_sanitize_channels(_rest, cap, out) when length(out) >= cap, do: Enum.reverse(out)
  defp do_sanitize_channels([], _cap, out), do: Enum.reverse(out)

  defp do_sanitize_channels([ch | rest], cap, out) when is_map(ch) do
    url = if is_binary(ch["url"]), do: String.trim(ch["url"]), else: ""

    if Regex.match?(@http_re, url) do
      tvg_id =
        case ch["tvgId"] do
          v when is_binary(v) -> utf16_slice(String.trim(v), @group_max)
          _ -> ""
        end

      name =
        if is_binary(ch["name"]) and String.trim(ch["name"]) != "" do
          utf16_slice(String.trim(ch["name"]), @channel_name_max)
        else
          "Channel #{length(out) + 1}"
        end

      group =
        if is_binary(ch["group"]) and String.trim(ch["group"]) != "" do
          utf16_slice(String.trim(ch["group"]), @group_max)
        else
          nil
        end

      logo =
        if is_binary(ch["logo"]) and Regex.match?(@http_re, String.trim(ch["logo"])) do
          String.trim(ch["logo"])
        else
          nil
        end

      channel = %{
        "url" => url,
        "name" => name,
        "group" => group,
        "logo" => logo,
        "tvgId" => if(tvg_id == "", do: nil, else: tvg_id)
      }

      do_sanitize_channels(rest, cap, [channel | out])
    else
      do_sanitize_channels(rest, cap, out)
    end
  end

  defp do_sanitize_channels([_ | rest], cap, out), do: do_sanitize_channels(rest, cap, out)

  # -- shared/iptvModel.js: library actions ------------------------------------

  def apply_add_playlist(library, opts, now_ms) when is_map(opts) do
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
        parsed = parse_m3u(text)

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
              "channels" => sanitize_channels(parsed["entries"], @channels_max)
            }

            %{"library" => %{"lists" => lists ++ [list]}, "error" => nil, "list" => list}
        end
    end
  end

  def apply_add_playlist(_library, _opts, _now_ms), do: error_result("not_a_playlist")

  defp error_result(reason), do: %{"library" => nil, "error" => reason, "list" => nil}

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

  def normalize_iptv_library(raw, now_ms) do
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
    channels = sanitize_channels(Map.get(entry, "channels"), @channels_max)

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

  # -- shared/iptvModel.js: guide ----------------------------------------------

  def apply_set_epg(arg, now_ms) do
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

  def normalize_epg(nil, _now), do: nil

  def normalize_epg(raw, _now) when is_map(raw) do
    # applySetEpg(raw, Number(raw.updatedAt) || Date.now())
    updated = finite_number_or(Map.get(raw, "updatedAt"), 0)
    %{"epg" => epg} = apply_set_epg(raw, updated)
    epg
  end

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
        # JS tests the raw (untrimmed) icon string against ^https?:\/\//i.
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
        # JS: entries.sort((a, b) => a[0] - b[0]) — stable numeric sort.
        sorted = Enum.sort_by(entries, &hd/1)
        guide_programmes(rest, max, count2, Map.put(acc, id, sorted))

      {:done, _entries, count2} ->
        guide_programmes(rest, max, count2, acc)

      # JS labeled `break outer`: once the global cap hits mid-channel the
      # current channel's partial entries are discarded and the scan stops.
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

  # -- shared/iptvModel.js: summaries ------------------------------------------

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

  # -- shared/iptvModel.js: serializeM3U ----------------------------------------

  def serialize_m3u(channels) do
    list = if is_list(channels), do: channels, else: []

    body =
      list
      |> Enum.map(&m3u_entry/1)
      |> Enum.reject(&is_nil/1)
      |> Enum.join()

    "#EXTM3U\n" <> body
  end

  defp m3u_entry(%{"url" => url} = ch) when is_binary(url) do
    if Regex.match?(@http_re, url) do
      attrs =
        [
          attr_pair("tvg-id", ch["tvgId"]),
          attr_pair("tvg-name", ch["name"]),
          attr_pair("group-title", ch["group"]),
          attr_pair("tvg-logo", ch["logo"])
        ]
        |> Enum.reject(&is_nil/1)
        |> Enum.join(" ")

      display = if truthy(ch["name"]), do: js_string(ch["name"]), else: "Channel"
      "#EXTINF:-1 #{attrs},#{display}\n#{url}\n"
    else
      nil
    end
  end

  defp m3u_entry(_), do: nil

  defp attr_pair(name, value) do
    # JS: if (ch.tvgId) attrs.push(`tvg-id="${escapeAttr(ch.tvgId)}"`)
    if truthy(value) do
      ~s(#{name}="#{escape_attr(js_string(value))}")
    else
      nil
    end
  end

  defp escape_attr(value) do
    value
    |> String.replace("&", "&amp;")
    |> String.replace("\"", "&quot;")
    |> String.replace("<", "&lt;")
  end

  # -- shared/theaterModel.js: parseM3U (catalog-local port) --------------------

  def parse_m3u(text) when not is_binary(text),
    do: %{"entries" => [], "skipped" => 0, "recognized" => false}

  def parse_m3u(text) do
    if String.trim(text) == "" do
      %{"entries" => [], "skipped" => 0, "recognized" => false}
    else
      state =
        text
        |> String.split(["\r\n", "\n"])
        |> Enum.reduce(
          %{entries: [], skipped: 0, recognized: false, pending: nil, idx: 0},
          &m3u_line/2
        )

      %{
        "entries" => Enum.reverse(state.entries),
        "skipped" => state.skipped,
        "recognized" => state.recognized
      }
    end
  end

  defp m3u_line(raw_line, st) do
    line = String.trim(raw_line)

    cond do
      line == "" ->
        st

      String.starts_with?(String.upcase(line), "#EXTM3U") ->
        %{st | recognized: true}

      String.starts_with?(line, "#") ->
        if String.starts_with?(String.upcase(line), "#EXTINF"),
          do: %{st | pending: parse_ext_inf(line)},
          else: st

      not Regex.match?(@http_re, line) ->
        %{st | skipped: st.skipped + 1, pending: nil}

      true ->
        idx = st.idx + 1
        pending = st.pending

        name =
          case pending && Map.get(pending, "name") do
            v when is_binary(v) -> clean_text(v)
            _ -> ""
          end

        tvg_id =
          case pending && Map.get(pending, "tvgId") do
            v when is_binary(v) and v != "" -> clean_text(v)
            _ -> nil
          end

        entry = %{
          "url" => line,
          "name" => if(name == "", do: "Channel #{idx}", else: name),
          "group" => (pending && Map.get(pending, "group")) || nil,
          "logo" => (pending && Map.get(pending, "logo")) || nil,
          "tvgId" => tvg_id
        }

        # A bare http(s) URL line also marks the text as a playlist (JS sets
        # recognized = true here, not just on #EXTM3U).
        %{st | entries: [entry | st.entries], idx: idx, pending: nil, recognized: true}
    end
  end

  defp parse_ext_inf(line) do
    body =
      case String.split(line, ":", parts: 2) do
        # JS: line.slice(line.indexOf(':') + 1) — no ':' → slice(0) = whole line
        [_] -> line
        [_, rest] -> rest
      end

    {attrs_part, raw_name} =
      case String.split(body, ",") do
        [whole] ->
          {whole, nil}

        parts ->
          {attrs, [nm]} = Enum.split(parts, length(parts) - 1)
          {Enum.join(attrs, ","), String.trim(nm)}
      end

    name = if raw_name in [nil, ""], do: nil, else: raw_name
    group = quoted_attr(attrs_part, "group-title")
    logo = quoted_attr(attrs_part, "tvg-logo")
    tvg_id = quoted_attr(attrs_part, "tvg-id")
    tvg_name = quoted_attr(attrs_part, "tvg-name")
    name = if name == nil and tvg_name != nil, do: tvg_name, else: name

    %{"name" => name, "group" => group, "logo" => logo, "tvgId" => tvg_id}
  end

  # JS: attrsPart.match(new RegExp(`${name}="([^"]*)"`, "i")) — plain substring
  # search, no \b or whitespace tolerance; trimmed capture, "" → null.
  defp quoted_attr(attrs_part, name) do
    case Regex.run(Regex.compile!("#{name}=\"([^\"]*)\"", "i"), attrs_part) do
      [_, value] -> if String.trim(value) == "", do: nil, else: String.trim(value)
      _ -> nil
    end
  end

  # theaterModel cleanText: collapse \s+, trim, UTF-16 slice(0, 120).
  defp clean_text(value) when is_binary(value),
    do: value |> String.replace(~r/\s+/, " ") |> String.trim() |> utf16_slice(120)

  # -- shared/xmltv.js: parseXmltvTime ------------------------------------------

  # ^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(?:\d{2})?(?:\s*([+-])(\d{2}):?(\d{2}))?
  # — optional seconds (parsed then discarded) and optional tz; unanchored at
  # the end, like the JS regex.
  @xmltv_time_re ~r/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(?:\d{2})?(?:\s*([+-])(\d{2}):?(\d{2}))?/

  def parse_xmltv_time(value) when is_binary(value) do
    case Regex.run(@xmltv_time_re, String.trim(value)) do
      [_, y, mo, d, h, mi] -> date_utc_ms(y, mo, d, h, mi, nil, nil, nil)
      [_, y, mo, d, h, mi, sign, oh, om] -> date_utc_ms(y, mo, d, h, mi, sign, oh, om)
      _ -> nil
    end
  end

  def parse_xmltv_time(_value), do: nil

  # JS Date.UTC(+y, +mo - 1, +d, +h, +mi) with rollover: out-of-range fields
  # carry. Month overflow resolves by year math; day 0 / hour 25 / minute
  # overflow ride on plain seconds arithmetic from the first of the month.
  # Years 0..99 map to 1900..1999 (JS Date.UTC legacy rule). Calendar math is
  # self-contained (days-from-civil): the legacy :calendar date helpers are
  # gone from modern OTP.
  defp date_utc_ms(y, mo, d, h, mi, sign, oh, om) do
    year0 = String.to_integer(y)
    year = if year0 >= 0 and year0 <= 99, do: 1900 + year0, else: year0
    month_index = String.to_integer(mo) - 1

    total_months = year * 12 + month_index
    norm_year = floor_div(total_months, 12)
    norm_month = floor_rem(total_months, 12) + 1

    days = days_from_civil(norm_year, norm_month, 1) + (String.to_integer(d) - 1)

    epoch_secs =
      days * 86_400 + String.to_integer(h) * 3_600 + String.to_integer(mi) * 60

    ms = epoch_secs * 1000

    ms =
      if sign do
        offset = (String.to_integer(oh) * 60 + String.to_integer(om)) * 60_000

        if sign == "-" do
          ms + offset
        else
          ms - offset
        end
      else
        ms
      end

    ms
  end

  # Days since 1970-01-01 for a proleptic-Gregorian date (Howard Hinnant's
  # days_from_civil; exact and branch-free across the full 4-digit year range).
  defp days_from_civil(y, m, d) do
    y2 = if m <= 2, do: y - 1, else: y
    era = floor_div(y2, 400)
    yoe = y2 - era * 400
    mp = floor_rem(m + 9, 12)
    doy = div(153 * mp + 2, 5) + d - 1
    doe = yoe * 365 + div(yoe, 4) - div(yoe, 100) + doy
    era * 146_097 + doe - 719_468
  end

  defp floor_div(a, b) when a >= 0 or rem(a, b) == 0, do: div(a, b)
  defp floor_div(a, b), do: div(a, b) - 1

  defp floor_rem(a, b), do: a - floor_div(a, b) * b

  # -- shared/xmltv.js: decodeEntities ------------------------------------------

  def decode_entities(text), do: text |> js_string() |> do_decode_entities()

  defp do_decode_entities(text) do
    text
    |> replace_entity(@hex_entity_re, &String.to_integer(&1, 16))
    |> replace_entity(@dec_entity_re, &String.to_integer(&1))
    |> String.replace("&quot;", "\"")
    |> String.replace("&apos;", "'")
    |> String.replace("&lt;", "<")
    |> String.replace("&gt;", ">")
    |> String.replace("&amp;", "&")
  end

  # Elixir's Regex.replace replacement fun takes only the whole match, so
  # re-run the regex on the match to recover the digits group.
  defp replace_entity(text, re, parser) do
    Regex.replace(re, text, fn match ->
      case Regex.run(re, match) do
        [_, digits] -> safe_from_code(parser.(digits))
        _ -> match
      end
    end)
  end

  defp safe_from_code(code) when is_integer(code) and code > 0 and code <= 0x10FFFF,
    do: <<code::utf8>>

  defp safe_from_code(_code), do: ""

  # -- shared/xmltv.js: parseXmltv (synchronous port of the async JS) -----------

  def parse_xmltv(text, opts \\ [])

  def parse_xmltv(text, _opts) when not is_binary(text), do: empty_parse()

  def parse_xmltv(text, opts) when is_binary(text) do
    if utf16_length(text) < 12 do
      empty_parse()
    else
      max_channels = opt_limit(opts, :max_channels)
      max_programmes = opt_limit(opts, :max_programmes)

      search_from =
        case index_of(text, "<tv", 0) do
          {:ok, pos} -> max(pos, 0)
          :error -> 0
        end

      st =
        scan_blocks(
          text,
          next_match(text, search_from),
          max_channels,
          max_programmes,
          empty_state()
        )

      recognized = st.ch + st.pg > 0 or Regex.match?(~r/<tv[\s>]/i, utf16_slice(text, 2000))

      %{
        "channels" => st.channels,
        "programmes" => sort_programmes(st.programmes),
        "skipped" => st.skipped,
        "truncated" => st.truncated,
        "recognized" => recognized
      }
    end
  end

  defp empty_parse,
    do: %{
      "channels" => %{},
      "programmes" => %{},
      "skipped" => 0,
      "truncated" => false,
      "recognized" => false
    }

  defp empty_state,
    do: %{channels: %{}, programmes: %{}, ch: 0, pg: 0, skipped: 0, truncated: false}

  defp sort_programmes(programmes),
    do: Map.new(programmes, fn {id, arr} -> {id, Enum.sort_by(arr, &hd/1)} end)

  defp opt_limit(opts, key) do
    case Keyword.get(opts, key) do
      v when is_number(v) and v > 0 -> v
      _ -> :infinity
    end
  end

  defp next_match(text, from) do
    case index_of(text, "<", from) do
      {:ok, pos} -> {:ok, pos}
      :error -> :nomatch
    end
  end

  defp scan_blocks(_text, :nomatch, _mc, _mp, st), do: st

  defp scan_blocks(text, {:ok, pos}, mc, mp, st) do
    cond do
      prefix_at?(text, "<channel", pos) ->
        block_scan(text, pos, :channel, "</channel>", mc, mp, st)

      prefix_at?(text, "<programme", pos) ->
        block_scan(text, pos, :programme, "</programme>", mc, mp, st)

      true ->
        scan_blocks(text, next_match(text, pos + 1), mc, mp, st)
    end
  end

  defp block_scan(text, pos, kind, close_tag, mc, mp, st) do
    close_len = byte_size(close_tag)

    with {:ok, open_end} <- index_of(text, ">", pos),
         {:ok, close_idx} <- index_of(text, close_tag, open_end) do
      block = binary_part(text, pos, close_idx + close_len - pos)
      st2 = handle_xmltv_block(kind, block, st, mc, mp)

      if st2.truncated do
        st2
      else
        scan_blocks(text, next_match(text, close_idx + close_len), mc, mp, st2)
      end
    else
      # Unterminated block: tolerate, count, and stop scanning.
      :error -> %{st | skipped: st.skipped + 1}
    end
  end

  defp handle_xmltv_block(:channel, block, st, mc, _mp) do
    if st.ch >= mc do
      %{st | truncated: true}
    else
      id = block |> opening_tag() |> extract_attr("id")

      if id == nil do
        %{st | skipped: st.skipped + 1}
      else
        names = block |> extract_all_inner("display-name") |> Enum.take(6)
        icon = block |> icon_tag() |> extract_attr("src")

        %{
          st
          | channels: Map.put(st.channels, id, %{"names" => names, "icon" => icon}),
            ch: st.ch + 1
        }
      end
    end
  end

  defp handle_xmltv_block(:programme, block, st, _mc, mp) do
    if st.pg >= mp do
      %{st | truncated: true}
    else
      tag = opening_tag(block)
      id = extract_attr(tag, "channel")
      start = tag |> extract_attr("start") |> parse_xmltv_time()
      stop = tag |> extract_attr("stop") |> parse_xmltv_time()

      if id == nil or start == nil or stop == nil or stop <= start do
        %{st | skipped: st.skipped + 1}
      else
        case extract_inner(block, "title") do
          nil ->
            %{st | skipped: st.skipped + 1}

          title ->
            desc = extract_inner(block, "desc")

            entry =
              if desc != nil and utf16_length(desc) <= @desc_max,
                do: [start, stop, title, desc],
                else: [start, stop, title]

            %{
              st
              | programmes: Map.update(st.programmes, id, [entry], &(&1 ++ [entry])),
                pg: st.pg + 1
            }
        end
      end
    end
  end

  defp opening_tag(block) do
    case index_of(block, ">", 0) do
      {:ok, pos} -> binary_part(block, 0, pos + 1)
      :error -> ""
    end
  end

  defp icon_tag(block) do
    case Regex.run(~r/<icon\b[^>]*>/i, block) do
      [tag] -> tag
      _ -> ""
    end
  end

  # \b{name}\s*=\s*(?:"([^"]*)"|'([^']*)') — exactly one branch participates;
  # pick whichever capture is non-empty (both empty → "" → null, as in JS).
  defp extract_attr(tag, name) do
    re = Regex.compile!("\\b#{name}\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)')", "i")

    value =
      case Regex.run(re, tag, capture: :all_but_first) do
        nil -> nil
        captures -> Enum.find(captures, fn c -> is_binary(c) and c != "" end) || ""
      end

    case value do
      nil -> nil
      "" -> nil
      value -> value |> decode_entities() |> String.trim() |> non_empty_or_nil()
    end
  end

  defp extract_inner(block, tag) do
    close_tag = "</#{tag}>"

    with {:ok, open} <- index_of(block, "<#{tag}", 0),
         {:ok, gt} <- index_of(block, ">", open),
         {:ok, close} <- index_of(block, close_tag, gt) do
      inner = binary_part(block, gt + 1, close - gt - 1)

      inner
      |> String.replace(~r/\s+/, " ")
      |> String.trim()
      |> decode_entities()
      |> non_empty_or_nil()
    else
      :error -> nil
    end
  end

  defp extract_all_inner(block, tag) do
    close_tag = "</#{tag}>"
    do_extract_all_inner(block, tag, close_tag, 0, [])
  end

  defp do_extract_all_inner(block, tag, close_tag, from, out) do
    with {:ok, open} <- index_of(block, "<#{tag}", from),
         {:ok, gt} <- index_of(block, ">", open),
         {:ok, close} <- index_of(block, close_tag, gt) do
      value =
        block
        |> binary_part(gt + 1, close - gt - 1)
        |> String.replace(~r/\s+/, " ")
        |> String.trim()
        |> decode_entities()

      out = if value != "", do: [value | out], else: out
      # JS: from = close + tag.length + 3 (the "</>" wrapper)
      do_extract_all_inner(block, tag, close_tag, close + byte_size(close_tag), out)
    else
      :error -> Enum.reverse(out)
    end
  end

  # -- shared/xmltv.js: index + lookups -----------------------------------------

  def normalize_channel_key(value) do
    raw = value |> js_string() |> String.trim() |> String.downcase()

    case Regex.replace(~r/[^a-z0-9]+/, raw, "") do
      "" -> raw
      key -> key
    end
  end

  def create_epg_index(epg) do
    channels = map_field(epg, "channels")
    programmes = map_field(epg, "programmes")

    by_id =
      Enum.reduce(programmes, %{}, fn {id, arr}, acc ->
        if is_list(arr) and arr != [], do: Map.put(acc, id, arr), else: acc
      end)

    # JS iterates channels in insertion order and keeps the FIRST id per
    # normalized name; insertion order is unrecoverable from Jason maps, so
    # this port iterates in sorted key order (see moduledoc key-order note).
    by_name =
      channels
      |> Enum.sort_by(&elem(&1, 0))
      |> Enum.reduce(%{}, fn {id, ch}, acc ->
        names =
          case Map.get(ch, "names") do
            ns when is_list(ns) -> ns
            _ -> []
          end

        Enum.reduce(names, acc, fn name, acc2 ->
          key = normalize_channel_key(name)

          if key != "" and not Map.has_key?(acc2, key),
            do: Map.put(acc2, key, id),
            else: acc2
        end)
      end)

    %{"byId" => by_id, "byName" => by_name}
  end

  # The fixture's recorded index args are lossy empty Map shapes; rebuild the
  # real index from the same fixture-pinned sampleEpg() recorded in the
  # catalog/snapshot + catalog/epg-summary case args. A non-empty plain-map
  # index passes through untouched.
  defp epg_index_for_case(%{"byId" => %{}, "byName" => %{}}), do: create_epg_index(sample_epg())

  defp epg_index_for_case(%{"byId" => by_id, "byName" => by_name}),
    do: %{"byId" => by_id, "byName" => by_name}

  def resolve_epg_key(_index, key) when not is_binary(key) or key == "", do: nil

  def resolve_epg_key(index, key) do
    by_id = Map.get(index, "byId", %{})

    if Map.has_key?(by_id, key) do
      key
    else
      id = Map.get(Map.get(index, "byName", %{}), normalize_channel_key(key))
      if is_binary(id) and Map.has_key?(by_id, id), do: id, else: nil
    end
  end

  def now_next_for_id(index, id, at_ms) do
    case Map.get(Map.get(index, "byId", %{}), id) do
      arr when is_list(arr) and arr != [] -> now_next_search(arr, at_ms)
      _ -> nil
    end
  end

  # First programme whose stop > at_ms (binary search over sorted starts).
  defp now_next_search(arr, at_ms) do
    case first_ending_after(arr, at_ms, 0, length(arr) - 1, -1) do
      -1 ->
        %{"now" => nil, "next" => nil}

      found ->
        current = Enum.at(arr, found)

        if Enum.at(current, 0) > at_ms do
          %{"now" => nil, "next" => to_programme(current)}
        else
          next =
            case Enum.at(arr, found + 1) do
              nil -> nil
              upcoming -> to_programme(upcoming)
            end

          %{"now" => to_programme(current), "next" => next}
        end
    end
  end

  defp first_ending_after(arr, at_ms, lo, hi, found) when lo <= hi do
    mid = div(lo + hi, 2)

    if arr |> Enum.at(mid) |> Enum.at(1) > at_ms do
      first_ending_after(arr, at_ms, lo, mid - 1, mid)
    else
      first_ending_after(arr, at_ms, mid + 1, hi, found)
    end
  end

  defp first_ending_after(_arr, _at_ms, _lo, _hi, found), do: found

  defp to_programme(entry) do
    %{
      "start" => Enum.at(entry, 0),
      "stop" => Enum.at(entry, 1),
      "title" => Enum.at(entry, 2),
      "desc" => if(length(entry) > 3, do: Enum.at(entry, 3), else: nil)
    }
  end

  def lookup_now_next(index, keys, at_ms, max) when is_list(keys) do
    limit = if is_number(max) and max > 0, do: max, else: @epg_lookup_max
    do_lookup(index, keys, at_ms, limit, [])
  end

  def lookup_now_next(_index, _keys, _at_ms, _max), do: []

  defp do_lookup(_index, _keys, _at_ms, limit, out) when length(out) >= limit,
    do: Enum.reverse(out)

  defp do_lookup(_index, [], _at_ms, _limit, out), do: Enum.reverse(out)

  defp do_lookup(index, [key | rest], at_ms, limit, out) do
    id = resolve_epg_key(index, key)

    {now, next} =
      case id != nil and now_next_for_id(index, id, at_ms) do
        %{"now" => now, "next" => next} -> {now, next}
        _ -> {nil, nil}
      end

    row = %{
      "key" => if(is_binary(key), do: key, else: nil),
      "now" => now,
      "next" => next
    }

    do_lookup(index, rest, at_ms, limit, [row | out])
  end

  # -- fixture-pinned sample guide (scripts/parity/catalog.mjs sampleEpg) -------

  defp sample_epg do
    t0 = 1_700_000_000_000

    %{
      "name" => "Sample Guide",
      "updatedAt" => t0,
      "channels" => %{
        "alpha.tv" => %{"names" => ["Alpha", "Alpha HD"], "icon" => "http://a.example/1.png"},
        "gamma.tv" => %{"names" => ["Gamma"], "icon" => nil},
        "delta.tv" => %{"names" => ["Delta"], "icon" => nil}
      },
      "programmes" => %{
        "alpha.tv" => [
          [t0 - 3_600_000, t0 + 1_800_000, "Morning News"],
          [t0 + 1_800_000, t0 + 3_600_000, "Noon Bulletin", "with guests"]
        ],
        "gamma.tv" => [[t0 + 10_000, t0 + 20_000, "Late Slot"]],
        "delta.tv" => [[t0 - 10_000, t0 - 5_000, "Ended Show"]]
      }
    }
  end

  # -- JS-compat helpers ---------------------------------------------------------

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
    # JS Number(nowMs).toString(36) is lowercase; Elixir Integer.to_string/2
    # emits uppercase for bases > 10 — downcase to honor the
    # ^iptv_[0-9a-z]+_[0-9a-z]+$ generated-id format.
    tail = now_ms |> number_or(0) |> trunc() |> Integer.to_string(36) |> String.downcase()
    "iptv_#{tail}_x"
  end

  # toLocaleDateString fallback — locale-dependent in JS and never triggered by
  # the fixtures (names are always provided); the port pins a deterministic
  # UTC ISO date.
  defp imported_date(now_ms) do
    case DateTime.from_unix(number_or(now_ms, 0), :millisecond) do
      {:ok, dt} -> Calendar.strftime(dt, "%Y-%m-%d")
      _ -> "1970-01-01"
    end
  end

  # JS `Number(x) || fallback` — 0/NaN take the fallback.
  defp number_or(value, fallback) do
    case Hazards.js_to_number(if(value == nil, do: :absent, else: value)) do
      n when is_number(n) and n != 0 -> n
      _ -> fallback
    end
  end

  # JS `Number.isFinite(Number(x)) ? Number(x) : fallback` (null → 0, per JS).
  defp finite_number_or(value, fallback) do
    case Hazards.js_to_number(value) do
      n when is_number(n) -> n
      _ -> fallback
    end
  end

  defp js_string(nil), do: ""
  defp js_string(value) when is_binary(value), do: value
  defp js_string(value) when is_integer(value), do: Integer.to_string(value)
  defp js_string(value) when is_float(value), do: Float.to_string(value)
  defp js_string(true), do: "true"
  defp js_string(false), do: "false"
  defp js_string(value), do: to_string(value)

  defp truthy(nil), do: false
  defp truthy(false), do: false
  defp truthy(""), do: false
  defp truthy(0), do: false
  # JS -0 and +0 are both falsy.
  defp truthy(+0.0), do: false
  defp truthy(-0.0), do: false
  defp truthy(_), do: true

  defp non_empty_or_nil(""), do: nil
  defp non_empty_or_nil(value), do: value

  defp utf16_slice(value, max), do: Hazards.utf16_truncate(value, max)

  defp utf16_length(value) when is_binary(value) do
    div(byte_size(:unicode.characters_to_binary(value, :utf8, {:utf16, :big})), 2)
  end

  defp index_of(subject, pattern, from) when from <= byte_size(subject) do
    case :binary.match(subject, pattern, scope: {from, byte_size(subject) - from}) do
      {pos, _len} -> {:ok, pos}
      :nomatch -> :error
    end
  end

  defp index_of(_subject, _pattern, _from), do: :error

  defp prefix_at?(text, prefix, pos) do
    len = byte_size(prefix)
    pos + len <= byte_size(text) and binary_part(text, pos, len) == prefix
  end
end
