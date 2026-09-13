defmodule Afterlight.Accounts.Normalize do
  @moduledoc """
  Player normalization for the retained identity shape. The gardener-era
  economy fields (coins/xp/level/reputation/inventory/materials) are no
  longer part of a player record.
  """

  def player(record) when is_map(record), do: stringify_keys(record)
  def player(other), do: other

  def to_legacy_player(player) do
    base = %{
      "id" => player.id,
      "nickname" => player.nickname,
      "currentRoom" => player.current_room,
      "lastSeen" => player.last_seen
    }

    case Map.get(player, :avatar) do
      nil -> base
      avatar -> Map.put(base, "avatar", avatar)
    end
  end

  defp stringify_keys(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {k, v}
    end)
  end
end
