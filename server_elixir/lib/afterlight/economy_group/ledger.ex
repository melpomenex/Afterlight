defmodule Afterlight.EconomyGroup.Ledger do
  @moduledoc "Append-only ledger rows for balance mutations."

  alias Afterlight.Repo

  def insert!(player_id, kind, account, delta, opts \\ []) do
    now = System.system_time(:millisecond)

    Repo.insert_all("ledger_entries", [
      %{
        player_id: player_id,
        kind: kind,
        account: account,
        item_id: Keyword.get(opts, :item_id),
        delta: delta,
        trade_id: Keyword.get(opts, :trade_id),
        command_ref: Keyword.get(opts, :command_ref),
        inserted_at: now
      }
    ])
  end
end
