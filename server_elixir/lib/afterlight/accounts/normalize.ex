defmodule Afterlight.Accounts.Normalize do
  @moduledoc """
  `normalizePlayer` equivalent from `server/storage.js`.
  """

  @inventory_default %{
    "seeds" => %{},
    "produce" => %{},
    "reservedProduce" => %{},
    "sprinklers" => 0
  }

  def player(record) when is_map(record) do
    materials = normalize_materials(Map.get(record, "materials") || Map.get(record, :materials))
    inventory = normalize_inventory(Map.get(record, "inventory") || Map.get(record, :inventory))
    reserved = Map.get(record, "reservedCoins") || Map.get(record, :reserved_coins) || 0

    record
    |> stringify_keys()
    |> Map.put("materials", materials)
    |> Map.put("inventory", inventory)
    |> Map.put("reservedCoins", floor_nonneg(reserved, 0))
  end

  def player(other), do: other

  def normalize_materials(map) when is_map(map) do
    Enum.reduce(map, %{}, fn {key, count}, acc ->
      n = to_number(count)

      if is_number(n) and n == n and n > 0 do
        Map.put(acc, to_string(key), trunc(n))
      else
        acc
      end
    end)
  end

  def normalize_materials(_), do: %{}

  def normalize_inventory(map) when is_map(map) do
    sprinklers = to_number(Map.get(map, "sprinklers") || Map.get(map, :sprinklers))
    sprinklers = if is_number(sprinklers) and sprinklers == sprinklers and sprinklers > 0, do: trunc(sprinklers), else: 0

    map
    |> stringify_keys()
    |> Map.put("sprinklers", sprinklers)
    |> Map.update("seeds", %{}, &ensure_map/1)
    |> Map.update("produce", %{}, &ensure_map/1)
    |> Map.update("reservedProduce", %{}, &ensure_map/1)
  end

  def normalize_inventory(_), do: @inventory_default

  def inventory_default, do: @inventory_default

  def to_legacy_player(player) do
    %{
      "id" => player.id,
      "nickname" => player.nickname,
      "coins" => player.coins,
      "xp" => player.xp,
      "level" => player.level,
      "reputation" => player.reputation,
      "reservedCoins" => player.reserved_coins,
      "inventory" => player.inventory,
      "materials" => player.materials,
      "currentRoom" => player.current_room,
      "lastSeen" => player.last_seen
    }
  end

  defp ensure_map(map) when is_map(map), do: stringify_keys(map)
  defp ensure_map(_), do: %{}

  defp stringify_keys(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {k, v}
    end)
  end

  defp to_number(n) when is_number(n), do: n
  defp to_number(n) when is_binary(n) do
    case Float.parse(n) do
      {f, ""} -> f
      _ -> :nan
    end
  end

  defp to_number(_), do: :nan

  defp floor_nonneg(n, default) do
    m = to_number(n)

    cond do
      not is_number(m) -> default
      m != m -> default
      m < 0 -> default
      true -> trunc(m)
    end
  end
end
