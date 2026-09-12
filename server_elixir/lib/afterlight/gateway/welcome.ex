defmodule Afterlight.Gateway.Welcome do
  @moduledoc """
  Phoenix-owned hello/welcome composition. After the gardening retirement the
  welcome carries identity, weather and the retained shared domains
  (theater/IPTV); the old garden/economy snapshots are gone.
  """

  import Ecto.Query

  alias Afterlight.{Accounts, Repo}
  alias Afterlight.Accounts.{Actor, Normalize, Player}
  alias Afterlight.Catalog
  alias Afterlight.Realtime.Negotiation
  alias Afterlight.Theater
  alias Afterlight.World.Weather

  @doc """
  Build the full welcome map matching Node's hello reply field set.
  """
  @spec compose(String.t(), String.t(), term()) :: map()
  def compose(player_id, nickname, rt_cap \\ nil) when is_binary(player_id) do
    actor = Actor.system()
    now = Accounts.now_ms()

    with {:ok, player} <- ensure_player(player_id, nickname, actor, now) do
      _ = Accounts.touch_last_seen(player, now, actor)

      welcome = %{
        "player" => player_wire(player_id),
        "weather" => Weather.get(),
        "theater" => Theater.snapshot(),
        "iptv" => Catalog.snapshot()
      }

      if rt_cap, do: Map.put(welcome, "rt", Negotiation.welcome_rt()), else: welcome
    else
      _ -> %{"player" => %{"id" => player_id, "nickname" => nickname}}
    end
  end

  @doc """
  Initial post-welcome frames in Node hello order. The retired garden state
  is gone, so hello currently emits none.
  """
  @spec initial_frames(String.t()) :: [{String.t(), map()}]
  def initial_frames(_player_id), do: []

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
          select: map(p, [:id, :nickname, :current_room, :last_seen])
      )

    Normalize.to_legacy_player(%{
      id: row.id,
      nickname: row.nickname,
      current_room: row.current_room,
      last_seen: row.last_seen
    })
  end
end
