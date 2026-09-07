defmodule Afterlight.Accounts.ReducerSupport do
  @moduledoc """
  Pure nickname sanitization and deduplication ladder ported from `shared/identity.js`.
  Provides byte-exact parity with the JavaScript implementation.
  """

  @adjectives ~w(
    Mossy Quiet Copper Rainy Amber Misty Rust Golden
    Silver Fern Bramble Cobble Thistle Breezy Dusky Dappled
    Dewy Hedge Orchard Verdant Gilded Pebble Autumnal Gleaming
  )

  @produce_nouns ~w(
    Radish Turnip Basil Leek Carrot Kale Tomato Berry
    Sorrel Chive Sprout Fennel Parsnip Pepper Clover Borage
    Sage Mint Beet Chard
  )

  @doc """
  Generates an atmospheric default nickname from an optional seed or RNG.
  Reproduces JS `generateDefaultNickname(seed = Math.random())`.
  """
  def generate_default_nickname(seed_or_rng \\ nil) do
    seed = eval_rng(seed_or_rng)

    adj_idx = trunc(abs(:math.sin(seed * 999)) * length(@adjectives))
    noun_idx = trunc(abs(:math.cos(seed * 888)) * length(@produce_nouns))
    num = trunc(abs(:math.sin(seed * 777)) * 90) + 10

    # JS array index out of bounds renders as "undefined" in template literal
    # (e.g. seed 0: Math.cos(0) * 20 === 20 -> "Mossyundefined10").
    adj = Enum.at(@adjectives, adj_idx) || "undefined"
    noun = Enum.at(@produce_nouns, noun_idx) || "undefined"

    "#{adj}#{noun}#{num}"
  end

  @doc """
  Sanitizes input with semantics identical to `shared/identity.js`:
  - strips HTML tags <[^>]*> and control characters [\\x00-\\x1F\\x7F-\\x9F]
  - strips non-word characters except dashes and underscores [^\\w\\s-]
  - collapses whitespace sequences to single space
  - truncates to 20 UTF-16 code units (not graphemes) with trailing whitespace trim
  - falls back to generate_default_nickname when length < 3 UTF-16 units
  """
  def sanitize_nickname(input, rng_or_seed \\ nil)

  def sanitize_nickname(input, rng_or_seed) when is_binary(input) do
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
      generate_default_nickname(rng_or_seed)
    else
      :unicode.characters_to_binary(clean, {:utf16, :big}, :utf8)
    end
  end

  def sanitize_nickname(_input, rng_or_seed), do: generate_default_nickname(rng_or_seed)

  @doc """
  Resolves duplicate nicknames against active players with semantics identical to
  `shared/identity.js resolveDuplicateNickname`:
  - tries the sanitized base if free in active_nicknames (case-insensitively)
  - descends the ladder `<base>2` .. `<base>99` in order
  - on exhausted ladder, appends a random 3-digit number (100..999) using the injectable RNG
  """
  def resolve_duplicate_nickname(desired, active_nicknames \\ [], rng_or_seed \\ nil) do
    base = sanitize_nickname(desired, rng_or_seed)
    lower_base = String.downcase(base)

    active_set = to_active_set(active_nicknames)

    if not MapSet.member?(active_set, lower_base) do
      base
    else
      ladder =
        Enum.find(2..99, fn i ->
          candidate = "#{base}#{i}"
          not MapSet.member?(active_set, String.downcase(candidate))
        end)

      case ladder do
        nil ->
          rand_val = eval_rng(rng_or_seed)
          suffix = trunc(rand_val * 900) + 100
          "#{base}#{suffix}"

        i ->
          "#{base}#{i}"
      end
    end
  end

  # -- Internal helpers --------------------------------------------------------

  defp to_active_set(nil), do: MapSet.new()
  defp to_active_set(%MapSet{} = set), do: set

  defp to_active_set(map) when is_map(map) do
    map
    |> Map.keys()
    |> Enum.map(&to_string/1)
    |> Enum.map(&String.downcase/1)
    |> MapSet.new()
  end

  defp to_active_set(list) when is_list(list) do
    list
    |> Enum.map(&to_string/1)
    |> Enum.map(&String.downcase/1)
    |> MapSet.new()
  end

  defp utf16_units(bin, acc \\ [])
  defp utf16_units(<<u::16, rest::binary>>, acc), do: utf16_units(rest, [u | acc])
  defp utf16_units(<<>>, acc), do: Enum.reverse(acc)

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

  defp eval_rng(nil) do
    case Process.get(:parity_case_seed) do
      seed when is_number(seed) -> seed * 1.0
      _ -> :rand.uniform()
    end
  end

  defp eval_rng(seed) when is_number(seed), do: seed * 1.0
  defp eval_rng(fun) when is_function(fun, 0), do: fun.() * 1.0
end
