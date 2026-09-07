defmodule Afterlight.World.Weather do
  @moduledoc """
  Current world weather for garden tick (`RAIN` only waters beds).

  Updated by gateway relay until P6 owns weather outright.
  """

  use GenServer

  def start_link(opts), do: GenServer.start_link(__MODULE__, opts, name: __MODULE__)

  def set(weather), do: GenServer.cast(__MODULE__, {:set, weather})
  def get, do: GenServer.call(__MODULE__, :get)
  def is_raining?, do: get() == "rain"

  @impl true
  def init(_), do: {:ok, "clear"}

  @impl true
  def handle_cast({:set, weather}, _), do: {:noreply, weather}

  @impl true
  def handle_call(:get, _from, weather), do: {:reply, weather, weather}
end
