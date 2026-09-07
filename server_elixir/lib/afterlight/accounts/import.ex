defmodule Afterlight.Accounts.Import do
  @moduledoc false

  alias Afterlight.Accounts.{Actor, Normalize, Player, SystemImport}
  alias Afterlight.Repo

  import Ecto.Query

  def run(source_path) do
    source_path = Path.expand(source_path)

    unless File.exists?(source_path) do
      {:error, :not_found}
    else
      tmp = source_path <> ".import.#{:erlang.unique_integer([:positive])}"
      File.copy!(source_path, tmp)

      try do
        hash = sha256_file(tmp)
        body = tmp |> File.read!() |> Jason.decode()

        case body do
          {:ok, json} -> import_json(json, hash, source_path)
          {:error, _} -> {:ok, :noop, %{reason: "unreadable json"}}
        end
      after
        File.rm(tmp)
      end
    end
  end

  defp import_json(json, hash, source_path) when is_map(json) do
    players = Map.get(json, "players")

    cond do
      players in [nil, %{}] ->
        {:ok, :noop, %{reason: "empty players"}}

      not is_map(players) ->
        {:ok, :noop, %{reason: "empty players"}}

      true ->
        apply_players(players, hash, source_path)
    end
  end

  defp import_json(_json, _hash, _source_path), do: {:ok, :noop, %{reason: "empty players"}}

  defp apply_players(players, hash, source_path) do
    case Repo.get(SystemImport, "players") do
      %{snapshot_sha256: ^hash} ->
        {:ok, :identical, %{hash: hash, count: map_size(players)}}

      %{snapshot_sha256: recorded} when is_binary(recorded) ->
        {:error, :hash_mismatch, %{recorded: recorded, hash: hash}}

      _ ->
        do_import(players, hash, source_path)
    end
  end

  defp do_import(players, hash, source_path) do
    actor = Actor.system()
    rows = Enum.map(players, fn {_id, record} -> Normalize.player(record) end)

    snapshot_count = map_size(players)
    coins_sum = Enum.reduce(rows, 0, fn row, acc -> acc + int(row["coins"]) end)
    xp_sum = Enum.reduce(rows, 0, fn row, acc -> acc + int(row["xp"]) end)

    Repo.transaction(fn ->
      Enum.each(rows, fn row ->
        id = row["id"]

        if not is_binary(id) or id == "" do
          Repo.rollback({:validation, %{reason: "missing id"}})
        end

        attrs = %{
          id: row["id"],
          nickname: row["nickname"] || row["id"],
          coins: int(row["coins"]),
          xp: int(row["xp"]),
          level: max(int(row["level"], 1), 1),
          reputation: int(row["reputation"]),
          reserved_coins: int(row["reservedCoins"]),
          inventory: row["inventory"],
          materials: row["materials"],
          current_room: row["currentRoom"] || "market",
          last_seen: int(row["lastSeen"]),
          shadow: true
        }

        {:ok, _} =
          Player
          |> Ash.Changeset.for_create(:import_upsert, attrs, actor: actor, authorize?: false)
          |> Ash.create()
      end)

      ids = Enum.map(rows, & &1["id"])

      imported =
        Repo.one!(from p in "players", where: p.id in ^ids, select: count(p.id))

      imported_coins =
        Repo.one!(from p in "players", where: p.id in ^ids, select: coalesce(sum(p.coins), 0))

      imported_xp =
        Repo.one!(from p in "players", where: p.id in ^ids, select: coalesce(sum(p.xp), 0))

      if imported != snapshot_count or imported_coins != coins_sum or imported_xp != xp_sum do
        Repo.rollback(
          {:validation,
           %{
             snapshot_count: snapshot_count,
             imported: imported,
             coins: {coins_sum, imported_coins},
             xp: {xp_sum, imported_xp}
           }}
        )
      end

      %SystemImport{
        domain: "players",
        snapshot_sha256: hash,
        player_count: snapshot_count,
        coins_sum: coins_sum,
        xp_sum: xp_sum,
        imported_at: System.system_time(:millisecond),
        source_path: source_path
      }
      |> Repo.insert!(
        on_conflict: :replace_all,
        conflict_target: [:domain]
      )

      %{count: snapshot_count, coins: coins_sum, xp: xp_sum, hash: hash}
    end)
    |> case do
      {:ok, meta} -> {:ok, :imported, meta}
      {:error, {:validation, meta}} -> {:error, :validation, meta}
      {:error, reason} -> {:error, reason}
    end
  end

  defp sha256_file(path) do
    hash_ref = :crypto.hash_init(:sha256)

    File.stream!(path, [], 64 * 1024)
    |> Enum.reduce(hash_ref, fn chunk, acc -> :crypto.hash_update(acc, chunk) end)
    |> :crypto.hash_final()
    |> Base.encode16(case: :lower)
  end

  defp int(v, default \\ 0)
  defp int(v, _d) when is_integer(v), do: v
  defp int(v, _d) when is_float(v), do: trunc(v)
  defp int(_v, d), do: d
end
