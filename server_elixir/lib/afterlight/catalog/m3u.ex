defmodule Afterlight.Catalog.M3U do
  @moduledoc """
  Pure M3U parser, serializer, and channel sanitizer for IPTV playlists.

  Ported 1:1 from shared/iptvModel.js and shared/theaterModel.js.
  """

  @channels_max 20_000
  @channel_name_max 200
  @group_max 120
  @title_max 120

  @http_re ~r{^https?://}i

  def channels_max, do: @channels_max
  def channel_name_max, do: @channel_name_max
  def group_max, do: @group_max

  # -- sanitizeChannels --------------------------------------------------------

  def sanitize_channels(raw, max \\ @channels_max)

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

  # -- serializeM3U ------------------------------------------------------------

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

  # -- parseM3U ----------------------------------------------------------------

  def parse_m3u(text, _opts \\ [])

  def parse_m3u(text, _opts) when not is_binary(text),
    do: %{"entries" => [], "skipped" => 0, "recognized" => false}

  def parse_m3u(text, _opts) do
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

        %{st | entries: [entry | st.entries], idx: idx, pending: nil, recognized: true}
    end
  end

  defp parse_ext_inf(line) do
    body =
      case String.split(line, ":", parts: 2) do
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

  defp quoted_attr(attrs_part, name) do
    case Regex.run(Regex.compile!("#{name}=\"([^\"]*)\"", "i"), attrs_part) do
      [_, value] -> if String.trim(value) == "", do: nil, else: String.trim(value)
      _ -> nil
    end
  end

  defp clean_text(value) when is_binary(value),
    do: value |> String.replace(~r/\s+/, " ") |> String.trim() |> utf16_slice(@title_max)

  # -- private helpers ---------------------------------------------------------

  def utf16_slice(value, max) when is_binary(value) do
    utf16 = :unicode.characters_to_binary(value, :utf8, {:utf16, :big})
    units = div(byte_size(utf16), 2) |> min(max)
    truncated = binary_part(utf16, 0, units * 2)
    :unicode.characters_to_binary(truncated, {:utf16, :big}, :utf8)
  end

  def utf16_slice(_value, _max), do: ""

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
  defp truthy(+0.0), do: false
  defp truthy(-0.0), do: false
  defp truthy(_), do: true
end
