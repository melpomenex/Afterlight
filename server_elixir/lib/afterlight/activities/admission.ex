defmodule Afterlight.Activities.Admission do
  @moduledoc """
  Atomic cross-room player identity admission leases (task 2.2, design D3).
  Enforces that an identity occupies at most one active playing slot across activities.
  Backed by a unique Registry linked to the session process.

  ## Single-owner-node constraint (add-multiplayer-snowboard-arcade 4.4)

  This registry is NODE-LOCAL, not a distributed identity lease: release v1
  for the Summit Run race is supported only on the current single-owner-node
  deployment, where duplicate-connection prevention is complete. A
  multi-owner-node rollout of `snowboard-race` requires an explicit global
  admission/fencing gate BEFORE enabling the type there; do not advertise
  cluster-wide duplicate prevention from this module.
  """

  @registry Afterlight.Activities.AdmissionRegistry

  @type slot_info :: %{
          room_key: String.t(),
          activity_id: String.t(),
          session_id: String.t(),
          slot: non_neg_integer()
        }

  @doc """
  Atomically acquire an admission lease for a player under the calling process.
  Returns:
    - `{:ok, :acquired}` if newly acquired
    - `{:ok, :already_acquired}` if this process already holds the lease for this player
    - `{:error, :already_playing}` if another live process holds the lease
  """
  @spec acquire(String.t(), slot_info()) ::
          {:ok, :acquired | :already_acquired} | {:error, :already_playing}
  def acquire(player_id, metadata) when is_binary(player_id) and is_map(metadata) do
    case Registry.register(@registry, player_id, metadata) do
      {:ok, _entry} ->
        {:ok, :acquired}

      {:error, {:already_registered, pid}} when pid == self() ->
        # Update metadata in place if slot or details changed
        Registry.update_value(@registry, player_id, fn _old -> metadata end)
        {:ok, :already_acquired}

      {:error, {:already_registered, pid}} ->
        if Process.alive?(pid) do
          {:error, :already_playing}
        else
          # Process died but Registry hadn't cleaned up yet; wait briefly and retry once
          Process.sleep(5)

          case Registry.register(@registry, player_id, metadata) do
            {:ok, _} -> {:ok, :acquired}
            {:error, {:already_registered, _}} -> {:error, :already_playing}
          end
        end
    end
  end

  @doc "Release the admission lease for a player held by the calling process."
  @spec release(String.t()) :: :ok
  def release(player_id) when is_binary(player_id) do
    Registry.unregister(@registry, player_id)
    :ok
  end

  @doc "Checks if player currently has an active playing lease anywhere."
  @spec playing?(String.t()) :: boolean()
  def playing?(player_id) when is_binary(player_id) do
    case Registry.lookup(@registry, player_id) do
      [{pid, _metadata}] -> Process.alive?(pid)
      [] -> false
    end
  end

  @doc "Returns info on where the player is currently playing, or :none."
  @spec where_playing(String.t()) :: {:ok, {pid(), slot_info()}} | :none
  def where_playing(player_id) when is_binary(player_id) do
    case Registry.lookup(@registry, player_id) do
      [{pid, metadata}] ->
        if Process.alive?(pid), do: {:ok, {pid, metadata}}, else: :none

      [] ->
        :none
    end
  end
end
