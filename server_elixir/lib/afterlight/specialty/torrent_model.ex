defmodule Afterlight.Specialty.TorrentModel do
  @moduledoc """
  Production torrent rule port (`shared/torrentModel.js`).

  Semantics pinned by `tests/fixtures/parity/torrent-model.json`.
  """

  @url_max 2048
  @hex_re ~r/^[0-9a-fA-F]{40}$/
  @base32_re ~r/^[A-Z2-7]{32}$/
  @base32_alphabet "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

  def parse_magnet(raw) when not is_binary(raw), do: nil

  def parse_magnet(raw) do
    url = String.trim(raw)

    if url == "" or String.length(url) > @url_max or not lower_starts_with?(url, "magnet:?") do
      nil
    else
      case parse_whatwg(url) do
        {:ok, query} -> find_btih(query, url)
        :error -> nil
      end
    end
  end

  defp lower_starts_with?(url, prefix), do: String.starts_with?(String.downcase(url), prefix)

  defp parse_whatwg(url) do
    with true <- String.contains?(url, "?"),
         query = url |> String.split("?", parts: 2) |> List.last(),
         params = decode_query(query) do
      {:ok, params}
    else
      _ -> {:ok, []}
    end
  end

  defp decode_query(query) when is_binary(query) do
    query
    |> String.split("&", trim: false)
    |> Enum.reject(&(&1 == ""))
    |> Enum.map(fn pair ->
      case String.split(pair, "=", parts: 2) do
        [k] -> {whatwg_decode(k), ""}
        [k, v] -> {whatwg_decode(k), whatwg_decode(v)}
      end
    end)
  end

  defp decode_query(_), do: []

  defp whatwg_decode(value) do
    value
    |> String.replace("+", " ")
    |> (fn v ->
          case URI.decode(v) do
            decoded when is_binary(decoded) -> decoded
            _ -> v
          end
        end).()
  rescue
    _ -> value
  end

  defp find_btih(params, url) do
    params
    |> Enum.filter(fn {k, _v} -> k == "xt" end)
    |> Enum.map(fn {_k, v} -> v end)
    |> Enum.find_value(fn xt ->
      case extract_btih(xt) do
        nil -> nil
        raw -> normalize_infohash(raw, url)
      end
    end)
  end

  defp extract_btih(xt) do
    case Regex.run(~r/^urn:btih:(.+)$/i, xt) do
      [_, raw] -> raw
      _ -> nil
    end
  end

  defp normalize_infohash(raw, url) do
    cond do
      Regex.match?(@hex_re, raw) ->
        %{"url" => url, "infohash" => String.downcase(raw)}

      Regex.match?(@base32_re, raw) ->
        %{"url" => url, "infohash" => base32_to_hex(String.upcase(raw))}

      true ->
        nil
    end
  end

  defp base32_to_hex(raw) do
    alphabet_chars = String.graphemes(@base32_alphabet)

    {_bits, _value, out} =
      raw
      |> String.graphemes()
      |> Enum.reduce({0, 0, ""}, fn ch, {bits, value, out} ->
        idx = Enum.find_index(alphabet_chars, &(&1 == ch))
        value = Bitwise.bsl(value, 5) + idx
        bits = bits + 5

        if bits >= 8 do
          byte = Bitwise.band(Bitwise.bsr(value, bits - 8), 0xFF)
          hex_digit = fn n -> String.at("0123456789abcdef", n) end
          out = out <> hex_digit.(Bitwise.band(Bitwise.bsr(byte, 4), 0xF)) <> hex_digit.(Bitwise.band(byte, 0xF))
          {bits - 8, value, out}
        else
          {bits, value, out}
        end
      end)

    out
  end
end
