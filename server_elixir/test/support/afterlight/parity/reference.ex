defmodule Afterlight.Parity.Reference do
  @moduledoc """
  Behaviour for parity reference modules. Each module owns one fixture file
  and exposes `run_case_fn/3`, which dispatches a fixture case's `fn` name to
  the reference implementation of that JS function.

  Implementations are TEST-SIDE PARITY REFERENCES — never authority.
  """

  @callback run_case_fn(fname :: String.t(), args :: [term], now_ms :: integer | nil) :: term

  @optional_callbacks run_case_fn: 3
end
