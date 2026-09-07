defmodule Afterlight.Catalog.XMLTV do
  @moduledoc """
  XMLTV parser, entity decoder, and program guide indexer for Afterlight.

  Ported 1:1 from shared/xmltv.js.
  """

  @epg_name_max 120
  @epg_channels_max 50_000
  @epg_programmes_max 250_000
  @epg_lookup_max 300
  @desc_max 200

  @xmltv_time_re ~r/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(?:\d{2})?(?:\s*([+-])(\d{2}):?(\d{2}))?/
  @hex_entity_re ~r/&#x([0-9a-f]+);/i
  @dec_entity_re ~r/&#([0-9]+);/

  def epg_name_max, do: @epg_name_max
  def epg_lookup_max, do: @epg_lookup_max
  def epg_channels_max, do: @epg_channels_max
  def epg_programmes_max, do: @epg_programmes_max

  # -- parseXmltvTime ----------------------------------------------------------

  def parse_xmltv_time(value) when is_binary(value) do
    case Regex.run(@xmltv_time_re, String.trim(value)) do
      [_, y, mo, d, h, mi] -> date_utc_ms(y, mo, d, h, mi, nil, nil, nil)
      [_, y, mo, d, h, mi, sign, oh, om] -> date_utc_ms(y, mo, d, h, mi, sign, oh, om)
      _ -> nil
    end
  end

  def parse_xmltv_time(_value), do: nil

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

  # -- decodeEntities ----------------------------------------------------------

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

  # -- parseXmltv --------------------------------------------------------------

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
      do_extract_all_inner(block, tag, close_tag, close + byte_size(close_tag), out)
    else
      :error -> Enum.reverse(out)
    end
  end

  # -- index + lookups ---------------------------------------------------------

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

  def lookup_now_next(index, keys, at_ms, max \\ @epg_lookup_max)

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

  # -- private helpers ---------------------------------------------------------

  defp map_field(arg, key) when is_map(arg) do
    case Map.get(arg, key) do
      v when is_map(v) -> v
      _ -> %{}
    end
  end

  defp map_field(_, _), do: %{}

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

  defp js_string(nil), do: ""
  defp js_string(value) when is_binary(value), do: value
  defp js_string(value) when is_integer(value), do: Integer.to_string(value)
  defp js_string(value) when is_float(value), do: Float.to_string(value)
  defp js_string(true), do: "true"
  defp js_string(false), do: "false"
  defp js_string(value), do: to_string(value)

  defp non_empty_or_nil(""), do: nil
  defp non_empty_or_nil(value), do: value
end
