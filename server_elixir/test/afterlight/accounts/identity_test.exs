defmodule Afterlight.Accounts.IdentityTest do
  use ExUnit.Case, async: true

  alias Afterlight.Accounts.ReducerSupport

  test "sanitize fallback paths with pinned rng" do
    rng = fn -> 0.42 end
    assert ReducerSupport.sanitize_nickname("", rng) == ReducerSupport.generate_default_nickname(0.42)
    assert ReducerSupport.sanitize_nickname("a", rng) == ReducerSupport.generate_default_nickname(0.42)
    assert ReducerSupport.sanitize_nickname(nil, rng) == ReducerSupport.generate_default_nickname(0.42)
  end

  test "post-sanitize nicknames are ASCII so SQL lower() and JS toLowerCase agree" do
    for input <- ["Bright🌟Lantern!!! Café", "<b>Bold</b>name", "control\u0001char", "idemi_"] do
      out = ReducerSupport.sanitize_nickname(input, fn -> 0.1 end)
      assert ReducerSupport.ascii_only?(out), inspect(out)
      assert String.downcase(out) == String.downcase(out, :ascii)
    end
  end

  test "dedup ladder ordering: free base, then 2..99, then random suffix" do
    rng = fn -> 0.5 end
    assert ReducerSupport.resolve_duplicate_nickname("wren", ["other"], rng) == "wren"
    assert ReducerSupport.resolve_duplicate_nickname("wren", ["wren"], rng) == "wren2"
    assert ReducerSupport.resolve_duplicate_nickname("wren", ["wren", "wren2"], rng) == "wren3"

    taken = ["wren" | Enum.map(2..99, &"wren#{&1}")]
    assert ReducerSupport.resolve_duplicate_nickname("wren", taken, rng) == "wren550"
  end

  test "historical names are ignored when omitted from the active set" do
    assert ReducerSupport.resolve_duplicate_nickname("MistyCompass94", ["liveOther"]) == "MistyCompass94"
  end
end
