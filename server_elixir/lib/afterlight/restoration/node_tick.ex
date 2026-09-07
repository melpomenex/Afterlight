defmodule Afterlight.Restoration.NodeTick do
  @moduledoc "1 Hz node respawn reaper — broadcasts district `node_state` on respawn."

  use GenServer

  alias Afterlight.{Accounts, Restoration}
  alias Afterlight.EconomyGroup.Command
  alias Afterlight.Protocol.Payloads

  def start_link(opts), do: GenServer.start_link(__MODULE__, opts, name: __MODULE__)

  @impl true
  def init(_) do
    Restoration.ensure_nodes!()
    schedule()
    {:ok, nil}
  end

  @impl true
  def handle_info(:tick, _) do
    now = Accounts.now_ms()
    districts = ~w(foundry trestle frost-spire)

    for district <- districts do
      before = Restoration.district_node_snapshot(district)
      Restoration.reap_expired!(now)
      after_snap = Restoration.district_node_snapshot(district)

      if before != after_snap do
        actor = Command.system_actor()
        payload = Payloads.node_state(district, after_snap)
        Command.enqueue_outbox(district, "node_state", payload, actor)
      end
    end

    schedule()
    {:noreply, nil}
  end

  defp schedule, do: Process.send_after(self(), :tick, 1_000)
end
