defmodule Afterlight.Gateway.Welcome do
  @moduledoc """
  Phoenix-owned hello/welcome composition for the P6 economy cutover.
  """

  import Ecto.Query

  alias Afterlight.{Accounts, Repo}
  alias Afterlight.Accounts.{Actor, Normalize, Player}
  alias Afterlight.Catalog
  alias Afterlight.Economy
  alias Afterlight.Economy.ContractBoard
  alias Afterlight.EconomyGroup.{Inventory, Wallet}
  alias Afterlight.Gardens
  alias Afterlight.Protocol.Payloads
  alias Afterlight.Realtime.Negotiation
  alias Afterlight.Restoration
  alias Afterlight.Theater
  alias Afterlight.World.Weather

  @doc """
  Build the full welcome map matching Node's hello reply field set.
  """
  @spec compose(String.t(), String.t(), term()) :: map()
  def compose(player_id, nickname, rt_cap \\ nil) when is_binary(player_id) do
    Restoration.ensure_nodes!()
    ContractBoard.ensure_initialized!()
    Gardens.load_at_hello(player_id)

    actor = Actor.system()
    now = Accounts.now_ms()

    with {:ok, player} <- ensure_player(player_id, nickname, actor, now) do
      _ = Accounts.touch_last_seen(player, now, actor)
      Wallet.ensure!(player_id)
      Inventory.backfill_from_player_jsonb!(player_id)

      welcome = %{
        "player" => player_wire(player_id),
        "weather" => Weather.get(),
        "prices" => stringify(Economy.prices_snapshot()),
        "contracts" => contracts_wire(),
        "orderBook" => stringify(Economy.book_snapshot()),
        "theater" => Theater.snapshot(),
        "iptv" => Catalog.snapshot()
      }

      if rt_cap, do: Map.put(welcome, "rt", Negotiation.welcome_rt()), else: welcome
    else
      _ -> %{"player" => %{"id" => player_id, "nickname" => nickname}}
    end
  end

  @doc "Initial post-welcome frames in Node hello order (garden_state, …)."
  @spec initial_frames(String.t()) :: [{String.t(), map()}]
  def initial_frames(player_id) when is_binary(player_id) do
    garden = Gardens.fetch_garden(player_id)
    room = "garden:#{player_id}"

    [
      {"garden_state", stringify(Payloads.garden_state(room, garden.beds, garden.fixtures))}
    ]
  end

  defp ensure_player(player_id, nickname, actor, now) do
    case Ash.get(Player, player_id, actor: actor, error?: false) do
      {:ok, %Player{} = player} ->
        Accounts.allocate_and_assign(player, nickname, actor)

      _ ->
        Player
        |> Ash.Changeset.for_create(:stub, %{id: player_id, nickname: nickname, last_seen: now}, actor: actor)
        |> Ash.create()
        |> case do
          {:ok, player} -> Accounts.allocate_and_assign(player, nickname, actor)
          other -> other
        end
    end
  end

  defp player_wire(player_id) do
    row =
      Repo.one!(
        from p in "players",
          where: p.id == ^player_id,
          select: map(p, [:id, :nickname, :xp, :level, :reputation, :current_room, :last_seen])
      )

    wallet = Wallet.get(player_id)
    inv = Inventory.get_map(player_id)

    inventory = %{
      "seeds" => stringify_map(inv.seeds),
      "produce" => stringify_map(inv.produce),
      "reservedProduce" => stringify_map(inv.reserved_produce)
    }

    inventory =
      if Map.get(inv, :sprinklers, 0) > 0,
        do: Map.put(inventory, "sprinklers", inv.sprinklers),
        else: inventory

    Normalize.to_legacy_player(%{
      id: row.id,
      nickname: row.nickname,
      coins: wallet.coins,
      xp: row.xp,
      level: row.level,
      reputation: row.reputation,
      reserved_coins: wallet.reserved_coins,
      inventory: inventory,
      materials: stringify_map(inv.materials),
      current_room: row.current_room,
      last_seen: row.last_seen
    })
  end

  defp contracts_wire do
    ContractBoard.list()
    |> Enum.map(&Payloads.contract_wire/1)
    |> Enum.map(&stringify/1)
  end

  defp stringify_map(map) when is_map(map) do
    map
    |> Enum.reject(fn {_k, v} -> v == 0 end)
    |> Map.new(fn {k, v} -> {to_string(k), v} end)
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_map(v) -> {to_string(k), stringify(v)}
      {k, v} when is_list(v) -> {to_string(k), Enum.map(v, &stringify/1)}
      {k, v} -> {to_string(k), v}
    end)
  end

  defp stringify(other), do: other
end
