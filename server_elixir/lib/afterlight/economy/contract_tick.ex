defmodule Afterlight.Economy.ContractTick do
  @moduledoc "5-minute contract board reroll scheduler."

  use GenServer

  alias Afterlight.Economy.ContractBoard
  alias Afterlight.EconomyGroup.Command
  alias Afterlight.Protocol.Payloads

  def start_link(opts), do: GenServer.start_link(__MODULE__, opts, name: __MODULE__)

  @impl true
  def init(_) do
    ContractBoard.ensure_initialized!()
    schedule()
    {:ok, nil}
  end

  @impl true
  def handle_info(:tick, _) do
    if ContractBoard.tick_if_due() do
      actor = Command.system_actor()
      payload = Payloads.contract_update(ContractBoard.list())
      Command.enqueue_outbox("market", "contract_update", payload, actor)
    end

    schedule()
    {:noreply, nil}
  end

  defp schedule, do: Process.send_after(self(), :tick, 30_000)
end
