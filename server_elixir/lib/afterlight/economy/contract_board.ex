defmodule Afterlight.Economy.ContractBoard do
  @moduledoc "Persisted 3-slot contract board with 5-minute reroll."

  import Ecto.Query
  alias Afterlight.{Accounts, Repo}
  alias Afterlight.EconomyGroup.Command
  alias Afterlight.Parity.Contracts
  alias Afterlight.Protocol.Payloads
  alias Afterlight.Restoration

  @refresh_ms 5 * 60 * 1000

  def ensure_initialized!(rng \\ default_rng()) do
    case Repo.aggregate("contracts", :count) do
      0 -> refresh!(rng, mill_restored?())
      _ -> :ok
    end
  end

  def list do
    Repo.all(
      from c in "contracts",
        order_by: c.slot,
        select: map(c, [
          :id,
          :slot,
          :client,
          :crop_id,
          :crop_name,
          :quantity,
          :min_quality,
          :reward,
          :reputation,
          :xp,
          :tier,
          :expires_at,
          :generated_at
        ])
    )
  end

  def tick_if_due(rng \\ default_rng()) do
    board =
      Repo.one!(
        from b in "contract_board",
          where: b.id == 1,
          select: %{last_refresh_at: b.last_refresh_at}
      )

    now = Accounts.now_ms()

    if now - board.last_refresh_at > @refresh_ms do
      refresh!(rng, mill_restored?())
      true
    else
      false
    end
  end

  def refresh!(rng, mill_restored?) do
    now = Accounts.now_ms()
    contracts = Contracts.generate_board(rng, mill_restored?, now)

    Repo.delete_all("contracts")

    Repo.insert_all(
      "contracts",
      Enum.with_index(contracts, fn c, slot ->
        %{
          id: c.id,
          slot: slot,
          client: c.client,
          crop_id: c.crop_id,
          crop_name: c.crop_name,
          quantity: c.quantity,
          min_quality: c.min_quality,
          reward: trunc(c.reward),
          reputation: trunc(c.reputation),
          xp: trunc(c.xp),
          tier: c.tier,
          expires_at: c.expires_at,
          generated_at: c.generated_at
        }
      end)
    )

    Repo.update_all(from(b in "contract_board", where: b.id == 1), set: [last_refresh_at: now])
    contracts
  end

  def reroll_on_mill_restore!(rng \\ default_rng()) do
    refresh!(rng, true)
    actor = Command.system_actor()
    payload = Payloads.contract_update(list())
    Command.enqueue_outbox("market", "contract_update", payload, actor)
  end

  defp mill_restored?, do: Restoration.mill_restored?()

  defp default_rng, do: fn -> :rand.uniform() end
end
