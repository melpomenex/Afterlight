defmodule Afterlight.EconomyGroup.Wallet do
  @moduledoc "Wallet row helpers — mirrors `players` money columns until P6 activation."

  import Ecto.Query
  alias Afterlight.Repo

  def ensure!(player_id) do
    case Repo.one(from w in "wallets", where: w.player_id == ^player_id, select: map(w, [:player_id, :coins, :reserved_coins])) do
      nil ->
        # Bootstrap from players shadow row
        player = Repo.one(from p in "players", where: p.id == ^player_id, select: map(p, [:coins, :reserved_coins]))
        coins = if player, do: player.coins || 0, else: 0
        reserved = if player, do: player.reserved_coins || 0, else: 0

        Repo.insert_all(
          "wallets",
          [
            %{
              player_id: player_id,
              coins: coins,
              reserved_coins: reserved
            }
          ],
          on_conflict: :nothing
        )

        %{player_id: player_id, coins: coins, reserved_coins: reserved}

      wallet ->
        wallet
    end
  end

  def adjust_coins!(player_id, delta) when is_integer(delta) do
    ensure!(player_id)

    {count, _} =
      Repo.update_all(
        from(w in "wallets",
          where: w.player_id == ^player_id and w.coins + ^delta >= 0,
          update: [set: [coins: fragment("coins + ?", ^delta)]]
        ),
        []
      )

    if count == 1, do: :ok, else: Repo.rollback(:insufficient_coins)
  end

  def adjust_reserved!(player_id, delta) when is_integer(delta) do
    ensure!(player_id)

    {count, _} =
      Repo.update_all(
        from(w in "wallets",
          where: w.player_id == ^player_id and w.reserved_coins + ^delta >= 0,
          update: [set: [reserved_coins: fragment("reserved_coins + ?", ^delta)]]
        ),
        []
      )

    if count == 1, do: :ok, else: Repo.rollback(:insufficient_coins)
  end

  def get(player_id) do
    ensure!(player_id)
    Repo.one!(from w in "wallets", where: w.player_id == ^player_id, select: map(w, [:coins, :reserved_coins]))
  end
end
