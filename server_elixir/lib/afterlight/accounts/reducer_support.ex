defmodule Afterlight.Accounts.ReducerSupport do
  @moduledoc """
  JS-exact nickname sanitize/dedup port of `shared/identity.js`.

  Production code (P4). Injectable RNG so fallback paths are fixture-pinned.
  Truncation is UTF-16 code units (JS `String.prototype.slice`), not graphemes.
  Post-sanitize nicknames are ASCII `[\\w\\s-]`, so SQL `lower()` and JS
  `toLowerCase()` cannot disagree.
  """

  @adjectives ~w(
    Quiet Copper Rainy Amber Misty Rust Golden Silver
    Cobble Breezy Dusky Dappled Gilded Pebble Gleaming Iron
    Slate Cinder Ember Tidal Steady Bright Hollow Autumnal
  )

  @machine_nouns ~w(
    Lantern Kestrel Compass Signal Beacon Relay Foundry Quarry
    Anvil Cog Piston Whistle Prism Sparrow Tram Bellows
    Lattice Sprocket Gantry Conduit
  )

  @doc "JS `Math.random` stand-in: a float in `(0, 1]`."
  def default_rng, do: :rand.uniform()

  def generate_default_nickname(seed) when is_number(seed) do
    adj_idx = trunc(abs(:math.sin(seed * 999)) * length(@adjectives))
    noun_idx = trunc(abs(:math.cos(seed * 888)) * length(@machine_nouns))
    num = trunc(abs(:math.sin(seed * 777)) * 90) + 10

    # JS indexes past the array end render as "undefined" in the template
    # literal (seed 0: Math.cos(0) * 20 === 20).
    adj = Enum.at(@adjectives, adj_idx) || "undefined"
    noun = Enum.at(@machine_nouns, noun_idx) || "undefined"

    "#{adj}#{noun}#{num}"
  end

  def generate_default_nickname(_seed), do: generate_default_nickname(default_rng())

  def sanitize_nickname(input, rng \\ &default_rng/0)

  def sanitize_nickname(input, rng) when is_binary(input) do
    units =
      input
      |> :unicode.characters_to_binary(:utf8, {:utf16, :big})
      |> utf16_units()
      |> strip_tags()
      |> Enum.reject(&js_control_unit?/1)
      |> js_trim()

    clean =
      units
      |> Enum.reject(&js_non_word_unit?/1)
      |> collapse_spaces()

    clean =
      if length(clean) > 20 do
        clean |> Enum.take(20) |> js_trim()
      else
        clean
      end

    if length(clean) < 3 do
      generate_default_nickname(rng.())
    else
      from_utf16_units(clean)
    end
  end

  def sanitize_nickname(_input, rng), do: generate_default_nickname(rng.())

  @doc """
  `resolveDuplicateNickname`: free sanitized base, then `base2`..`base99`,
  then one random 3-digit suffix. `active` is the live-nickname set
  (list, MapSet, or JSON object of names). Historical names must not be
  included — matching JS, which only receives active nicknames.
  """
  def resolve_duplicate_nickname(desired, active, rng \\ &default_rng/0) do
    base = sanitize_nickname(desired, rng)
    claimed = claimed_set(active)

    cond do
      not MapSet.member?(claimed, String.downcase(base)) ->
        base

      true ->
        case Enum.find(2..99, &(not MapSet.member?(claimed, String.downcase("#{base}#{&1}")))) do
          nil ->
            suffix = trunc(:math.floor(rng.() * 900 + 100))
            "#{base}#{suffix}"

          i ->
            "#{base}#{i}"
        end
    end
  end

  def ascii_only?(name) when is_binary(name) do
    Regex.match?(~r/^[\w\s-]*$/, name)
  end

  def ascii_only?(_), do: false

  defp claimed_set(active) when is_list(active) do
    MapSet.new(active, fn
      name when is_binary(name) -> String.downcase(name)
      other -> other |> to_string() |> String.downcase()
    end)
  end

  defp claimed_set(%MapSet{} = set) do
    claimed_set(MapSet.to_list(set))
  end

  defp claimed_set(active) when is_map(active) do
    claimed_set(Map.keys(active))
  end

  defp claimed_set(_), do: MapSet.new()

  defp utf16_units(bin, acc \\ [])
  defp utf16_units(<<u::16, rest::binary>>, acc), do: utf16_units(rest, [u | acc])
  defp utf16_units(<<>>, acc), do: Enum.reverse(acc)

  defp from_utf16_units(units) do
    bin = :erlang.list_to_binary(Enum.map(units, fn u -> <<u::16>> end))
    :unicode.characters_to_binary(bin, {:utf16, :big}, :utf8)
  end

  defp strip_tags([?< | rest]), do: strip_tags(skip_to_close(rest))
  defp strip_tags([u | rest]), do: [u | strip_tags(rest)]
  defp strip_tags([]), do: []

  defp skip_to_close([?> | rest]), do: rest
  defp skip_to_close([_u | rest]), do: skip_to_close(rest)
  defp skip_to_close([]), do: []

  defp js_control_unit?(u), do: u in 0x00..0x1F or u in 0x7F..0x9F

  defp js_non_word_unit?(u) do
    word? = u in ?A..?Z or u in ?a..?z or u in ?0..?9 or u == ?_
    not (word? or js_ws_unit?(u) or u == ?-)
  end

  defp js_ws_unit?(u),
    do:
      u in [0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x20, 0xA0, 0x1680, 0x2028, 0x2029, 0x202F, 0x205F, 0x3000, 0xFEFF] or
        u in 0x2000..0x200A

  defp js_trim(units) do
    units
    |> Enum.drop_while(&js_ws_unit?/1)
    |> Enum.reverse()
    |> Enum.drop_while(&js_ws_unit?/1)
    |> Enum.reverse()
  end

  defp collapse_spaces(units) do
    Enum.reduce(units, {[], false}, fn u, {acc, in_ws} ->
      cond do
        js_ws_unit?(u) and in_ws -> {acc, true}
        js_ws_unit?(u) -> {[0x20 | acc], true}
        true -> {[u | acc], false}
      end
    end)
    |> elem(0)
    |> Enum.reverse()
  end
end
