defmodule Afterlight.Gardens do
  @moduledoc """
  Gardens domain — till/plant/water/harvest/sprinkler actions and persistence.

  Load semantics (task 3.3): gardens resume from persisted floats on hello;
  growth stage self-catches-up via timestamp math. Moisture/health/history do
  NOT catch up offline — deterministic catch-up is a named follow-up.
  """

  import Ecto.Query

  alias Afterlight.{Accounts, Repo}
  alias Afterlight.EconomyGroup.{Command, Inventory, Ledger, Wallet}
  alias Afterlight.Gardens.Loader
  alias Afterlight.Parity.{Catalog, GardenModel}
  alias Afterlight.Protocol.Payloads

  @bed_count 12

  def load_at_hello(player_id) do
    get_or_create_garden(player_id)
    Loader.load(player_id)
    :ok
  end

  def get_or_create_garden(player_id) do
    exists? =
      Repo.exists?(from g in "gardens", where: g.player_id == ^player_id, select: 1)

    unless exists?, do: create_garden!(player_id)

    fetch_garden(player_id)
  end

  def fetch_garden(player_id) do
    beds =
      Repo.all(
        from b in "beds",
          where: b.garden_id == ^player_id,
          order_by: b.index,
          select: map(b, [
            :index,
            :prepared,
            :crop_id,
            :planted_at,
            :last_watered_at,
            :moisture,
            :health,
            :moisture_history_sum,
            :moisture_checks,
            :stage,
            :harvest_count
          ])
      )
      |> Enum.map(&bed_from_row/1)

    fixtures =
      Repo.all(
        from s in "sprinklers",
          where: s.garden_id == ^player_id,
          select: %{type: s.type, bed_index: s.bed_index}
      )

    %{player_id: player_id, beds: beds, fixtures: fixtures}
  end

  def till_bed(actor, request_id, bed_index) do
    Command.run_idempotent(actor, request_id, %{op: :till, bed_index: bed_index}, fn ->
      with :ok <- assert_owner(actor),
           {:ok, bed} <- fetch_bed(actor.player_id, bed_index),
           {:ok, bed2} <- GardenModel.till_bed(bed) do
        persist_bed!(actor.player_id, bed2)
        outbox_garden(actor, actor.player_id)
        {:ok, action_ok(request_id, "Tilled the soil.")}
      else
        {:error, reason} -> {:error, reason}
      end
    end)
  end

  def plant_bed(actor, request_id, bed_index, seed_crop_id) do
    Command.run_idempotent(actor, request_id, %{op: :plant, bed_index: bed_index, crop: seed_crop_id}, fn ->
      now = Accounts.now_ms()

      Repo.transaction(fn ->
        with :ok <- assert_owner(actor),
             {:ok, bed} <- fetch_bed(actor.player_id, bed_index),
             :ok <- Inventory.adjust!(actor.player_id, "seed", seed_crop_id, -1),
             {:ok, bed2, _crop} <- GardenModel.plant_bed(bed, seed_crop_id, now) do
          persist_bed!(actor.player_id, bed2)
          add_xp!(actor.player_id, 3, recompute_level: false)
          Ledger.insert!(actor.player_id, "plant", "seed", -1, item_id: seed_crop_id, command_ref: request_id)
          Ledger.insert!(actor.player_id, "plant", "xp", 3, command_ref: request_id)
          outbox_garden(actor, actor.player_id)
          outbox_inventory(actor, actor.player_id)
          action_ok(request_id, "Planted #{Catalog.crop(seed_crop_id).name}.")
        else
          {:error, reason} -> Repo.rollback(reason)
        end
      end)
    end)
  end

  def water_bed(actor, request_id, bed_index) do
    Command.run_idempotent(actor, request_id, %{op: :water, bed_index: bed_index}, fn ->
      now = Accounts.now_ms()

      with :ok <- assert_owner(actor),
           {:ok, bed} <- fetch_bed(actor.player_id, bed_index),
           {:ok, bed2} <- GardenModel.water_bed(bed, now) do
        persist_bed!(actor.player_id, bed2)
        outbox_garden(actor, actor.player_id)
        {:ok, action_ok(request_id, "Watered the bed.")}
      else
        {:error, reason} -> {:error, reason}
      end
    end)
  end

  def harvest_bed(actor, request_id, bed_index) do
    Command.run_idempotent(actor, request_id, %{op: :harvest, bed_index: bed_index}, fn ->
      now = Accounts.now_ms()

      Repo.transaction(fn ->
        with :ok <- assert_owner(actor),
             {:ok, bed} <- fetch_bed(actor.player_id, bed_index),
             {:ok, result, bed2} <- GardenModel.harvest_bed(bed, now) do
          produce_key = "#{result.crop_id}_#{result.quality}"
          Inventory.adjust!(actor.player_id, "produce", produce_key, result.yield)
          persist_bed!(actor.player_id, bed2)
          add_xp!(actor.player_id, result.xp, recompute_level: true)
          Ledger.insert!(actor.player_id, "harvest", "produce", result.yield, item_id: produce_key, command_ref: request_id)
          Ledger.insert!(actor.player_id, "harvest", "xp", result.xp, command_ref: request_id)
          outbox_garden(actor, actor.player_id)
          outbox_inventory(actor, actor.player_id)

          msg = Payloads.harvest_message(result.yield, result.quality, result.crop.name)

          action_ok(request_id, msg, title: "Harvest complete")
        else
          {:error, reason} -> Repo.rollback(reason)
        end
      end)
    end)
  end

  def place_sprinkler(actor, request_id, bed_index) do
    Command.run_idempotent(actor, request_id, %{op: :place_sprinkler, bed_index: bed_index}, fn ->
      sprinkler = Catalog.sprinkler()

      Repo.transaction(fn ->
        with :ok <- assert_owner(actor),
             :ok <- assert_fixture_slot(actor.player_id, bed_index),
             :ok <- assert_sprinkler_count(actor.player_id, sprinkler.max_per_garden),
             :ok <- Inventory.adjust!(actor.player_id, "fixture", "sprinklers", -1) do
          now = Accounts.now_ms()

          Repo.insert_all("sprinklers", [
            %{garden_id: actor.player_id, bed_index: bed_index, type: sprinkler.id}
          ])

          Ledger.insert!(actor.player_id, "craft", "fixture", -1, item_id: "sprinklers", command_ref: request_id)
          outbox_garden(actor, actor.player_id)
          outbox_inventory(actor, actor.player_id)
          action_ok(request_id, "Sprinkler placed.")
        else
          {:error, reason} -> Repo.rollback(reason)
        end
      end)
    end)
  end

  def persist_beds!(player_id, beds) do
    Enum.each(beds, &persist_bed!(player_id, &1))
    :ok
  end

  def persist_bed!(player_id, bed) do
    Repo.update_all(
      from(b in "beds", where: b.garden_id == ^player_id and b.index == ^bed.index),
      set: bed_to_row(bed)
    )
  end

  defp create_garden!(player_id) do
    now = Accounts.now_ms()
    beds = GardenModel.create_initial_beds(@bed_count)

    Repo.insert_all("gardens", [%{player_id: player_id, last_tick: now, inserted_at: now}])

    Repo.insert_all(
      "beds",
      Enum.map(beds, fn bed ->
        %{garden_id: player_id, index: bed.index}
        |> Map.merge(Map.new(bed_to_row(bed)))
      end)
    )

    :ok
  end

  defp fetch_bed(player_id, index) do
    case Repo.one(
           from b in "beds",
             where: b.garden_id == ^player_id and b.index == ^index,
             select: map(b, [
               :index,
               :prepared,
               :crop_id,
               :planted_at,
               :last_watered_at,
               :moisture,
               :health,
               :moisture_history_sum,
               :moisture_checks,
               :stage,
               :harvest_count
             ])
         ) do
      nil -> {:error, "bed_not_found"}
      row -> {:ok, bed_from_row(row)}
    end
  end

  defp assert_owner(actor), do: if(actor.player_id, do: :ok, else: {:error, "invalid_request"})

  defp assert_fixture_slot(player_id, bed_index) do
    exists =
      Repo.exists?(
        from s in "sprinklers", where: s.garden_id == ^player_id and s.bed_index == ^bed_index
      )

    if exists, do: {:error, "fixture_already_present"}, else: :ok
  end

  defp assert_sprinkler_count(player_id, max) do
    count = Repo.one(from s in "sprinklers", where: s.garden_id == ^player_id, select: count(s.id))

    if count >= max, do: {:error, "sprinkler_limit_reached"}, else: :ok
  end

  defp add_xp!(player_id, delta, opts) do
    Repo.update_all(
      from(p in "players", where: p.id == ^player_id, update: [set: [xp: fragment("xp + ?", ^delta)]]),
      []
    )

    if Keyword.get(opts, :recompute_level, false) do
      player = Repo.one!(from p in "players", where: p.id == ^player_id, select: map(p, [:xp]))
      level = Catalog.level_from_xp(player.xp)
      Repo.update_all(from(p in "players", where: p.id == ^player_id), set: [level: level])
    end

    :ok
  end

  defp outbox_garden(actor, player_id) do
    garden = fetch_garden(player_id)
    room = "garden:#{player_id}"
    payload = Payloads.garden_state(room, garden.beds, garden.fixtures)
    Command.enqueue_outbox(player_id, "garden_state", payload, actor)
  end

  defp outbox_inventory(actor, player_id) do
    player = player_snapshot(player_id)
    Command.enqueue_outbox(player_id, "inventory_state", Payloads.inventory_state(player), actor)
  end

  defp player_snapshot(player_id) do
    row = Repo.one!(from p in "players", where: p.id == ^player_id, select: map(p, [:id, :nickname, :xp, :level, :reputation, :current_room, :last_seen]))
    wallet = Wallet.get(player_id)
    inv = Inventory.get_map(player_id)

    Map.merge(row, %{
      coins: wallet.coins,
      reserved_coins: wallet.reserved_coins,
      inventory: inv,
      materials: inv.materials
    })
  end

  defp action_ok(request_id, message, opts \\ []) do
    Payloads.action_result(actionId: request_id, success: true, title: Keyword.get(opts, :title, "Action complete"), message: message)
  end

  defp bed_from_row(row) do
    %{
      index: row.index,
      prepared: row.prepared,
      crop_id: row.crop_id,
      planted_at: row.planted_at,
      last_watered_at: row.last_watered_at,
      moisture: row.moisture,
      health: row.health,
      moisture_history_sum: row.moisture_history_sum,
      moisture_checks: row.moisture_checks,
      stage: row.stage,
      harvest_count: row.harvest_count
    }
  end

  defp bed_to_row(bed) do
    [
      prepared: bed.prepared,
      crop_id: bed.crop_id,
      planted_at: bed.planted_at,
      last_watered_at: bed.last_watered_at,
      moisture: bed.moisture,
      health: bed.health,
      moisture_history_sum: bed.moisture_history_sum,
      moisture_checks: bed.moisture_checks,
      stage: bed.stage,
      harvest_count: bed.harvest_count
    ]
  end
end
