defmodule Afterlight.Accounts.AvatarDefinitions do
  @moduledoc """
  Validated avatar definitions loaded from priv/avatar_definitions.json.
  Provides lookup, validation, and weighted-random selection for avatar assignment (D2, D5).
  """

  @doc "Default path to priv/avatar_definitions.json"
  def default_path do
    Application.app_dir(:afterlight, "priv/avatar_definitions.json")
  end

  @doc "Load and parse entries from path or default_path"
  def load(path \\ default_path()) do
    with {:ok, bytes} <- File.read(path),
         {:ok, %{"entries" => entries}} <- Jason.decode(bytes) do
      {:ok, entries}
    else
      err -> err
    end
  end

  @doc "Check if an avatar id is valid in the entries list"
  def valid_id?(entries, id) when is_list(entries) and is_binary(id) do
    Enum.any?(entries, &(&1["id"] == id))
  end

  def valid_id?(_entries, _id), do: false

  @doc "Find an avatar entry by id"
  def get_entry(entries, id) when is_list(entries) and is_binary(id) do
    Enum.find(entries, &(&1["id"] == id))
  end

  def get_entry(_entries, _id), do: nil

  @doc "Total weight of entries"
  def total_weight(entries) when is_list(entries) do
    Enum.reduce(entries, 0, fn e, acc -> acc + (e["weight"] || 0) end)
  end

  @doc """
  Pick an avatar id weighted-randomly.
  Accepts an optional integer roll in 0..(total_weight - 1) or custom rng function.
  """
  def pick_weighted(entries, roll_or_rng \\ nil)

  def pick_weighted(entries, roll) when is_list(entries) and is_integer(roll) do
    choose(entries, roll, 0)
  end

  def pick_weighted(entries, rng_fun) when is_list(entries) and is_function(rng_fun, 1) do
    tot = total_weight(entries)

    if tot <= 0 do
      nil
    else
      target = rng_fun.(tot)
      choose(entries, target, 0)
    end
  end

  def pick_weighted(entries, nil) when is_list(entries) do
    tot = total_weight(entries)

    if tot <= 0 do
      nil
    else
      target = :rand.uniform(tot) - 1
      choose(entries, target, 0)
    end
  end

  defp choose([entry | rest], target, acc) do
    new_acc = acc + (entry["weight"] || 0)

    if target < new_acc or rest == [] do
      entry["id"]
    else
      choose(rest, target, new_acc)
    end
  end

  defp choose([], _target, _acc), do: nil
end
