defmodule Afterlight.Social.Supervisor do
  @moduledoc """
  Supervision tree for the `Afterlight.Social` context:
    * `Afterlight.Social.Bridge` (IRC adapter boundary and echo-suppression ledger)
    * `Afterlight.Social.Relay` (single-writer game chat relay and history ring)
  """

  use Supervisor

  def start_link(init_arg \\ []) do
    Supervisor.start_link(__MODULE__, init_arg, name: __MODULE__)
  end

  @impl true
  def init(_init_arg) do
    children = [
      {Afterlight.Social.Bridge, [name: Afterlight.Social.Bridge, relay: Afterlight.Social.Relay]},
      {Afterlight.Social.Relay, [name: Afterlight.Social.Relay, bridge: Afterlight.Social.Bridge]}
    ]

    Supervisor.init(children, strategy: :one_for_one)
  end
end
