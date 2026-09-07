defmodule ParityHazardsTest do
  @moduledoc """
  Focused unit tests for the shared JS-compatibility primitives in
  `Afterlight.Parity.Hazards` (P0 task 5.2). The fixture corpus only
  exercises positive inputs, so the negative-fractional `js_round/1`
  semantics are pinned here directly.
  """

  use ExUnit.Case, async: true

  alias Afterlight.Parity.Hazards

  # JS Math.round(-2.7) === -3: trunc(x + 0.5) would give -2 (half away from
  # zero is wrong on the negative side); floor(x + 0.5) is the contract.
  test "js_round floors x + 0.5 (half toward +Infinity) on negative fractions" do
    assert Hazards.js_round(-2.7) == -3.0
    assert Hazards.js_round(-2.5) == -2.0
    assert Hazards.js_round(-0.5) == 0.0
  end

  test "js_round matches JS Math.round on positive inputs" do
    assert Hazards.js_round(2.5) == 3.0
    assert Hazards.js_round(2.4) == 2.0
    assert Hazards.js_round(7) == 7.0
  end
end
