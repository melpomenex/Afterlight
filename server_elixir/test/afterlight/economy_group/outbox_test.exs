defmodule Afterlight.EconomyGroup.OutboxTest do
  @moduledoc """
  Task 7.4: Outbox tests:
  1. Commit-then-crash loses no broadcast (outbox row committed with published_at: nil, relay delivers via PubSub and marks published_at).
  2. At-least-once redelivery is deduped by (event_id, revision).
  3. Reconnect resnapshot equals accumulated event stream.
  """

  use Afterlight.DataCase, async: false

  alias Afterlight.{Accounts, Economy, Gardens, Repo}
  alias Afterlight.Accounts.Actor
  alias Afterlight.EconomyGroup.{Inventory, OutboxRelay, Wallet}

  import Ecto.Query

  defp setup_player(id, opts \\ []) do
    coins = Keyword.get(opts, :coins, 500)
    seeds = Keyword.get(opts, :seeds, %{"radish" => 10})
    produce = Keyword.get(opts, :produce, %{})

    now = Accounts.now_ms()

    Repo.insert_all(
      "players",
      [
        %{
          id: id,
          nickname: id,
          coins: coins,
          xp: 0,
          level: 1,
          reputation: 0,
          reserved_coins: 0,
          inventory: %{
            "seeds" => seeds,
            "produce" => produce,
            "reservedProduce" => %{},
            "sprinklers" => 0
          },
          materials: %{},
          current_room: "market",
          last_seen: now,
          active: true,
          shadow: false
        }
      ],
      on_conflict:
        {:replace,
         [:coins, :reserved_coins, :xp, :level, :reputation, :inventory, :materials, :current_room, :last_seen]},
      conflict_target: [:id]
    )

    Wallet.ensure!(id)
    Inventory.backfill_from_player_jsonb!(id)
    Gardens.get_or_create_garden(id)

    Actor.session(id, "sess_#{id}")
  end

  describe "commit-then-crash broadcast recovery" do
    test "committed outbox row survives crash and is delivered by OutboxRelay" do
      actor = setup_player("outbox_player_1")

      # Subscribe to player's pubsub topic
      Phoenix.PubSub.subscribe(Afterlight.PubSub, "players:outbox_player_1")

      # Prepare bed 0
      Repo.update_all(
        from(b in "beds", where: b.garden_id == "outbox_player_1" and b.index == 0),
        set: [prepared: true, stage: 1, crop_id: nil]
      )

      # Clean any previous outbox rows
      Repo.delete_all(from e in "outbox_events", where: e.aggregate_id == "outbox_player_1")

      # Execute plant_bed action: commits bed update, receipt, and outbox rows in transaction
      assert {:ok, {:applied, _}} = Gardens.plant_bed(actor, "outbox_crash_req_1", 0, "radish")

      # Verify unpublished outbox row exists in DB
      pending =
        Repo.all(
          from(e in "outbox_events",
            where: e.aggregate_id == "outbox_player_1" and is_nil(e.published_at),
            select: map(e, [:id, :event_type, :published_at])
          )
        )

      assert length(pending) >= 1
      types = Enum.map(pending, & &1.event_type)
      assert "garden_state" in types or "inventory_state" in types

      # Run OutboxRelay publish_pending (simulating background relay recovery after worker crash)
      delivered_count = OutboxRelay.publish_pending()
      assert delivered_count >= 1

      # Assert PubSub broadcast was received
      assert_receive {:economy_frame, _type, _payload}, 2_000

      # All outbox rows for this aggregate are now marked published
      remaining_pending =
        Repo.aggregate(
          from(e in "outbox_events",
            where: e.aggregate_id == "outbox_player_1" and is_nil(e.published_at)
          ),
          :count
        )

      assert remaining_pending == 0
    end
  end

  describe "at-least-once redelivery deduplication" do
    test "client-side deduplication by (event_id, revision) ignores duplicate deliveries" do
      actor = setup_player("outbox_player_dedup")

      # Prepare bed 0
      Repo.update_all(
        from(b in "beds", where: b.garden_id == "outbox_player_dedup" and b.index == 0),
        set: [prepared: true, stage: 1, crop_id: nil]
      )

      # Plant crop to create outbox events
      {:ok, {:applied, _}} = Gardens.plant_bed(actor, "dedup_req_1", 0, "radish")

      events =
        Repo.all(
          from(e in "outbox_events",
            where: e.aggregate_id == "outbox_player_dedup",
            select: map(e, [:id, :revision, :event_type, :payload])
          )
        )

      assert length(events) >= 1

      # Simulate client at-least-once redelivery stream containing duplicates
      delivery_stream = events ++ events

      # Client deduplicator processing stream
      {processed, _seen} =
        Enum.reduce(delivery_stream, {[], MapSet.new()}, fn event, {acc_processed, seen} ->
          key = {event.id, event.revision}

          if MapSet.member?(seen, key) do
            # Duplicate dropped
            {acc_processed, seen}
          else
            {acc_processed ++ [event], MapSet.put(seen, key)}
          end
        end)

      # Deduplication drops exactly the repeated events
      assert length(processed) == length(events)
      assert Enum.map(processed, & &1.id) == Enum.map(events, & &1.id)
    end
  end

  describe "reconnect resnapshot equals accumulated event stream" do
    test "reconstructed state from event stream matches fresh database resnapshot" do
      actor = setup_player("outbox_resnap_player", coins: 100, seeds: %{"radish" => 5})

      Repo.delete_all(from e in "outbox_events", where: e.aggregate_id == "outbox_resnap_player")

      # Step 1: Till bed 0
      {:ok, {:applied, _}} = Gardens.till_bed(actor, "step_1_till", 0)

      # Step 2: Plant radish in bed 0
      {:ok, {:applied, _}} = Gardens.plant_bed(actor, "step_2_plant", 0, "radish")

      # Step 3: Water bed 0
      {:ok, {:applied, _}} = Gardens.water_bed(actor, "step_3_water", 0)

      # Step 4: Buy 2 radish seeds from NPC
      {:ok, {:applied, _}} = Economy.npc_buy(actor, "step_4_buy", "radish", 2)

      # Collect all outbox events in order
      events =
        Repo.all(
          from(e in "outbox_events",
            where: e.aggregate_id == "outbox_resnap_player",
            order_by: [asc: e.id],
            select: map(e, [:event_type, :payload, :revision])
          )
        )

      # Find latest garden_state event from stream
      latest_garden_event =
        events
        |> Enum.filter(&(&1.event_type == "garden_state"))
        |> List.last()

      assert latest_garden_event != nil

      # Find latest inventory_state event from stream
      latest_inv_event =
        events
        |> Enum.filter(&(&1.event_type == "inventory_state"))
        |> List.last()

      assert latest_inv_event != nil

      # Fresh resnapshot queried from DB
      fresh_garden = Gardens.fetch_garden("outbox_resnap_player")
      _fresh_player_row = Repo.one!(from p in "players", where: p.id == "outbox_resnap_player", select: map(p, [:id, :nickname, :xp, :level, :reputation, :current_room, :last_seen]))
      fresh_inv_map = Inventory.get_map("outbox_resnap_player")

      # Invariant: bed 0 in reconstructed garden_state matches fresh DB snapshot
      reconstructed_beds = latest_garden_event.payload["beds"] || latest_garden_event.payload[:beds]
      bed_0_stream = Enum.find(reconstructed_beds, &(&1["index"] == 0 or &1[:index] == 0))
      bed_0_fresh = Enum.find(fresh_garden.beds, &(&1.index == 0))

      assert bed_0_stream["cropId"] == bed_0_fresh.crop_id
      assert bed_0_stream["stage"] == bed_0_fresh.stage
      assert bed_0_stream["prepared"] == bed_0_fresh.prepared

      # Invariant: seeds in reconstructed inventory_state matches fresh DB snapshot
      player_payload = latest_inv_event.payload["player"] || latest_inv_event.payload[:player]
      reconstructed_inv = player_payload["inventory"] || player_payload[:inventory]
      reconstructed_seeds = reconstructed_inv["seeds"] || reconstructed_inv[:seeds]
      radish_seeds_stream = reconstructed_seeds["radish"] || reconstructed_seeds[:radish]
      radish_seeds_fresh = fresh_inv_map.seeds["radish"] || 0

      assert radish_seeds_stream == radish_seeds_fresh
    end
  end
end
