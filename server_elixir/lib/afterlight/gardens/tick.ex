defmodule Afterlight.Gardens.Tick do
  @moduledoc """
  1 Hz garden tick for loaded gardens (design D6).

  Persists on stage change only, matching `server/gardens.js`.
  """

  use GenServer

  import Ecto.Query
  alias Afterlight.{Gardens, Repo}
  alias Afterlight.Gardens.Loader
  alias Afterlight.Parity.GardenModel
  alias Afterlight.World.Weather

  @dt 1.0

  def start_link(opts), do: GenServer.start_link(__MODULE__, opts, name: __MODULE__)

  @impl true
  def init(_) do
    schedule()
    {:ok, nil}
  end

  @impl true
  def handle_info(:tick, _) do
    now = System.system_time(:millisecond)
    raining = Weather.is_raining?()

    for player_id <- Loader.loaded_player_ids() do
      tick_garden(player_id, now, raining)
    end

    schedule()
    {:noreply, nil}
  end

  defp tick_garden(player_id, now, raining) do
    garden = Gardens.fetch_garden(player_id)
    covered = sprinkler_coverage_set(garden)

    {changed?, beds} =
      Enum.map_reduce(garden.beds, false, fn bed, changed ->
        old_stage = bed.stage
        sprinkled = MapSet.member?(covered, bed.index)
        bed2 = GardenModel.tick_bed(bed, @dt, raining, now, sprinkled)
        {bed2, changed or bed2.stage != old_stage}
      end)

    if changed? do
      Gardens.persist_beds!(player_id, beds)
    end
  end

  defp sprinkler_coverage_set(%{fixtures: fixtures}) do
    Enum.reduce(fixtures, MapSet.new(), fn f, acc ->
      Enum.reduce(GardenModel.sprinkler_coverage(f.bed_index), acc, &MapSet.put(&2, &1))
    end)
  end

  defp schedule, do: Process.send_after(self(), :tick, 1_000)
end
