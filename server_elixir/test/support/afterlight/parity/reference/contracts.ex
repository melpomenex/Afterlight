defmodule Afterlight.Parity.Reference.Contracts do
  @moduledoc """
  Parity reference for `server/economy.js` contract board generation and
  fulfillment. Delegates to `Afterlight.Economy.Contracts`.
  """

  @behaviour Afterlight.Parity.Reference

  alias Afterlight.Economy.Contracts

  @impl true
  def run_case_fn("generateContracts", [state, seed], now_ms) do
    Contracts.generate_contracts(state || %{}, now_ms, seeded_rng(seed))
  end

  def run_case_fn("fulfillOnBoard", [contracts, player, contract_id], _now_ms) do
    {result, _contracts, _player} = Contracts.fulfill_contract(contracts, player, contract_id)
    result
  end

  def run_case_fn("tickBoard", [contracts, last_refresh_at, now, seed], _now_ms) do
    board = %{contracts: contracts, last_refresh_at: last_refresh_at, state: %{}}

    {board2, refreshed} = Contracts.tick_contracts(board, now, seeded_rng(seed))

    %{
      "refreshed" => refreshed,
      "contracts" => board2.contracts,
      "lastContractRefresh" => board2.last_refresh_at
    }
  end

  def run_case_fn(fname, _args, _now_ms),
    do: raise("contracts reference: unknown fn #{inspect(fname)}")

  # JS recorder freezes Math.random to a constant return value (the seed).
  defp seeded_rng(seed) when is_number(seed), do: fn -> seed * 1.0 end
end
