defmodule Afterlight.Activities.Challenges do
  @moduledoc """
  Room-local direct challenges: named invite, explicit accept/decline,
  30-second expiry, one pending invite per sender, three invites per
  minute, block/mute. Acceptance never joins, seats, or travels.
  """

  use GenServer

  @expiry_ms 30_000
  @rate_window_ms 60_000
  @max_per_minute 3

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: Keyword.get(opts, :name, __MODULE__))
  end

  def invite(server \\ __MODULE__, attrs), do: GenServer.call(server, {:invite, attrs})
  def respond(server \\ __MODULE__, attrs), do: GenServer.call(server, {:respond, attrs})
  def set_muted(server \\ __MODULE__, player_id, muted?),
    do: GenServer.call(server, {:mute, player_id, muted?})
  def set_blocked(server \\ __MODULE__, blocker_id, target_id, blocked?),
    do: GenServer.call(server, {:block, blocker_id, target_id, blocked?})
  def get(server \\ __MODULE__, invite_id), do: GenServer.call(server, {:get, invite_id})

  @impl true
  def init(_opts) do
    {:ok,
     %{
       invites: %{},
       pending_by_sender: %{},
       sends: %{},
       blocks: MapSet.new(),
       mutes: MapSet.new()
     }}
  end

  @impl true
  def handle_call({:invite, attrs}, _from, state) do
    sender = attrs[:sender_id]
    target = attrs[:target_id]
    activity_id = attrs[:activity_id]
    now = attrs[:now] || System.system_time(:millisecond)

    cond do
      not is_binary(sender) or not is_binary(target) or sender == target ->
        {:reply, {:error, :invalid_request}, state}

      not is_binary(activity_id) or activity_id == "" ->
        {:reply, {:error, :invalid_request}, state}

      MapSet.member?(state.blocks, {target, sender}) ->
        {:reply, {:error, :not_delivered}, state}

      MapSet.member?(state.mutes, target) ->
        {:reply, {:error, :not_delivered}, state}

      Map.has_key?(state.pending_by_sender, sender) ->
        {:reply, {:error, :pending_invite}, state}

      not allow_send?(state.sends, sender, now) ->
        {:reply, {:error, :rate_limited}, state}

      true ->
        invite_id = "chal_" <> Base.encode16(:crypto.strong_rand_bytes(8), case: :lower)
        expires_at = now + @expiry_ms
        timer = Process.send_after(self(), {:expire, invite_id}, @expiry_ms)

        invite = %{
          id: invite_id,
          sender_id: sender,
          sender_name: attrs[:sender_name] || sender,
          target_id: target,
          target_name: attrs[:target_name] || target,
          activity_id: activity_id,
          room_id: attrs[:room_id],
          sender_channel: attrs[:sender_channel],
          target_channel: attrs[:target_channel],
          status: :pending,
          created_at: now,
          expires_at: expires_at,
          timer_ref: timer
        }

        state = %{
          state
          | invites: Map.put(state.invites, invite_id, invite),
            pending_by_sender: Map.put(state.pending_by_sender, sender, invite_id),
            sends: record_send(state.sends, sender, now)
        }

        deliver_target(invite)
        {:reply, {:ok, public_invite(invite)}, state}
    end
  end

  def handle_call({:respond, attrs}, _from, state) do
    invite_id = attrs[:invite_id]
    actor = attrs[:actor_id]
    accept? = attrs[:accept] == true
    now = attrs[:now] || System.system_time(:millisecond)
    availability = attrs[:availability] || %{}

    case Map.get(state.invites, invite_id) do
      nil ->
        {:reply, {:error, :challenge_not_found}, state}

      %{target_id: target} when target != actor ->
        {:reply, {:error, :unauthorized}, state}

      %{status: status} when status != :pending ->
        {:reply, {:error, :challenge_not_found}, state}

      invite ->
        if now >= invite.expires_at do
          {invite, state} = finish(state, invite, :expired)
          notify_both(invite, %{"status" => "expired"})
          {:reply, {:error, :challenge_expired}, state}
        else
          if invite[:timer_ref], do: Process.cancel_timer(invite.timer_ref)

          if accept? do
            if availability[:available] == true do
              {invite, state} = finish(state, invite, :accepted)

              payload = %{
                "status" => "accepted",
                "inviteId" => invite.id,
                "activityId" => invite.activity_id,
                "roomId" => invite.room_id,
                "highlight" => true,
                "teleport" => false,
                "autoSeat" => false
              }

              notify_both(invite, payload)
              {:reply, {:ok, payload}, state}
            else
              {invite, state} = finish(state, invite, :stale)

              payload = %{
                "status" => "stale",
                "inviteId" => invite.id,
                "activityId" => invite.activity_id,
                "roomId" => invite.room_id,
                "highlight" => false,
                "teleport" => false,
                "autoSeat" => false,
                "availability" => %{
                  "playing" => availability[:playing],
                  "watching" => availability[:watching],
                  "queued" => availability[:queued],
                  "canWatch" => Map.get(availability, :can_watch, true),
                  "canQueue" => Map.get(availability, :can_queue, true)
                }
              }

              notify_both(invite, payload)
              {:reply, {:ok, payload}, state}
            end
          else
            {invite, state} = finish(state, invite, :declined)
            payload = %{"status" => "declined", "inviteId" => invite.id, "activityId" => invite.activity_id}
            notify_sender(invite, payload)
            {:reply, {:ok, payload}, state}
          end
        end
    end
  end

  def handle_call({:mute, player_id, muted?}, _from, state) when is_binary(player_id) do
    mutes =
      if muted? do
        MapSet.put(state.mutes, player_id)
      else
        MapSet.delete(state.mutes, player_id)
      end

    {:reply, :ok, %{state | mutes: mutes}}
  end

  def handle_call({:block, blocker_id, target_id, blocked?}, _from, state)
      when is_binary(blocker_id) and is_binary(target_id) do
    blocks =
      if blocked? do
        MapSet.put(state.blocks, {blocker_id, target_id})
      else
        MapSet.delete(state.blocks, {blocker_id, target_id})
      end

    {:reply, :ok, %{state | blocks: blocks}}
  end

  def handle_call({:get, invite_id}, _from, state) do
    {:reply, Map.get(state.invites, invite_id), state}
  end

  def handle_call(_other, _from, state), do: {:reply, {:error, :invalid_request}, state}

  @impl true
  def handle_info({:expire, invite_id}, state) do
    case Map.get(state.invites, invite_id) do
      %{status: :pending} = invite ->
        {invite, state} = finish(state, invite, :expired)
        notify_both(invite, %{"status" => "expired", "inviteId" => invite.id})
        {:noreply, state}

      _ ->
        {:noreply, state}
    end
  end

  def handle_info(_other, state), do: {:noreply, state}

  defp allow_send?(sends, sender, now) do
    recent = Enum.filter(Map.get(sends, sender, []), fn t -> now - t < @rate_window_ms end)
    length(recent) < @max_per_minute
  end

  defp record_send(sends, sender, now) do
    recent = Enum.filter(Map.get(sends, sender, []), fn t -> now - t < @rate_window_ms end)
    Map.put(sends, sender, [now | recent])
  end

  defp finish(state, invite, status) do
    invite = %{invite | status: status, timer_ref: nil}

    state = %{
      state
      | invites: Map.put(state.invites, invite.id, invite),
        pending_by_sender: Map.delete(state.pending_by_sender, invite.sender_id)
    }

    {invite, state}
  end

  defp public_invite(invite) do
    %{
      "inviteId" => invite.id,
      "senderId" => invite.sender_id,
      "senderName" => invite.sender_name,
      "targetId" => invite.target_id,
      "activityId" => invite.activity_id,
      "roomId" => invite.room_id,
      "expiresAt" => invite.expires_at,
      "status" => "pending"
    }
  end

  defp deliver_target(invite) do
    push(invite.target_channel, "activity_challenge", public_invite(invite))
  end

  defp notify_both(invite, payload) do
    notify_sender(invite, payload)
    push(invite.target_channel, "activity_challenge_result", payload)
  end

  defp notify_sender(invite, payload) do
    push(invite.sender_channel, "activity_challenge_result", payload)
  end

  defp push(pid, event, payload) when is_pid(pid) do
    if Process.alive?(pid), do: send(pid, {:challenge_frame, event, payload})
    :ok
  end

  defp push(_, _, _), do: :ok
end
