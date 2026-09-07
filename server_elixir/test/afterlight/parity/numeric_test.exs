defmodule Afterlight.Parity.NumericTest do
  use ExUnit.Case, async: true

  alias Afterlight.Parity.Numeric

  describe "js_round/1" do
    test "half toward +Infinity on negative fractions (parity-notes #1)" do
      assert Numeric.js_round(-2.7) == -3.0
      assert Numeric.js_round(-2.5) == -2.0
      assert Numeric.js_round(-0.5) == 0.0
    end

    test "matches JS Math.round on positive inputs" do
      assert Numeric.js_round(2.5) == 3.0
      assert Numeric.js_round(2.4) == 2.0
      assert Numeric.js_round(7) == 7
    end
  end

  describe "js_to_fixed_3/1" do
    test "reproduces Number(x.toFixed(3)) chains from market fixtures" do
      assert Numeric.js_to_fixed_3(1.0) == 1.0
      assert Numeric.js_to_fixed_3(0.4) == 0.4
      assert Numeric.js_to_fixed_3(2.5) == 2.5

      # mean-reversion chain seed: 1.0 + 0.2*0.03 = 1.006 → toFixed(3) → 1.006
      step1 = 1.0 + 0.2 * 0.03
      assert Numeric.js_to_fixed_3(step1) == 1.006

      # clamp + toFixed edge: 2.499999999 rounds to 2.5 at 3dp
      assert Numeric.js_to_fixed_3(2.499_999_999) == 2.5
    end

    test "handles negative multipliers" do
      assert Numeric.js_to_fixed_3(-0.1234) == -0.123
    end
  end

  describe "coerce_integer/1 and guard_order_params/2" do
    test "accepts nonnegative integers within magnitude bounds" do
      assert Numeric.coerce_integer(42) == {:ok, 42}
      assert Numeric.coerce_integer(1_000_000_000.0) == {:ok, 1_000_000_000}
    end

    test "rejects out-of-range and non-integer values" do
      assert Numeric.coerce_integer(-1) == {:error, :out_of_range}
      assert Numeric.coerce_integer(1.5) == {:error, :invalid_integer}
      assert Numeric.coerce_integer("12") == {:error, :invalid_integer}
    end

    test "guard_order_params validates price*quantity overflow guard" do
      assert Numeric.guard_order_params(100, 50) == {:ok, {100, 50}}
      assert Numeric.guard_order_params(0, 10) == {:error, :invalid_order_params}
      assert Numeric.guard_order_params(1_000_000_000, 1_000_000_000) == {:error, :invalid_order_params}
    end
  end
end
