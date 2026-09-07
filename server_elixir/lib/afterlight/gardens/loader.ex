defmodule Afterlight.Gardens.Loader do
  @moduledoc """
  Tracks gardens loaded in memory (every connecting player, no eviction).

  Mirrors Node `getOrCreateGarden` + never-pruned map semantics (design D6).
  """

  use GenServer

  def start_link(opts), do: GenServer.start_link(__MODULE__, opts, name: __MODULE__)

  def load(player_id), do: GenServer.cast(__MODULE__, {:load, player_id})

  def loaded_player_ids, do: GenServer.call(__MODULE__, :list)

  @impl true
  def init(_), do: {:ok, MapSet.new()}

  @impl true
  def handle_cast({:load, player_id}, set), do: {:noreply, MapSet.put(set, player_id)}

  @impl true
  def handle_call(:list, _from, set), do: {:reply, MapSet.to_list(set), set}
end
