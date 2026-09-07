defmodule Afterlight.World.RoomServer do
  @moduledoc """
  One supervised owner per active room (design D2/D3) — the single writer
  of that room's transient world state: roster, poses, emote cooldowns.

  Bounded-state rules (design D3):

    * no selective receive — movement arrives as ordinary casts that
      mutate the member's pose in place, so the mailbox drains at frame
      rate and only the NEWEST pose per actor survives between ticks
      (coalescing by overwrite);
    * a 100 ms tick (config `flush_interval_ms`) broadcasts one FULL
      roster `presence_update` to the room's channels only when the room
      is dirty — no delta encoding;
    * per-transport outbound is bounded (config `outbound_queue_max`): a
      member whose channel process mailbox exceeds the bound is treated as
      a stalled consumer — the runtime tells the channel to close its
      transport with a retryable reason (`room_stalled`) and removes the
      member (the client resnapshots via desiredRoom replay), instead of
      queueing unbounded frames;
    * a room empty beyond the configured grace (`empty_room_grace_ms`,
      default 60 s) stops quietly; a later join starts a fresh room —
      matching today's observable behavior where an empty room's
      membership vanishes. Rooms hibernate on idle ticks.

  Membership is a bespoke roster map — the single membership truth (D5).
  Phoenix Presence is deliberately NOT adopted in P3; if adopted later
  (multi-node coarse membership, P9) it must carry coarse membership only,
  never 10 Hz positions.

  Members are keyed by `player_id` with a per-connection `conn_ref`
  (design D8, duplicate-connect newest-wins): a second transport for the
  same identity replaces the roster entry's connection in place — the
  player never leaves the roster — and a stale connection's late
  leave/crash cannot evict the survivor (Node's overwrite-then-evict
  ghost quirk is structurally impossible here).

  Crash containment (design D9/D9-recovery): the DynamicSupervisor
  restarts a crashed room with empty transient state; member channels
  monitor this process and resnapshot (close + desiredRoom replay) on any
  DOWN. Nothing durable is read or written; the only loss is poses.
  """

  # :transient — a crashed room restarts (empty, members resnapshot);
  # a graceful empty-room stop (:shutdown) stays stopped. (:permanent
  # would resurrect even graceful stops forever.)
  use GenServer, restart: :transient

  alias Afterlight.World
  alias Afterlight.World.{Emotes, Frames, Movement}

  defstruct [
    :room,
    :timer,
    :empty_since,
    :started_at,
    members: %{},
    order: [],
    dirty: false,
    received: 0,
    tick_count: 0,
    cooldowns: %{}
  ]

  ## Client API

  @doc """
  Joins a member. `attrs`:
  `%{player_id, conn_ref, channel_pid, nickname, pose}` where `pose` is a
  `Movement.t()` (the newest transport's last-known pose; defaults to the
  client's effective origin pose).

  Returns `{:ok, roster_frame}` where the roster is the joiner-targeted
  `presence_update` (existing members, join order, joiner excluded) —
  sent by the CALLER before the Node shadow forward, preserving the
  documented `join_room` → roster → snapshots ordering (design D6).
  Duplicate joins are a presence no-op that still return the roster;
  supersession replaces the connection in place with no presence churn.
  """
  def join(room_pid, attrs) do
    GenServer.call(room_pid, {:join, attrs})
  end

  @doc """
  Leaves the room. Only the member whose `conn_ref` matches is removed
  (design D8) — a stale connection's leave cannot evict the survivor.
  Broadcasts one `presence_leave` to the remaining members.
  """
  def leave(room_pid, player_id, conn_ref, reason) do
    GenServer.call(room_pid, {:leave, player_id, conn_ref, reason})
  end

  @doc "Validated movement write (cast; ordered per sender). Invalid or stale writes are dropped."
  def movement(room_pid, player_id, conn_ref, payload) do
    GenServer.cast(room_pid, {:movement, player_id, conn_ref, payload})
  end

  @doc "Emote (cast): allow-list + 500 ms per-connection cooldown; rejected silently."
  def emote(room_pid, player_id, conn_ref, emote) do
    GenServer.cast(room_pid, {:emote, player_id, conn_ref, emote})
  end

  @doc "Nickname refresh (cast) so rosters and `emote_broadcast` read live, as Node does."
  def update_nickname(room_pid, player_id, nickname) do
    GenServer.cast(room_pid, {:update_nickname, player_id, nickname})
  end

  @doc "Live membership check for a specific connection (the durable-command gate)."
  def member?(room_pid, player_id, conn_ref) do
    GenServer.call(room_pid, {:member?, player_id, conn_ref})
  end

  @doc """
  Drops the member whose channel process is `member_pid` — the explicit
  channel-down sweep behind `World.Rooms.leave_all/2` (task 6.1). No-op
  when no member's channel matches; idempotent with the DOWN monitor, so
  exactly one `presence_leave` fires per transition.
  """
  def leave_for_member(room_pid, member_pid, reason \\ :disconnect) do
    GenServer.call(room_pid, {:leave_for_member, member_pid, reason})
  end

  @doc false
  def start_link(room) do
    GenServer.start_link(__MODULE__, room, name: via(room.wire_id))
  end

  defp via(wire_id), do: {:via, Registry, {Afterlight.World.Registry, {__MODULE__, wire_id}}}

  ## Callbacks

  @impl true
  def init(room) do
    state = %__MODULE__{
      room: room,
      started_at: System.system_time(:millisecond),
      timer: Process.send_after(self(), :tick, tick_interval())
    }

    {:ok, state}
  end

  @impl true
  def handle_call({:join, attrs}, _from, state) do
    player_id = attrs.player_id
    conn_ref = attrs.conn_ref
    member = Map.get(state.members, player_id)

    {state, roster} =
      cond do
        member != nil and member.conn_ref == conn_ref ->
          # Duplicate join for the current room: presence no-op for the
          # room, roster still returned (Node re-join semantics).
          {state, roster_frame(state, player_id)}

        member != nil ->
          # Supersession (design D8): newest connection wins in place —
          # no presence_leave, no presence_join, the player never leaves
          # the roster. The new transport's pose/nickname are adopted and
          # the old transport's monitor is dropped.
          Process.demonitor(member.monitor, [:flush])

          member =
            member
            |> Map.put(:conn_ref, conn_ref)
            |> Map.put(:channel_pid, attrs.channel_pid)
            |> Map.put(:monitor, monitor_member(attrs.channel_pid))
            |> Map.put(:nickname, attrs.nickname)
            |> Map.put(:pose, attrs.pose)

          state = put_member(state, member)
          {state, roster_frame(state, player_id)}

        true ->
          member = %{
            player_id: player_id,
            conn_ref: conn_ref,
            channel_pid: attrs.channel_pid,
            monitor: monitor_member(attrs.channel_pid),
            nickname: attrs.nickname,
            pose: attrs.pose,
            joined_seq: next_seq(state)
          }

          # presence_join to the room, joiner excluded.
          frame = Frames.presence_join(member)

          Enum.each(state.order, fn pid_id ->
            other = Map.get(state.members, pid_id)
            send_frame(other.channel_pid, frame)
          end)

          telemetry([:afterlight, :room, :join], %{roster_size: map_size(state.members)}, %{
            room: state.room.wire_id,
            player: player_id
          })

          state = put_member(state, member)
          {state, roster_frame(state, player_id)}
      end

    {:reply, {:ok, roster}, state}
  end

  def handle_call({:leave, player_id, conn_ref, reason}, _from, state) do
    {:reply, :ok, do_leave(state, player_id, conn_ref, reason)}
  end

  def handle_call({:member?, player_id, conn_ref}, _from, state) do
    member = Map.get(state.members, player_id)
    {:reply, member != nil and member.conn_ref == conn_ref, state}
  end

  def handle_call({:leave_for_member, member_pid, reason}, _from, state) do
    case Enum.find(state.members, fn {_id, m} -> m.channel_pid == member_pid end) do
      nil ->
        {:reply, :ok, state}

      {player_id, member} ->
        {:reply, :ok, do_leave(state, player_id, member.conn_ref, reason)}
    end
  end

  @impl true
  def handle_cast({:movement, player_id, conn_ref, payload}, state) do
    member = Map.get(state.members, player_id)

    if member != nil and member.conn_ref == conn_ref do
      case Movement.validate(payload) do
        {:ok, pose} ->
          member = Map.put(member, :pose, pose)

          state =
            state
            |> put_member(member)
            |> Map.put(:dirty, true)
            |> Map.update!(:received, &(&1 + 1))

          {:noreply, state}

        :invalid ->
          # Non-finite input is dropped; the actor's last valid pose stands.
          {:noreply, state}
      end
    else
      {:noreply, state}
    end
  end

  def handle_cast({:emote, player_id, conn_ref, emote}, state) do
    member = Map.get(state.members, player_id)
    now = System.system_time(:millisecond)

    cond do
      member == nil or member.conn_ref != conn_ref ->
        {:noreply, state}

      not Emotes.valid?(emote) ->
        {:noreply, state}

      now - Map.get(state.cooldowns, conn_ref, 0) < World.config(:emote_cooldown_ms, Emotes.cooldown_ms()) ->
        {:noreply, state}

      true ->
        frame = Frames.emote_broadcast(player_id, live_nickname(member), emote)

        Enum.each(members_in_order(state), fn m ->
          send_frame(m.channel_pid, frame)
        end)

        {:noreply, %{state | cooldowns: Map.put(state.cooldowns, conn_ref, now)}}
    end
  end

  def handle_cast({:update_nickname, player_id, nickname}, state) do
    case Map.get(state.members, player_id) do
      nil ->
        {:noreply, state}

      member ->
        # Rosters and emote broadcasts read the entry live at emit time
        # (Node reads session.player.nickname live), so a rename is
        # visible to later joiners without a broadcast.
        {:noreply, put_member(state, Map.put(member, :nickname, nickname))}
    end
  end

  @impl true
  def handle_info({:DOWN, _ref, :process, pid, _reason}, state) do
    # Channel died without terminate (killed socket): clean the member up
    # exactly as an explicit disconnect leave.
    case Enum.find(state.members, fn {_id, m} -> m.channel_pid == pid end) do
      nil ->
        {:noreply, state}

      {player_id, member} ->
        {:noreply, do_leave(state, player_id, member.conn_ref, :disconnect)}
    end
  end

  def handle_info(:tick, state) do
    now = System.system_time(:millisecond)
    state = flush_tick(state, now)

    state = Map.put(state, :timer, Process.send_after(self(), :tick, tick_interval()))

    cond do
      state.members == %{} and state.empty_since != nil and
          now - state.empty_since >= World.config(:empty_room_grace_ms, 60_000) ->
        telemetry([:afterlight, :room, :stopped], %{lifetime_ms: now - state.started_at}, %{
          room: state.room.wire_id
        })

        # :shutdown (not :normal): the DynamicSupervisor child is
        # restart: :permanent, and a permanent child restarted on :normal
        # would resurrect an empty room forever.
        {:stop, :shutdown, state}

      true ->
        {:noreply, state, :hibernate}
    end
  end

  def handle_info(_other, state), do: {:noreply, state}

  @impl true
  def terminate(_reason, state) do
    for {_id, m} <- state.members, do: Process.demonitor(m.monitor, [:flush])
    :ok
  end

  ## Internals

  defp tick_interval, do: World.config(:flush_interval_ms, 100)

  defp flush_tick(%{dirty: false} = state, _now), do: state

  defp flush_tick(state, _now) do
    members = members_in_order(state)

    if members == [] do
      %{state | dirty: false, received: 0}
    else
      t0 = System.system_time(:millisecond)
      frame = Frames.flush(members, state.tick_count)
      {state, _stalled} = broadcast(frame, state)
      duration = System.system_time(:millisecond) - t0

      telemetry([:afterlight, :room, :tick], %{duration_ms: duration, roster_size: length(members)}, %{
        room: state.room.wire_id
      })

      telemetry([:afterlight, :movement, :coalesced], %{received: state.received, flushed: length(members)}, %{
        room: state.room.wire_id
      })

      %{state | dirty: false, received: 0, tick_count: state.tick_count + 1}
    end
  end

  # Bounded outbound (design D3d): a member whose channel mailbox exceeds
  # the configured ceiling is a stalled consumer — tell the channel to
  # close its transport (retryable `room_stalled`) and remove the member;
  # other members keep streaming.
  defp broadcast(frame, state) do
    max = World.config(:outbound_queue_max, 256)

    Enum.reduce(members_in_order(state), {state, []}, fn member, {state, stalled} ->
      case queue_depth(member.channel_pid) do
        depth when depth > max ->
          # Control message, not a frame: bypass the frame wrapper.
          send(member.channel_pid, {:world_stall, self()})
          {do_leave(state, member.player_id, member.conn_ref, :stalled), [member | stalled]}

        _depth ->
          send_frame(member.channel_pid, frame)
          {state, stalled}
      end
    end)
  end

  defp queue_depth(pid) when is_pid(pid) do
    case Process.info(pid, :message_queue_len) do
      {:message_queue_len, len} -> len
      nil -> 0
    end
  end

  defp do_leave(state, player_id, conn_ref, reason) do
    case Map.get(state.members, player_id) do
      %{:conn_ref => ^conn_ref} = member ->
        Process.demonitor(member.monitor, [:flush])
        frame = Frames.presence_leave(player_id)

        state = remove_member(state, player_id)

        Enum.each(members_in_order(state), fn m -> send_frame(m.channel_pid, frame) end)

        telemetry([:afterlight, :room, :leave], %{}, %{
          room: state.room.wire_id,
          player: player_id,
          reason: reason
        })

        %{state | empty_since: if(state.members == %{}, do: System.system_time(:millisecond), else: state.empty_since)}

      _other ->
        # Not a member, or a stale connection's leave for a superseded
        # identity: the survivor stands (design D8), nothing is emitted.
        state
    end
  end

  defp roster_frame(state, exclude_player_id) do
    players =
      state.order
      |> Enum.map(&Map.get(state.members, &1))
      |> Enum.reject(&is_nil/1)
      |> Enum.reject(&(&1.player_id == exclude_player_id))

    Frames.join_roster(players)
  end

  defp members_in_order(state) do
    Enum.flat_map(state.order, fn id ->
      case Map.get(state.members, id) do
        nil -> []
        member -> [member]
      end
    end)
  end

  defp put_member(state, member) do
    order =
      if Map.has_key?(state.members, member.player_id) do
        state.order
      else
        state.order ++ [member.player_id]
      end

    %{state | members: Map.put(state.members, member.player_id, member), order: order, empty_since: nil}
  end

  defp remove_member(state, player_id) do
    %{state | members: Map.delete(state.members, player_id), order: List.delete(state.order, player_id)}
  end

  defp next_seq(state), do: length(state.order)

  defp monitor_member(channel_pid), do: Process.monitor(channel_pid)

  defp live_nickname(member), do: member.nickname

  # Outbound frames travel as ordinary messages to the channel process;
  # the channel pushes them onto the transport. No frame construction
  # happens in the channel handler (design D9).
  defp send_frame(channel_pid, frame), do: send(channel_pid, {:world_frame, frame})

  defp telemetry(event, measurements, metadata), do: :telemetry.execute(event, measurements, metadata)
end
