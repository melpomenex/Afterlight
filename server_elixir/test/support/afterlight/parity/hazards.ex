defmodule Afterlight.Parity.Hazards do
  @moduledoc """
  Per-reference-module hazard helpers: which generated-id format a module's
  fixtures use (for `<gen:N>` token binding) and the shared JS-compatibility
  numeric/string primitives the ports build on.

  These exist ONLY inside the parity harness. Production domain code ports
  these semantics itself (see docs/architecture/elixir/parity-notes.md).
  """

  @formats %{
    Afterlight.Parity.Reference.Theater => ~r/^itm_[0-9a-z]+_[0-9a-z]+$/,
    Afterlight.Parity.Reference.Catalog => ~r/^iptv_[0-9a-z]+_[0-9a-z]+$/,
    Afterlight.Parity.Reference.Market => ~r/^trade_[0-9a-z]+_[0-9a-z]+$/,
    Afterlight.Parity.Reference.Garden => nil,
    Afterlight.Parity.Reference.Torrent => nil,
    Afterlight.Parity.Reference.Misc => nil
  }

  @doc "Does `value` look like a real generated id for `module`?"
  def generated_id?(module, value) when is_binary(value) do
    case Map.fetch(@formats, module) do
      {:ok, %Regex{} = re} -> Regex.match?(re, value)
      _ -> false
    end
  end

  def generated_id?(_module, _value), do: false

  @doc """
  Deterministic placeholder for a token referenced before its id is bound.
  Distinct per token so input ids never collide.
  """
  def placeholder_for(token), do: :erlang.atom_to_binary(:parity_placeholder) <> ":" <> token <> ":"

  # -- JS-compatibility primitives -------------------------------------------

  @doc """
  JS Math.round: half toward +Infinity (Elixir round/2 is half-even,
  trunc(round(x)) is half away from zero).
  """
  def js_round(x) when is_float(x) or is_integer(x) do
    trunc(x + 0.5)
  end

  @doc """
  JS Number(x) coercion subset relevant to fixtures: numbers pass through,
  numeric binaries parse, empty/whitespace binaries parse as 0, "0x10" is 16,
  other binaries are :nan (JS NaN; JSON cannot carry NaN so fixtures only
  exercise these paths via error outcomes).
  """
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
        # JS Number("12") === 12 (integer), Number("12.5") === 12.5
        if f == trunc(f) and not (trimmed =~ "." or trimmed =~ "e" or trimmed =~ "E") do
          trunc(f)
        else
          f
        end

      _ ->
        :nan
    end
  end

  @doc "UTF-16 code-unit truncation (JS String.prototype.slice(0, max) semantics)."
  def utf16_truncate(value, max) when is_binary(value) do
    utf16 = :unicode.characters_to_binary(value, :utf8, {:utf16, :big})
    units = div(byte_size(utf16), 2) |> min(max)
    truncated = binary_part(utf16, 0, units * 2)
    :unicode.characters_to_binary(truncated, {:utf16, :big}, :utf8)
  end

  @doc "JS `hash * 31 + code >>> 0` — 32-bit wraparound mask per step."
  def js_hash31(value, acc \\ 0)
  def js_hash31(<<code::utf16, rest::binary>>, acc) do
    js_hash31(rest, Bitwise.band(acc * 31 + code, 0xFFFFFFFF))
  end
  def js_hash31(_, acc), do: acc
end
