defmodule Afterlight.World.Weather do
  @moduledoc """
  Current world weather. Presentation-only after the gardening retirement:
  the garden tick that consumed `RAIN` is gone, and Node remains the rotation
  writer while this process keeps the current value for `welcome`.
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
