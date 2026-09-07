defmodule Afterlight.Protocol.PayloadEncoder do
  @moduledoc """
  JSON encoder matching JS `JSON.stringify` wire rules for P6 payloads.

  * integral floats render without a decimal point (`1.0` → `1`)
  * non-integral floats use shortest round-trip representation (via Jason)
  * `nil` encodes as JSON `null`
  * map field order follows explicit insertion order via `[{key, value}, ...]`
    or `encode_ordered_map/1`
  """

  @doc "Encode any JSON-compatible value to a UTF-8 string."
  def encode(value), do: encode_value(value)

  @doc "Encode a map preserving the given key insertion order."
  def encode_ordered_map(entries) when is_list(entries) do
    "{" <> Enum.map_join(entries, ",", fn {k, v} -> encode_string(k) <> ":" <> encode_value(v) end) <> "}"
  end

  defp encode_value(nil), do: "null"
  defp encode_value(true), do: "true"
  defp encode_value(false), do: "false"
  defp encode_value(value) when is_integer(value), do: Integer.to_string(value)

  defp encode_value(value) when is_float(value) do
    if value == trunc(value) * 1.0 do
      Integer.to_string(trunc(value))
    else
      Jason.encode!(value)
    end
  end

  defp encode_value(value) when is_binary(value), do: Jason.encode!(value)

  defp encode_value(value) when is_list(value) do
    "[" <> Enum.map_join(value, ",", &encode_value/1) <> "]"
  end

  defp encode_value(%{} = map) do
    entries = Enum.map(map, fn {k, v} -> {to_string(k), v} end)
    encode_ordered_map(entries)
  end

  defp encode_string(key) when is_binary(key), do: Jason.encode!(key)
  defp encode_string(key) when is_atom(key), do: Jason.encode!(Atom.to_string(key))
end
