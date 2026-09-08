defmodule Afterlight.EconomyGroup.Gateway do
  @moduledoc """
  Phoenix gateway handlers for gardens, economy, and restoration commands.
  """

  alias Afterlight.Accounts.Actor
  alias Afterlight.Economy
  alias Afterlight.EconomyGroup.OutboxRelay
  alias Afterlight.Gardens
  alias Afterlight.Parity.Catalog
  alias Afterlight.Protocol.Payloads
  alias Afterlight.Restoration

  @garden_room_prefix "garden:"

  @spec handle(String.t(), map(), map()) :: {:ok, [{String.t(), map()}]} | {:error, {String.t(), map()}}
  def handle(type, payload, ctx) when is_binary(type) and is_map(payload) and is_map(ctx) do
    player_id = ctx[:guest_id] || ctx["guest_id"]
    actor = Actor.session(player_id, nil)

    case gate_room(type, player_id, ctx) do
      :ok -> do_handle(type, payload, actor)
      {:reject, replies} -> {:ok, replies}
      {:error, reply} -> {:error, reply}
    end
  end

  defp do_handle("garden_action", payload, actor) do
    request_id = request_id(payload)
    action = payload["action"] || payload[:action]
    bed_index = payload["bedIndex"] || payload[:bedIndex]
    seed_crop_id = payload["seedCropId"] || payload[:seedCropId]

    result =
      case action do
        "till" -> Gardens.till_bed(actor, request_id, bed_index)
        "plant" -> Gardens.plant_bed(actor, request_id, bed_index, seed_crop_id)
        "water" -> Gardens.water_bed(actor, request_id, bed_index)
        "harvest" -> Gardens.harvest_bed(actor, request_id, bed_index)
        "place_sprinkler" -> Gardens.place_sprinkler(actor, request_id, bed_index)
        _ -> {:error, "invalid_action"}
      end

    finalize(actor.player_id, result, request_id, &map_garden_result/2)
  end

  defp do_handle("market_buy", payload, actor) do
    request_id = request_id(payload)
    crop_id = payload["cropId"] || payload[:cropId]
    quantity = payload["quantity"] || payload[:quantity]

    result = Economy.npc_buy(actor, request_id, crop_id, quantity)
    finalize(actor.player_id, result, request_id, fn _id, _ -> [] end)
  end

  defp do_handle("market_sell", payload, actor) do
    request_id = request_id(payload)
    crop_id = payload["cropId"] || payload[:cropId]
    quality = payload["quality"] || payload[:quality] || "B"
    quantity = payload["quantity"] || payload[:quantity]

    result = Economy.npc_sell(actor, request_id, crop_id, quality, quantity)
    finalize(actor.player_id, result, request_id, fn _id, _ -> [] end)
  end

  defp do_handle("order_place", payload, actor) do
    request_id = payload["orderId"] || payload[:orderId] || request_id(payload)
    params = Map.put(payload, "orderId", request_id)

    result = Economy.place_order(actor, request_id, params)
    finalize(actor.player_id, result, request_id, fn _id, _ -> [] end)
  end

  defp do_handle("order_cancel", payload, actor) do
    request_id = request_id(payload)
    order_id = payload["orderId"] || payload[:orderId]

    result = Economy.cancel_order(actor, request_id, order_id)
    finalize(actor.player_id, result, request_id, fn _id, _ -> [] end)
  end

  defp do_handle("contract_complete", payload, actor) do
    request_id = request_id(payload)
    contract_id = payload["contractId"] || payload[:contractId]

    result = Economy.complete_contract(actor, request_id, contract_id)
    finalize(actor.player_id, result, request_id, fn _id, _ -> [] end)
  end

  defp do_handle("node_harvest", payload, actor) do
    request_id = request_id(payload)
    node_id = payload["nodeId"] || payload[:nodeId]
    room = payload["currentRoom"] || payload[:currentRoom]

    result = Restoration.gather(actor, request_id, node_id, room)
    finalize(actor.player_id, result, request_id, &map_gather_result/2)
  end

  defp do_handle("machine_contribute", payload, actor) do
    request_id = request_id(payload)
    material = payload["material"] || payload[:material]
    quantity = payload["quantity"] || payload[:quantity] || 1

    result = Restoration.contribute_to_machine(actor, request_id, material, quantity)
    finalize(actor.player_id, result, request_id, &map_contribute_result/2)
  end

  defp do_handle("machine_mill", payload, actor) do
    request_id = request_id(payload)
    quantity = payload["quantity"] || payload[:quantity] || 1

    result = Restoration.mill_wheat(actor, request_id, quantity)
    finalize(actor.player_id, result, request_id, &map_mill_result/2)
  end

  defp do_handle("machine_craft", payload, actor) do
    request_id = request_id(payload)
    fixture = payload["fixture"] || payload[:fixture] || "sprinkler"

    result =
      if fixture == "sprinkler" do
        Restoration.craft_sprinkler(actor, request_id)
      else
        {:error, :unknown_fixture}
      end

    finalize(actor.player_id, result, request_id, fn _id, result ->
      case result do
        %{} = map when map != %{} -> [action_result(map)]
        _ -> []
      end
    end)
  end

  defp do_handle(_type, _payload, _actor), do: {:error, {"error", %{"message" => "unrouted"}}}

  defp finalize(player_id, result, request_id, mapper) do
    case result do
      {:ok, {:applied, value}} ->
        replies = mapper.(request_id, value) ++ outbox_replies(player_id)
        {:ok, replies}

      {:ok, {:replay, %{"result" => replay}}} ->
        replies =
          case replay do
            %{} = map -> [action_result(replay_action(map, request_id))]
            _ -> []
          end

        {:ok, replies}

      {:error, :idempotency_conflict} ->
        {:error, {"error", %{"message" => "idempotency_conflict"}}}

      {:error, %{reason: "node_depleted"} = err} ->
        {:ok, [failed_action(request_id, gather_depleted_message(), title: "Gathered")]}

      {:error, reason} when is_map(reason) ->
        {:ok, [failed_action(request_id, to_string(reason[:reason] || reason["reason"] || "Action failed"))]}

      {:error, reason} when is_binary(reason) ->
        {:ok, [failed_action(request_id, reason)]}

      {:error, reason} when is_atom(reason) ->
        case command_error(reason, request_id) do
          {:action, frame} -> {:ok, [frame]}
          {:error, frame} -> {:error, frame}
        end
    end
  end

  defp outbox_replies(player_id) do
    player_frames =
      player_id
      |> OutboxRelay.flush_player()
      |> Enum.map(&frame_tuple/1)

    market_frames =
      OutboxRelay.flush_market()
      |> Enum.map(&frame_tuple/1)

    player_frames ++ market_frames
  end

  defp frame_tuple({event, payload}), do: {event, stringify(payload)}

  defp map_garden_result(request_id, result) when is_map(result) do
    [action_result(Map.put(result, :actionId, request_id))]
  end

  defp map_garden_result(request_id, _), do: [action_ok(request_id)]

  defp map_gather_result(request_id, result) when is_map(result) do
    [action_result(Map.put(result, :actionId, request_id))]
  end

  defp map_gather_result(request_id, _), do: [action_ok(request_id, title: "Gathered")]

  defp map_contribute_result(request_id, %{applied: applied, restored: restored} = res) do
    mat_name =
      case Map.get(res, :material) do
        "copper" -> "Copper Scrap"
        "timber" -> "Trestle Timber"
        "glass" -> "Glass Shards"
        _ -> "Material"
      end

    message =
      if restored do
        "The Great Mill turns for the first time in years! #{mat_name} accepted: #{applied}."
      else
        "#{mat_name} accepted: #{applied}. The mill takes shape."
      end

    [action_ok(request_id, title: "The Great Mill", message: message)]
  end

  defp map_contribute_result(request_id, _), do: [action_ok(request_id, title: "The Great Mill")]

  defp map_mill_result(request_id, %{milled: milled}) do
    good = Catalog.good("flour")

    [
      action_ok(
        request_id,
        title: "The Great Mill",
        message: "Ground #{milled}x wheat into #{milled}x #{good.name}."
      )
    ]
  end

  defp map_mill_result(request_id, _), do: [action_ok(request_id, title: "The Great Mill")]

  defp command_error(:mill_already_restored, request_id),
    do: {:action, failed_action(request_id, "The mill is already restored.", title: "The Great Mill")}

  defp command_error(:material_not_needed, request_id),
    do: {:action, failed_action(request_id, "The mill has no use for that.", title: "The Great Mill")}

  defp command_error(:material_fulfilled, request_id),
    do: {:action, failed_action(request_id, "That material is fully contributed.", title: "The Great Mill")}

  defp command_error(:insufficient_materials, request_id),
    do: {:action, failed_action(request_id, "You are not carrying any of that.", title: "The Great Mill")}

  defp command_error(:mill_broken, request_id),
    do: {:action, failed_action(request_id, "The mill is still broken. It needs materials first.", title: "The Great Mill")}

  defp command_error(:no_wheat, request_id),
    do: {:action, failed_action(request_id, "You have no wheat to mill.", title: "The Great Mill")}

  defp command_error(:unknown_node, request_id),
    do: {:action, failed_action(request_id, "Nothing to gather here.", title: "Gathered")}

  defp command_error(:unknown_fixture, request_id),
    do: {:action, failed_action(request_id, "That cannot be crafted here.", title: "Machine Shop")}

  defp command_error(:insufficient_coins, _request_id),
    do: {:error, {"error", %{"message" => "insufficient_coins"}}}

  defp command_error(:insufficient_balance, _request_id),
    do: {:error, {"error", %{"message" => "insufficient_produce"}}}

  defp command_error(:invalid_order_params, _request_id),
    do: {:error, {"error", %{"message" => "invalid_order_params"}}}

  defp command_error(:contract_not_found, _request_id),
    do: {:error, {"error", %{"message" => "contract_not_found"}}}

  defp command_error(:not_found, _request_id),
    do: {:error, {"error", %{"message" => "not_found"}}}

  defp command_error(reason, _request_id),
    do: {:error, {"error", %{"message" => to_string(reason)}}}

  defp gate_room("garden_action", player_id, ctx) do
    expected = @garden_room_prefix <> player_id

    case room_wire(ctx) do
      ^expected -> :ok
      _ -> {:reject, [failed_action("", "You can only cultivate your own garden.")]}
    end
  end

  defp gate_room("node_harvest", _player_id, ctx) do
    if is_binary(room_wire(ctx)), do: :ok, else: room_gate_error()
  end

  defp gate_room(type, _player_id, ctx) when type in ~w(machine_contribute machine_mill machine_craft) do
    if room_wire(ctx) == "market", do: :ok, else: room_gate_error()
  end

  defp gate_room(_type, _player_id, _ctx), do: :ok

  defp room_gate_error, do: {:error, {"error", %{"message" => "room_unavailable"}}}

  defp room_wire(ctx) do
    case ctx[:world_room] || ctx["world_room"] do
      %{wire_id: wire} -> wire
      %{"wire_id" => wire} -> wire
      _ -> nil
    end
  end

  defp request_id(payload) do
    to_string(payload["actionId"] || payload[:actionId] || payload["orderId"] || payload[:orderId] || "")
  end

  defp action_ok(request_id, opts \\ []) do
    {"action_result",
     stringify(
       Payloads.action_result(
         actionId: request_id,
         success: true,
         title: Keyword.get(opts, :title, "Action complete"),
         message: Keyword.get(opts, :message, "Action complete")
       )
     )}
  end

  defp action_result(map) do
    {"action_result", stringify(map)}
  end

  defp failed_action(request_id, message, opts \\ []) do
    {"action_result",
     failed_action_payload(request_id, message, Keyword.get(opts, :title, "Action failed"))}
  end

  defp failed_action_payload(request_id, message, title \\ "Action failed") do
    stringify(%{actionId: request_id, success: false, title: title, message: message})
  end

  defp replay_action(%{"ok" => true, "result" => result}, request_id) when is_map(result) do
    stringify(Map.put(result, "actionId", request_id))
  end

  defp replay_action(_other, request_id), do: failed_action_payload(request_id, "Action failed")

  defp gather_depleted_message, do: "This cache is picked clean. It needs time to regrow."

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_map(v) -> {to_string(k), stringify(v)}
      {k, v} when is_list(v) -> {to_string(k), Enum.map(v, &stringify/1)}
      {k, v} -> {to_string(k), v}
    end)
  end

  defp stringify(other), do: other
end
