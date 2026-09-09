defmodule Afterlight.Activities.Tournament.Boot do
  @moduledoc false
  use GenServer

  def start_link(_opts), do: GenServer.start_link(__MODULE__, :ok, name: __MODULE__)

  @impl true
  def init(:ok) do
    Afterlight.Activities.Tournament.Store.cancel_unfinished()
    {:ok, :booted}
  end
end
