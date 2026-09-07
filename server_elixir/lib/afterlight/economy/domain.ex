defmodule Afterlight.Economy.Domain do
  @moduledoc "Ash domain for economy persistence (wallets, orders, contracts, …)."

  use Ash.Domain, otp_app: :afterlight

  resources do
    resource Afterlight.Economy.Wallet
    resource Afterlight.Economy.InventoryBalance
    resource Afterlight.Economy.MarketMultiplier
    resource Afterlight.Economy.Order
    resource Afterlight.Economy.Trade
    resource Afterlight.Economy.LedgerEntry
    resource Afterlight.Economy.Contract
    resource Afterlight.Economy.ContractBoardMeta
  end
end
