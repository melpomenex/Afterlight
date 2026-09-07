defmodule Afterlight.Accounts.ReducerSupportTest do
  use ExUnit.Case, async: true

  alias Afterlight.Accounts.ReducerSupport

  describe "sanitize_nickname/2" do
    test "strips HTML tags and control characters" do
      assert ReducerSupport.sanitize_nickname("<b>Bold</b>Name") == "BoldName"
      assert ReducerSupport.sanitize_nickname("control\x01\x1F\x7F\u009Fchar") == "controlchar"
    end

    test "strips characters outside [\\w\\s-] and collapses whitespace" do
      assert ReducerSupport.sanitize_nickname("hello!@#$%^&*()_+") == "hello_"
      assert ReducerSupport.sanitize_nickname("  spaced   name  ") == "spaced name"
      assert ReducerSupport.sanitize_nickname("\t\n  lots   of   spaces  \r\n") == "lots of spaces"
    end

    test "truncates to 20 UTF-16 units with trailing trim" do
      long = String.duplicate("AB", 12)
      assert String.length(long) == 24
      truncated = ReducerSupport.sanitize_nickname(long)
      assert truncated == "ABABABABABABABABABAB"
      assert String.length(truncated) == 20

      # Trailing space trimmed after 20-unit slice
      with_space = "Atmospheric Garden   "
      assert ReducerSupport.sanitize_nickname(with_space) == "Atmospheric Garden"
    end

    test "falls back to generated nickname when length < 3" do
      # Injected seed produces deterministic default nickname
      rng = fn -> 0.5 end
      result = ReducerSupport.sanitize_nickname("", rng)
      assert result == "MossySprout88"

      result_short = ReducerSupport.sanitize_nickname("ab", fn -> 0.1 end)
      assert result_short == "DuskyPepper77"

      # Non-string input
      assert ReducerSupport.sanitize_nickname(nil, rng) == "MossySprout88"
      assert ReducerSupport.sanitize_nickname(123, rng) == "MossySprout88"
    end

    test "post-sanitize nicknames are strictly ASCII-only (lower() vs toLowerCase() divergence guarantee)" do
      unicode_samples = [
        "MÖSSY", "İpek", "straße", "éclat", "Ωmega", "𝔘𝔫𝔦𝔠𝔬𝔡𝔢",
        "Ångström", "São Paulo", "Zürich", "Crème Brûlée",
        "🌟Radish", "🌿Basil", "🍄Mushroom"
      ]

      for sample <- unicode_samples do
        sanitized = ReducerSupport.sanitize_nickname(sample, fn -> 0.5 end)
        # Every byte must be <= 127 (strict ASCII)
        assert for(<<c <- sanitized>>, do: c <= 127) |> Enum.all?(),
               "Expected #{inspect(sanitized)} from #{inspect(sample)} to be ASCII-only"

        # Under ASCII, SQL lower() and JS toLowerCase() cannot disagree
        assert String.downcase(sanitized) ==
                 sanitized
                 |> :unicode.characters_to_binary(:utf8, {:utf16, :big})
                 |> :unicode.characters_to_binary({:utf16, :big}, :utf8)
                 |> String.downcase(:ascii)
      end
    end
  end

  describe "resolve_duplicate_nickname/3" do
    test "returns free base when not active" do
      assert ReducerSupport.resolve_duplicate_nickname("wren", ["other"]) == "wren"
      assert ReducerSupport.resolve_duplicate_nickname("wren", []) == "wren"
      assert ReducerSupport.resolve_duplicate_nickname("wren", nil) == "wren"
    end

    test "descends ladder 2..99 in order on active collision" do
      assert ReducerSupport.resolve_duplicate_nickname("wren", ["wren"]) == "wren2"
      assert ReducerSupport.resolve_duplicate_nickname("wren", ["wren", "wren2"]) == "wren3"
      assert ReducerSupport.resolve_duplicate_nickname("wren", ["wren", "wren2", "wren3"]) == "wren4"
    end

    test "handles case-insensitive collision" do
      assert ReducerSupport.resolve_duplicate_nickname("Wren", ["wren"]) == "Wren2"
      assert ReducerSupport.resolve_duplicate_nickname("wren", ["Wren", "WREN2"]) == "wren3"
    end

    test "active-vs-historical sets: only active nicknames collide" do
      # Inactive historical player named 'wren' is not in active set
      historical_inactive = ["copper", "mossy"]
      assert ReducerSupport.resolve_duplicate_nickname("wren", historical_inactive) == "wren"
    end

    test "exhausted ladder uses injected RNG for 3-digit suffix" do
      full_ladder = ["wren" | Enum.map(2..99, &"wren#{&1}")]
      # 0.5 * 900 + 100 = 550
      assert ReducerSupport.resolve_duplicate_nickname("wren", full_ladder, fn -> 0.5 end) == "wren550"

      # Callable RNG injection
      assert ReducerSupport.resolve_duplicate_nickname("wren", full_ladder, fn -> 0.1 end) == "wren190"
    end
  end
end
