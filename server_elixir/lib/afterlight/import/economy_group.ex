defmodule Afterlight.Import.EconomyGroup do
  @moduledoc """
  Freeze-aware, idempotent importer and validation report for all economy-group
  domains from a single frozen `game-state.json` snapshot (P6 cutover ceremony).

  Owns:
  - Players, wallets, and normalized inventory balances (jsonb -> balance rows)
  - Orphaned reservedProduce write-off (zeroed with reconciliation ledger entries)
  - Gardens, beds, and sprinklers
  - Orders (ids verbatim) and trades
  - Market multipliers (float8-exact)
  - Gather nodes and machines (the Great Mill)
  - Snapshot SHA-256 recording in `import_snapshots`
  - Validation report asserting all P6 invariants
  - No-op guarantee on identical snapshot hash
  """

  import Ecto.Query

  alias Afterlight.Import.Snapshot
  alias Afterlight.Parity.Catalog
  alias Afterlight.Repo

  @kinds ~w(seed produce reserved_produce material fixture)

  def default_game_state_path do
    cond do
      File.exists?("data/game-state.json") -> Path.expand("data/game-state.json")
      File.exists?("../data/game-state.json") -> Path.expand("../data/game-state.json")
      true -> Path.expand(Path.join([File.cwd!(), "..", "data", "game-state.json"]))
    end
  end

  @doc """
  Runs the economy group import against `source_path`.

  Options:
  - `:freeze_ack` - boolean or string ("yes"/"true"). Required for operator cutovers.
  - `:force` - boolean. If true, forces import even if a hash was recorded.
  """
  def run(source_path \\ nil, opts \\ []) do
    source_path = Path.expand(source_path || default_game_state_path())

    unless File.exists?(source_path) do
      {:error, :not_found}
    else
      {tmp, hash} = Snapshot.copy_and_hash(source_path)

      try do
        case File.read(tmp) |> then(fn {:ok, content} -> Jason.decode(content) end) do
          {:ok, json} when is_map(json) ->
            import_snapshot(json, hash, source_path, opts)

          {:error, reason} ->
            {:error, {:unreadable_json, reason}}
        end
      after
        File.rm(tmp)
      end
    end
  end

  defp import_snapshot(json, hash, source_path, opts) do
    force? = opts[:force] in [true, "yes", "true"]

    recorded_snapshots =
      Repo.all(
        from s in "import_snapshots",
          order_by: [desc: s.id],
          select: %{id: s.id, hash: s.snapshot_sha256, report: s.report}
      )

    matching_snapshot = Enum.find(recorded_snapshots, &(&1.hash == hash))

    cond do
      matching_snapshot != nil and not force? ->
        {:ok, :identical, normalize_report(matching_snapshot.report)}

      length(recorded_snapshots) > 0 and not force? ->
        {:error, :hash_mismatch, %{recorded: hd(recorded_snapshots).hash, hash: hash}}

      true ->
        execute_import(json, hash, source_path, opts)
    end
  end

  defp execute_import(json, hash, source_path, opts) do
    now_ms = System.system_time(:millisecond)

    raw_players = Map.get(json, "players") || %{}
    raw_gardens = Map.get(json, "gardens") || %{}
    raw_orders = Map.get(json, "orders") || []
    raw_trades = Map.get(json, "trades") || []
    raw_multipliers = Map.get(json, "marketMultipliers") || %{}
    raw_nodes = Map.get(json, "nodes") || %{}
    raw_machines = Map.get(json, "machines") || %{}

    # 1. Calculate open orders escrow across the book
    open_sell_escrow = compute_open_sell_escrow(raw_orders)
    open_buy_escrow = compute_open_buy_escrow(raw_orders)

    Repo.transaction(fn ->
      # A. Import Players, Wallets, and Normalized Inventory with Orphan Write-off
      orphan_write_offs =
        import_players_wallets_inventory(raw_players, open_sell_escrow, now_ms)

      # B. Import Gardens, Beds, and Sprinklers
      import_gardens_and_beds(raw_players, raw_gardens, now_ms)

      # C. Import Orders
      import_orders(raw_orders, now_ms)

      # D. Import Trades
      import_trades(raw_trades, now_ms)

      # E. Import Market Multipliers (float8-exact)
      import_market_multipliers(raw_multipliers, now_ms)

      # F. Import Gather Nodes
      import_gather_nodes(raw_nodes, now_ms)

      # G. Import Machines (Mill)
      import_machines(raw_machines, now_ms)

      # H. Validate All Invariants and Generate Report
      case validate_import(json, hash, orphan_write_offs, open_buy_escrow, open_sell_escrow) do
        {:ok, report} ->
          final_report =
            report
            |> Map.put(:source_path, source_path)
            |> Map.put(:freeze_ack, opts[:freeze_ack] in [true, "yes", "true"])

          Repo.insert_all(
            "import_snapshots",
            [
              %{
                snapshot_sha256: hash,
                imported_at: now_ms,
                report: final_report
              }
            ],
            on_conflict: {:replace, [:imported_at, :report]},
            conflict_target: [:snapshot_sha256]
          )

          final_report

        {:error, failures, partial_report} ->
          Repo.rollback({:validation_failed, failures, partial_report})
      end
    end)
    |> case do
      {:ok, report} -> {:ok, :imported, report}
      {:error, {:validation_failed, failures, report}} -> {:error, {:validation_failed, failures, report}}
      {:error, reason} -> {:error, reason}
    end
  end

  # --- Open Orders Escrow Computation ---

  defp compute_open_sell_escrow(orders) do
    Enum.reduce(orders, %{}, fn order, acc ->
      side = order["side"]
      cancelled_at = order["cancelledAt"]
      qty = int(order["quantity"])
      filled = int(order["filled"] || 0)

      if side == "sell" and is_nil(cancelled_at) and filled < qty do
        player_id = order["playerId"]
        crop_id = order["cropId"]
        quality = order["quality"] || "B"
        item_id = "#{crop_id}_#{quality}"
        remaining = qty - filled

        Map.update(acc, {player_id, item_id}, remaining, &(&1 + remaining))
      else
        acc
      end
    end)
  end

  defp compute_open_buy_escrow(orders) do
    Enum.reduce(orders, %{}, fn order, acc ->
      side = order["side"]
      cancelled_at = order["cancelledAt"]
      qty = int(order["quantity"])
      filled = int(order["filled"] || 0)
      price = int(order["price"])

      if side == "buy" and is_nil(cancelled_at) and filled < qty do
        player_id = order["playerId"]
        remaining = qty - filled
        cost = price * remaining

        Map.update(acc, player_id, cost, &(&1 + cost))
      else
        acc
      end
    end)
  end

  # --- A. Players, Wallets, and Inventory ---

  defp import_players_wallets_inventory(raw_players, open_sell_escrow, now_ms) do
    Enum.reduce(raw_players, %{}, fn {player_id, data}, orphan_acc ->
      coins = int(data["coins"] || 0)
      reserved_coins = int(data["reservedCoins"] || 0)
      xp = int(data["xp"] || 0)
      level = max(1, int(data["level"] || 1))
      reputation = int(data["reputation"] || 0)
      nickname = data["nickname"] || player_id
      current_room = data["currentRoom"] || "market"
      last_seen = int(data["lastSeen"] || 0)

      # 1. Upsert player
      Repo.insert_all(
        "players",
        [
          %{
            id: player_id,
            nickname: nickname,
            coins: coins,
            xp: xp,
            level: level,
            reputation: reputation,
            reserved_coins: reserved_coins,
            inventory: data["inventory"] || %{},
            materials: data["materials"] || %{},
            current_room: current_room,
            last_seen: last_seen,
            active: false,
            shadow: false
          }
        ],
        on_conflict:
          {:replace,
           [
             :nickname,
             :coins,
             :xp,
             :level,
             :reputation,
             :reserved_coins,
             :inventory,
             :materials,
             :current_room,
             :last_seen,
             :active,
             :shadow
           ]},
        conflict_target: [:id]
      )

      # 2. Upsert wallet
      Repo.insert_all(
        "wallets",
        [
          %{
            player_id: player_id,
            coins: coins,
            reserved_coins: reserved_coins
          }
        ],
        on_conflict: {:replace, [:coins, :reserved_coins]},
        conflict_target: [:player_id]
      )

      # 3. Initial ledger entries for wallet
      if coins > 0 do
        insert_ledger!(player_id, "import", "coins", nil, coins, now_ms, "import")
      end

      if reserved_coins > 0 do
        insert_ledger!(player_id, "import", "reserved_coins", nil, reserved_coins, now_ms, "import")
      end

      # 4. Normalize Inventory Balances
      Repo.delete_all(from b in "inventory_balances", where: b.player_id == ^player_id)

      inv = data["inventory"] || %{}
      seeds = Map.get(inv, "seeds") || %{}
      produce = Map.get(inv, "produce") || %{}
      reserved_produce = Map.get(inv, "reservedProduce") || %{}
      sprinklers = int(Map.get(inv, "sprinklers") || 0)
      materials = data["materials"] || %{}

      # Seeds
      Enum.each(seeds, fn {crop_id, qty} ->
        q = int(qty)
        if q > 0 do
          insert_inventory_balance!(player_id, "seed", to_string(crop_id), q)
          insert_ledger!(player_id, "import", "seed", to_string(crop_id), q, now_ms, "import")
        end
      end)

      # Produce
      Enum.each(produce, fn {produce_key, qty} ->
        q = int(qty)
        if q > 0 do
          insert_inventory_balance!(player_id, "produce", to_string(produce_key), q)
          insert_ledger!(player_id, "import", "produce", to_string(produce_key), q, now_ms, "import")
        end
      end)

      # Reserved Produce with Orphan Write-off
      player_orphans =
        Enum.reduce(reserved_produce, %{}, fn {produce_key, qty}, p_acc ->
          raw_qty = int(qty)
          open_escrow = Map.get(open_sell_escrow, {player_id, to_string(produce_key)}, 0)
          orphaned = max(0, raw_qty - open_escrow)
          valid_qty = raw_qty - orphaned

          if valid_qty > 0 do
            insert_inventory_balance!(player_id, "reserved_produce", to_string(produce_key), valid_qty)
            insert_ledger!(player_id, "import", "reserved_produce", to_string(produce_key), valid_qty, now_ms, "import")
          end

          if orphaned > 0 do
            insert_ledger!(
              player_id,
              "import",
              "reserved_produce",
              to_string(produce_key),
              -orphaned,
              now_ms,
              "reconciliation:orphaned_reserved_produce"
            )
            Map.put(p_acc, to_string(produce_key), orphaned)
          else
            p_acc
          end
        end)

      # Materials
      Enum.each(materials, fn {mat, qty} ->
        q = int(qty)
        if q > 0 do
          insert_inventory_balance!(player_id, "material", to_string(mat), q)
          insert_ledger!(player_id, "import", "material", to_string(mat), q, now_ms, "import")
        end
      end)

      # Sprinklers fixture
      if sprinklers > 0 do
        insert_inventory_balance!(player_id, "fixture", "sprinklers", sprinklers)
        insert_ledger!(player_id, "import", "fixture", "sprinklers", sprinklers, now_ms, "import")
      end

      if map_size(player_orphans) > 0 do
        Map.put(orphan_acc, player_id, player_orphans)
      else
        orphan_acc
      end
    end)
  end

  defp insert_inventory_balance!(player_id, kind, item_id, quantity) do
    seq = next_seq!()

    Repo.insert_all(
      "inventory_balances",
      [
        %{
          player_id: player_id,
          item_kind: kind,
          item_id: item_id,
          quantity: quantity,
          acquired_seq: seq
        }
      ],
      on_conflict: {:replace, [:quantity]},
      conflict_target: [:player_id, :item_kind, :item_id]
    )
  end

  defp insert_ledger!(player_id, kind, account, item_id, delta, now_ms, command_ref) do
    Repo.insert_all(
      "ledger_entries",
      [
        %{
          player_id: player_id,
          kind: kind,
          account: account,
          item_id: item_id,
          delta: delta,
          trade_id: nil,
          command_ref: command_ref,
          inserted_at: now_ms
        }
      ]
    )
  end

  defp next_seq! do
    %{rows: [[seq]]} = Ecto.Adapters.SQL.query!(Repo, "SELECT nextval('inventory_acquired_seq')")
    seq
  end

  # --- B. Gardens, Beds, Sprinklers ---

  defp import_gardens_and_beds(raw_players, raw_gardens, now_ms) do
    all_player_ids = Map.keys(raw_players)

    Enum.each(all_player_ids, fn player_id ->
      garden_data = Map.get(raw_gardens, player_id)

      Repo.insert_all(
        "gardens",
        [%{player_id: player_id, last_tick: 0, inserted_at: now_ms}],
        on_conflict: :nothing,
        conflict_target: [:player_id]
      )

      beds_list = if garden_data, do: Map.get(garden_data, "beds") || [], else: []
      beds_by_index = Map.new(beds_list, fn b -> {b["index"], b} end)

      for i <- 0..11 do
        bed = Map.get(beds_by_index, i)

        attrs =
          if bed do
            %{
              garden_id: player_id,
              index: i,
              prepared: bed["prepared"] || false,
              crop_id: bed["cropId"],
              planted_at: bed["plantedAt"],
              last_watered_at: bed["lastWateredAt"],
              moisture: float_val(bed["moisture"], 0.0),
              health: float_val(bed["health"], 1.0),
              moisture_history_sum: float_val(bed["moistureHistorySum"], 0.0),
              moisture_checks: float_val(bed["moistureChecks"], 0.0),
              stage: bed["stage"] || 0,
              harvest_count: bed["harvestCount"] || 0
            }
          else
            %{
              garden_id: player_id,
              index: i,
              prepared: false,
              crop_id: nil,
              planted_at: nil,
              last_watered_at: nil,
              moisture: 0.0,
              health: 1.0,
              moisture_history_sum: 0.0,
              moisture_checks: 0.0,
              stage: 0,
              harvest_count: 0
            }
          end

        Repo.insert_all(
          "beds",
          [attrs],
          on_conflict:
            {:replace,
             [
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
             ]},
          conflict_target: [:garden_id, :index]
        )
      end

      if garden_data do
        fixtures = Map.get(garden_data, "fixtures") || []
        Enum.each(fixtures, fn fix ->
          Repo.insert_all(
            "sprinklers",
            [
              %{
                garden_id: player_id,
                bed_index: fix["bedIndex"],
                type: fix["type"] || "sprinkler"
              }
            ],
            on_conflict: {:replace, [:type]},
            conflict_target: [:garden_id, :bed_index]
          )
        end)
      end
    end)
  end

  # --- C. Orders ---

  defp import_orders(raw_orders, now_ms) do
    Enum.each(raw_orders, fn order ->
      Repo.insert_all(
        "orders",
        [
          %{
            id: order["id"],
            player_id: order["playerId"],
            side: order["side"],
            crop_id: order["cropId"],
            quality: order["quality"] || "B",
            price: int(order["price"]),
            quantity: int(order["quantity"]),
            filled: int(order["filled"] || 0),
            created_at: int(order["createdAt"]),
            cancelled_at: if(order["cancelledAt"], do: int(order["cancelledAt"]), else: nil),
            inserted_at: now_ms
          }
        ],
        on_conflict:
          {:replace,
           [:player_id, :side, :crop_id, :quality, :price, :quantity, :filled, :created_at, :cancelled_at]},
        conflict_target: [:id]
      )
    end)
  end

  # --- D. Trades ---

  defp import_trades(raw_trades, now_ms) do
    Enum.each(raw_trades, fn trade ->
      Repo.insert_all(
        "trades",
        [
          %{
            public_id: trade["id"],
            buyer_id: trade["buyerId"],
            seller_id: trade["sellerId"],
            crop_id: trade["cropId"],
            quality: trade["quality"] || "B",
            price: int(trade["price"]),
            quantity: int(trade["quantity"]),
            value: int(trade["value"]),
            fee: max(1, int(trade["fee"] || 1)),
            executed_at: int(trade["executedAt"] || now_ms),
            taker_order_id: trade["takerOrderId"],
            maker_order_id: trade["makerOrderId"]
          }
        ],
        on_conflict:
          {:replace,
           [
             :buyer_id,
             :seller_id,
             :crop_id,
             :quality,
             :price,
             :quantity,
             :value,
             :fee,
             :executed_at,
             :taker_order_id,
             :maker_order_id
           ]},
        conflict_target: [:public_id]
      )
    end)
  end

  # --- E. Market Multipliers ---

  defp import_market_multipliers(raw_multipliers, now_ms) do
    Enum.each(raw_multipliers, fn {item_id, mult} ->
      Repo.insert_all(
        "market_multipliers",
        [
          %{
            item_id: to_string(item_id),
            multiplier: float_val(mult, 1.0),
            updated_at: now_ms
          }
        ],
        on_conflict: {:replace, [:multiplier, :updated_at]},
        conflict_target: [:item_id]
      )
    end)
  end

  # --- F. Gather Nodes ---

  defp import_gather_nodes(raw_nodes, _now_ms) do
    Enum.each(Catalog.material_nodes(), fn n ->
      depleted_at = Map.get(raw_nodes, n.id)

      Repo.insert_all(
        "gather_nodes",
        [
          %{
            node_id: n.id,
            district: n.district,
            material: n.material,
            depleted_at: if(depleted_at, do: int(depleted_at), else: nil),
            respawn_ms: n.respawn_ms
          }
        ],
        on_conflict: {:replace, [:district, :material, :depleted_at, :respawn_ms]},
        conflict_target: [:node_id]
      )
    end)
  end

  # --- G. Machines (Mill) ---

  defp import_machines(raw_machines, _now_ms) do
    mill = Map.get(raw_machines, "mill") || %{}
    status = mill["status"] || "broken"
    restored_at = if mill["restoredAt"], do: int(mill["restoredAt"]), else: nil

    Repo.insert_all(
      "machines",
      [%{machine_id: "mill", status: status, restored_at: restored_at}],
      on_conflict: {:replace, [:status, :restored_at]},
      conflict_target: [:machine_id]
    )

    required = mill["required"] || %{}
    contributed = mill["contributed"] || %{}

    Enum.each(Catalog.mill_requirement(), fn {mat, default_req} ->
      req = int(Map.get(required, mat, default_req))
      contrib = min(req, int(Map.get(contributed, mat, 0)))

      Repo.insert_all(
        "machine_materials",
        [
          %{
            machine_id: "mill",
            material: mat,
            required: req,
            contributed: contrib
          }
        ],
        on_conflict: {:replace, [:required, :contributed]},
        conflict_target: [:machine_id, :material]
      )
    end)
  end

  # --- H. Validation Report (Task 6.2) ---

  def validate_import(json, hash, orphan_write_offs, open_buy_escrow, open_sell_escrow) do
    raw_players = Map.get(json, "players") || %{}
    raw_gardens = Map.get(json, "gardens") || %{}
    raw_orders = Map.get(json, "orders") || []
    raw_trades = Map.get(json, "trades") || []
    raw_nodes = Map.get(json, "nodes") || %{}
    raw_machines = Map.get(json, "machines") || %{}
    mill = Map.get(raw_machines, "mill") || %{}

    failures = []

    # 1. Per-player jsonb -> balance-rows equality
    {player_inv_ok?, failures} =
      Enum.reduce(raw_players, {true, failures}, fn {player_id, pdata}, {ok_acc, err_acc} ->
        inv = pdata["inventory"] || %{}
        file_seeds = strip_zeros(inv["seeds"] || %{})
        file_produce = strip_zeros(inv["produce"] || %{})
        raw_reserved = strip_zeros(inv["reservedProduce"] || %{})
        p_orphans = Map.get(orphan_write_offs, player_id, %{})

        # Reserved produce after orphan write-off
        file_reserved_produce =
          Enum.reduce(raw_reserved, %{}, fn {k, v}, acc ->
            adj = v - Map.get(p_orphans, k, 0)
            if adj > 0, do: Map.put(acc, k, adj), else: acc
          end)

        file_sprinklers = int(inv["sprinklers"] || 0)
        file_materials = strip_zeros(pdata["materials"] || %{})

        # DB balances
        db_inv = Afterlight.EconomyGroup.Inventory.get_map(player_id)

        match? =
          db_inv.seeds == file_seeds and
            db_inv.produce == file_produce and
            db_inv.reserved_produce == file_reserved_produce and
            db_inv.materials == file_materials and
            db_inv.sprinklers == file_sprinklers

        if match? do
          {ok_acc, err_acc}
        else
          {false, ["player #{player_id} inventory balances mismatch" | err_acc]}
        end
      end)

    imported_player_ids = Map.keys(raw_players)

    # 2. File <-> Table Sum Equality
    file_coins_sum = Enum.reduce(raw_players, 0, fn {_, p}, acc -> acc + int(p["coins"] || 0) end)
    table_coins_sum = to_int(Repo.one(from w in "wallets", where: w.player_id in ^imported_player_ids, select: sum(w.coins)))

    file_reserved_coins_sum =
      Enum.reduce(raw_players, 0, fn {_, p}, acc -> acc + int(p["reservedCoins"] || 0) end)

    table_reserved_coins_sum = to_int(Repo.one(from w in "wallets", where: w.player_id in ^imported_player_ids, select: sum(w.reserved_coins)))

    coins_sum_ok? = file_coins_sum == table_coins_sum
    failures = if coins_sum_ok?, do: failures, else: ["coins sum mismatch: file=#{file_coins_sum}, table=#{table_coins_sum}" | failures]

    reserved_coins_ok? = file_reserved_coins_sum == table_reserved_coins_sum
    failures = if reserved_coins_ok?, do: failures, else: ["reserved_coins sum mismatch: file=#{file_reserved_coins_sum}, table=#{table_reserved_coins_sum}" | failures]

    # Inventory sum (after orphan write-off subtraction)
    file_inv_total =
      Enum.reduce(raw_players, 0, fn {player_id, p}, acc ->
        inv = p["inventory"] || %{}
        seeds_sum = Enum.reduce(inv["seeds"] || %{}, 0, fn {_, v}, s -> s + int(v) end)
        produce_sum = Enum.reduce(inv["produce"] || %{}, 0, fn {_, v}, s -> s + int(v) end)
        reserved_sum = Enum.reduce(inv["reservedProduce"] || %{}, 0, fn {_, v}, s -> s + int(v) end)
        orphans_sum =
          Map.get(orphan_write_offs, player_id, %{})
          |> Enum.reduce(0, fn {_, v}, s -> s + int(v) end)

        materials_sum = Enum.reduce(p["materials"] || %{}, 0, fn {_, v}, s -> s + int(v) end)
        sprinklers = int(inv["sprinklers"] || 0)

        acc + seeds_sum + produce_sum + (reserved_sum - orphans_sum) + materials_sum + sprinklers
      end)

    table_inv_total = to_int(Repo.one(from b in "inventory_balances", where: b.player_id in ^imported_player_ids, select: sum(b.quantity)))
    inv_sum_ok? = file_inv_total == table_inv_total
    failures = if inv_sum_ok?, do: failures, else: ["inventory sum mismatch: file=#{file_inv_total}, table=#{table_inv_total}" | failures]

    # 3. Global Conservation: Σ(coins + reserved_coins)
    global_conservation_ok? = (file_coins_sum + file_reserved_coins_sum) == (table_coins_sum + table_reserved_coins_sum)
    failures = if global_conservation_ok?, do: failures, else: ["global conservation failed" | failures]

    # 4. Orders Escrow <-> Reserved Pools Equality
    # Buy side: reserved_coins >= open buy escrow for each player (residue-aware)
    # Sell side: reserved_produce = open sell escrow for each player and produce item
    {orders_escrow_ok?, failures} =
      Enum.reduce(raw_players, {true, failures}, fn {player_id, _}, {ok_acc, err_acc} ->
        wallet = Repo.one!(from w in "wallets", where: w.player_id == ^player_id, select: map(w, [:coins, :reserved_coins]))
        needed_buy = Map.get(open_buy_escrow, player_id, 0)

        buy_ok? = wallet.reserved_coins >= needed_buy

        err_acc =
          if buy_ok? do
            err_acc
          else
            ["player #{player_id} reserved_coins #{wallet.reserved_coins} < needed open buy escrow #{needed_buy}" | err_acc]
          end

        # Check all reserved_produce balances for player match open_sell_escrow
        db_reserved =
          Repo.all(
            from b in "inventory_balances",
              where: b.player_id == ^player_id and b.item_kind == "reserved_produce",
              select: {b.item_id, b.quantity}
          )
          |> Map.new()

        # Compare db_reserved with open_sell_escrow for this player
        expected_sell_for_player =
          open_sell_escrow
          |> Enum.filter(fn {{p, _}, _} -> p == player_id end)
          |> Map.new(fn {{_, item}, q} -> {item, q} end)

        sell_ok? = db_reserved == expected_sell_for_player

        err_acc =
          if sell_ok? do
            err_acc
          else
            ["player #{player_id} reserved_produce #{inspect(db_reserved)} != open sell escrow #{inspect(expected_sell_for_player)}" | err_acc]
          end

        {ok_acc and buy_ok? and sell_ok?, err_acc}
      end)

    # 5. Level copied without recompute
    {level_ok?, failures} =
      Enum.reduce(raw_players, {true, failures}, fn {player_id, pdata}, {ok_acc, err_acc} ->
        file_level = max(1, int(pdata["level"] || 1))
        db_level = Repo.one(from p in "players", where: p.id == ^player_id, select: p.level)

        if db_level == file_level do
          {ok_acc, err_acc}
        else
          {false, ["player #{player_id} level mismatch: db=#{db_level}, file=#{file_level}" | err_acc]}
        end
      end)

    # 6. Players <-> Wallets Agreement (shadow agreement)
    {pw_agreement_ok?, failures} =
      Enum.reduce(raw_players, {true, failures}, fn {player_id, _}, {ok_acc, err_acc} ->
        p_row = Repo.one(from p in "players", where: p.id == ^player_id, select: map(p, [:coins, :reserved_coins]))
        w_row = Repo.one(from w in "wallets", where: w.player_id == ^player_id, select: map(w, [:coins, :reserved_coins]))

        if p_row.coins == w_row.coins and p_row.reserved_coins == w_row.reserved_coins do
          {ok_acc, err_acc}
        else
          {false, ["player #{player_id} players-wallets mismatch: player=#{inspect(p_row)}, wallet=#{inspect(w_row)}" | err_acc]}
        end
      end)

    # 7. Mill and Node State Equality
    mill_db = Repo.one(from m in "machines", where: m.machine_id == "mill", select: map(m, [:status, :restored_at]))
    mill_status_ok? = mill_db != nil and mill_db.status == (mill["status"] || "broken")
    failures = if mill_status_ok?, do: failures, else: ["mill status mismatch" | failures]

    nodes_ok? =
      Enum.all?(Catalog.material_nodes(), fn n ->
        file_dep = Map.get(raw_nodes, n.id)
        db_dep = Repo.one(from gn in "gather_nodes", where: gn.node_id == ^n.id, select: gn.depleted_at)
        (file_dep == nil and db_dep == nil) or (file_dep != nil and db_dep == int(file_dep))
      end)
    failures = if nodes_ok?, do: failures, else: ["gather nodes state mismatch" | failures]

    # 8. Counts Match
    db_players_count = Repo.one(from p in "players", where: p.id in ^imported_player_ids, select: count(p.id))
    players_count_ok? = map_size(raw_players) == db_players_count

    order_ids = Enum.map(raw_orders, & &1["id"])
    db_orders_count = Repo.one(from o in "orders", where: o.id in ^order_ids, select: count(o.id))
    orders_count_ok? = length(raw_orders) == db_orders_count

    trade_ids = Enum.map(raw_trades, & &1["id"])
    db_trades_count = Repo.one(from t in "trades", where: t.public_id in ^trade_ids, select: count(t.id))
    trades_count_ok? = length(raw_trades) == db_trades_count

    failures = if players_count_ok?, do: failures, else: ["players count mismatch" | failures]
    failures = if orders_count_ok?, do: failures, else: ["orders count mismatch" | failures]
    failures = if trades_count_ok?, do: failures, else: ["trades count mismatch" | failures]

    report = %{
      snapshot_sha256: hash,
      counts: %{
        players: map_size(raw_players),
        gardens: map_size(raw_gardens),
        orders: length(raw_orders),
        trades: length(raw_trades),
        nodes: length(Catalog.material_nodes()),
        inventory_rows: Repo.aggregate("inventory_balances", :count)
      },
      sums: %{
        coins: table_coins_sum,
        reserved_coins: table_reserved_coins_sum,
        inventory: table_inv_total
      },
      orphan_write_offs: orphan_write_offs,
      validations: %{
        per_player_equality: player_inv_ok?,
        coins_sum_equality: coins_sum_ok?,
        reserved_coins_sum_equality: reserved_coins_ok?,
        inventory_sum_equality: inv_sum_ok?,
        orders_escrow_equality: orders_escrow_ok?,
        level_copied_without_recompute: level_ok?,
        global_conservation: global_conservation_ok?,
        players_wallets_agreement: pw_agreement_ok?,
        mill_equality: mill_status_ok?,
        node_state_equality: nodes_ok?,
        counts_match: players_count_ok? and orders_count_ok? and trades_count_ok?
      }
    }

    if failures == [] do
      {:ok, report}
    else
      {:error, failures, report}
    end
  end

  # --- Numeric Helpers ---

  defp int(v) when is_integer(v), do: v
  defp int(v) when is_float(v), do: trunc(v)
  defp int(v) when is_binary(v) do
    case Integer.parse(v) do
      {n, _} -> n
      _ -> 0
    end
  end
  defp int(_), do: 0

  defp to_int(%Decimal{} = d), do: Decimal.to_integer(d)
  defp to_int(n) when is_integer(n), do: n
  defp to_int(_), do: 0

  defp float_val(v, default \\ 0.0)
  defp float_val(v, _default) when is_float(v), do: v
  defp float_val(v, _default) when is_integer(v), do: v * 1.0
  defp float_val(v, default) when is_binary(v) do
    case Float.parse(v) do
      {f, _} -> f
      _ -> default
    end
  end
  defp float_val(_, default), do: default

  defp strip_zeros(map) when is_map(map) do
    Enum.reduce(map, %{}, fn {k, v}, acc ->
      n = int(v)
      if n > 0, do: Map.put(acc, to_string(k), n), else: acc
    end)
  end
  defp strip_zeros(_), do: %{}

  defp normalize_report(report) when is_map(report) do
    %{
      snapshot_sha256: report[:snapshot_sha256] || report["snapshot_sha256"],
      imported_at: report[:imported_at] || report["imported_at"],
      source_path: report[:source_path] || report["source_path"],
      freeze_ack: report[:freeze_ack] || report["freeze_ack"],
      counts: atomize_map(report[:counts] || report["counts"] || %{}),
      sums: atomize_map(report[:sums] || report["sums"] || %{}),
      orphan_write_offs: report[:orphan_write_offs] || report["orphan_write_offs"] || %{},
      validations: atomize_map(report[:validations] || report["validations"] || %{})
    }
  end

  defp atomize_map(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_binary(k) -> {String.to_atom(k), v}
      {k, v} -> {k, v}
    end)
  end
  defp atomize_map(other), do: other
end
