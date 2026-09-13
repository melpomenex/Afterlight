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

  Ownership (P9 `add-distributed-room-ownership`, completed by B task 1.1):
  the ADMITTING caller acquires the room's existing lease exactly once
  (`Afterlight.World.Lease`, database-time TTL + epochs) and hands the
  handle to `init` — this callback runs no lease SQL. A held handle is
  consumed verbatim (admission, `Successor.rebuild` takeovers, and the
  DynamicSupervisor auto-restart, which re-runs init with the original
  handle: the row outlives the crash, so the restarted owner keeps its
  epoch). A jittered `Lease.Renewer` (a linked child that monitors this
  room) keeps it alive and reports `{:lease_renewed, handle}` /
  `{:lease_fenced, reason}`. Every outbound frame carries the held lease
  epoch in the additive `"epoch"` field (Frames; wire shapes otherwise
  unchanged). Ownership loss is fail-closed: a fenced room STOPS, which
  closes member transports with the retryable `room_unavailable` and lets
  the desiredRoom replay start a successor that acquires a strictly
  greater epoch. A room admitted while the lease system was unreachable
  holds NO handle — its frames carry the pre-lease epoch default 0, never
  presented as real ownership (no fake epoch0 fallback) — and adopts a
  handle on the next owned admission via `install_lease/2`. Multi-node
  room owners remain gated (`World.Gate`, P10 evidence).
  """

  # :transient — a crashed room restarts (empty, members resnapshot);
  # a graceful empty-room stop (:shutdown) stays stopped. (:permanent
  # would resurrect even graceful stops forever.)
  use GenServer, restart: :transient

  alias Afterlight.World
  alias Afterlight.World.{Atmosphere, Emotes, Frames, Lease, Movement}
  alias Afterlight.World.Lease.Renewer

  defstruct [
    :room,
    :timer,
    :empty_since,
    :started_at,
    :lease,
    :renewer,
    :atmosphere,
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

  @doc "Avatar refresh (cast) so rosters read live and presence_update is broadcast."
  def update_avatar(room_pid, player_id, avatar) do
    GenServer.cast(room_pid, {:update_avatar, player_id, avatar})
  end

  @doc "Live membership check for a specific connection (the durable-command gate)."
  def member?(room_pid, player_id, conn_ref) do
    GenServer.call(room_pid, {:member?, player_id, conn_ref})
  end

  @doc "Returns the member's current pose or :not_found."
  def member_pose(room_pid, player_id) do
    GenServer.call(room_pid, {:member_pose, player_id})
  end

  @doc """
  Resolve a live member by player id or nickname (case-insensitive).
  Used by direct challenges. Never starts work and never guesses occupancy.
  """
  def find_member(room_pid, name) when is_binary(name) do
    GenServer.call(room_pid, {:find_member, name}, 100)
  catch
    :exit, _ -> :not_found
  end

  def find_member(_, _), do: :not_found

  @doc false
  def stats(room_pid) do
    GenServer.call(room_pid, :stats)
  end

  @doc "Returns the room's ownership lease handle and frame epoch: `{lease, epoch}`."
  def lease_handle(room_pid), do: GenServer.call(room_pid, :lease_handle)

  @doc """
  The room's semantic atmosphere snapshot (`{:ok, frame}`), or
  `:unavailable` when the room has no projected atmosphere or holds no
  valid lease (task 2.1: un-owned rooms never present atmosphere state).
  One `GenServer.call` per join/`atmosphere_get` — never per tick.
  """
  def atmosphere_snapshot(room_pid), do: GenServer.call(room_pid, :atmosphere_snapshot)

  @doc """
  Adopt an allowed atmosphere preset for this room (`atmosphere_set`). The
  owner validates the id against the room's projection allow-list, persists
  the full replacement and pushes one `atmosphere_state` snapshot to every
  member. Returns `{:ok, frame}` or `{:error, reason}`; `:unavailable` for an
  un-owned room. One `GenServer.call` per request — never per tick.
  """
  def atmosphere_set(room_pid, preset_id), do: GenServer.call(room_pid, {:atmosphere_set, preset_id})

  @doc "Fan out a flat domain frame to every live member."
  def broadcast_frame(room_pid, frame) when is_map(frame) do
    GenServer.cast(room_pid, {:broadcast_frame, frame})
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
  def start_link({room, lease}), do: GenServer.start_link(__MODULE__, {room, lease}, name: via(room.wire_id))

  # Direct test starts pass the resolved room map alone: an un-owned room
  # (World admission and Successor.rebuild always pass a spec explicitly).
  def start_link(room) when is_map(room), do: start_link({room, nil})

  defp via(wire_id), do: {:via, Registry, {Afterlight.World.Registry, {__MODULE__, wire_id}}}

  @doc """
  The ownership epoch this room stamps on every outbound frame: the held
  lease epoch, or the pre-lease default 0 when no handle is held (lease
  unverifiable at admission / fenced). Never an invented counter — it is
  read straight off the `Lease.Handle` (P9; B task 1.1).
  """
  @spec epoch(pid) :: non_neg_integer
  def epoch(room_pid), do: GenServer.call(room_pid, :epoch)

  @doc """
  Adopt an acquired lease on an already-running room. Idempotent for
  duplicate admissions (the same lease row): an equal-epoch handle is
  already held, so the caller's is dropped and no second renewal loop
  starts against ourselves. A STRICTLY GREATER epoch — a successor that
  took the row over while a stale pre-crash handle still pointed here —
  is ADOPTED: the handle is swapped and the renewal loop restarted so the
  room never keeps claiming (or renewing) a superseded epoch.
  """
  @spec install_lease(pid, Lease.Handle.t()) :: {:ok, non_neg_integer} | {:error, term}
  def install_lease(room_pid, %Lease.Handle{} = handle) do
    GenServer.call(room_pid, {:install_lease, handle})
  end

  ## Callbacks

  @impl true
  def init({room, nil}) do
    # Un-owned admission (lease system unreachable for the joiner): frames
    # carry the epoch-0 wire default until an owned join installs a lease.
    init_room(room, nil)
  end

  def init({room, %Lease.Handle{} = handle}) do
    # Owned admission / successor path: the caller already acquired this
    # handle — consume it, never re-acquire against ourselves.
    init_room(room, handle)
  end

  # Bounded lease SQL at the owner seam (the Renewer's renewals): a stalled
  # database must degrade quickly, never stall a join or a renewal for the
  # full DBConnection default.
  @lease_query_timeout_ms 2_000

  defp lease_query_timeout, do: World.config(:lease_query_timeout_ms, @lease_query_timeout_ms)

  defp init_room(room, nil) do
    # Un-owned admission (lease system unreachable for the joiner): frames
    # carry the epoch-0 wire default until an owned join installs a lease.
    # The atmosphere holds no claim either — it emits nothing until owned.
    {:ok,
     %__MODULE__{
       room: room,
       atmosphere: Atmosphere.init(room.wire_id),
       started_at: System.system_time(:millisecond),
       timer: Process.send_after(self(), :tick, tick_interval())
     }}
  end

  defp init_room(room, handle) do
    # Linked renewer: it monitors this room and stops itself on DOWN, so
    # there is nothing to demonitor on stop (P9 lifecycle). A renewer
    # crash takes the room with it — the restart re-runs init with the
    # same handle and resumes renewal.
    {:ok, renewer} = Renewer.start_link(room_pid: self(), handle: handle, query_timeout: lease_query_timeout())

    {:ok,
     %__MODULE__{
       room: room,
       lease: handle,
       renewer: renewer,
       atmosphere: Atmosphere.init(room.wire_id),
       started_at: System.system_time(:millisecond),
       timer: Process.send_after(self(), :tick, tick_interval())
     }}
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

          telemetry([:afterlight, :room, :reconnect], %{count: 1}, %{
            room: state.room.wire_id,
            player: player_id
          })

          member =
            member
            |> Map.put(:conn_ref, conn_ref)
            |> Map.put(:channel_pid, attrs.channel_pid)
            |> Map.put(:monitor, monitor_member(attrs.channel_pid))
            |> Map.put(:nickname, attrs.nickname)
            |> Map.put(:pose, attrs.pose)
            |> Map.put(:avatar, Map.get(attrs, :avatar, Map.get(member, :avatar)))

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
            avatar: Map.get(attrs, :avatar),
            joined_seq: next_seq(state)
          }

          # presence_join to the room, joiner excluded.
          frame = Frames.presence_join(member, frame_epoch(state))

          Enum.each(state.order, fn pid_id ->
            other = Map.get(state.members, pid_id)
            send_frame(state.room.wire_id, other.channel_pid, frame)
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

  def handle_call({:member_pose, player_id}, _from, state) do
    case Map.get(state.members, player_id) do
      nil -> {:reply, :not_found, state}
      member -> {:reply, {:ok, member.pose}, state}
    end
  end

  def handle_call({:find_member, name}, _from, state) when is_binary(name) do
    lowered = String.downcase(name)

    found =
      Enum.find(state.members, fn {id, member} ->
        id == name or String.downcase(to_string(member.nickname || "")) == lowered
      end)

    case found do
      {id, member} ->
        {:reply,
         {:ok,
          %{
            player_id: id,
            nickname: member.nickname,
            channel_pid: member.channel_pid,
            conn_ref: member.conn_ref
          }}, state}

      nil ->
        {:reply, :not_found, state}
    end
  end

  def handle_call(:epoch, _from, state) do
    {:reply, frame_epoch(state), state}
  end

  def handle_call(:lease_handle, _from, state) do
    {:reply, {state.lease, frame_epoch(state)}, state}
  end

  def handle_call(:atmosphere_snapshot, _from, state) do
    # Persist the adopted epoch first (task 2.1): the bounded future event
    # window is regenerated exactly once per held epoch, so two joiners read
    # the SAME window instead of each redrawing one (the coherence contract).
    now = System.system_time(:millisecond)
    atmosphere = Atmosphere.adopt(state.atmosphere, frame_epoch(state), now)
    {:reply, Atmosphere.snapshot(atmosphere, frame_epoch(state), now), %{state | atmosphere: atmosphere}}
  end

  def handle_call({:atmosphere_set, preset_id}, _from, state) do
    # Environment adoption (Theater Environment campaign): the room owner is
    # the only writer, validation lives in Atmosphere.set_preset/4 and the
    # resulting full-replacement snapshot is broadcast to every member. The
    # local override is optimistic on the client; this frame is what makes
    # the choice authoritative for the whole room.
    now = System.system_time(:millisecond)

    case Atmosphere.set_preset(state.atmosphere, preset_id, frame_epoch(state), now) do
      {:ok, atmosphere, frame} ->
        Enum.each(members_in_order(state), fn member ->
          send_frame(state.room.wire_id, member.channel_pid, frame)
        end)

        {:reply, {:ok, frame}, %{state | atmosphere: atmosphere}}

      {:error, reason} ->
        {:reply, {:error, reason}, state}
    end
  end

  def handle_call({:install_lease, %Lease.Handle{} = handle}, _from, %{lease: %Lease.Handle{} = held} = state)
      when held.epoch >= handle.epoch do
    # Already owned at the caller's epoch or higher (duplicate admission,
    # successor raced against a live room): the existing handle stands —
    # same lease row, no second renewal loop against ourselves.
    {:reply, {:ok, frame_epoch(state)}, state}
  end

  def handle_call({:install_lease, %Lease.Handle{} = handle}, _from, %{lease: %Lease.Handle{} = held} = state) do
    # Successor takeover: the row moved to a strictly greater epoch while
    # this room still held the stale (pre-crash) handle. Swap to the new
    # handle and RESTART the renewal loop, so the stale renewer cannot
    # renew the superseded epoch and fence us a moment later.
    case start_renewer(handle) do
      {:ok, renewer} ->
        # Unlink before killing: the old renewer is linked to this room,
        # and its `:killed` exit would otherwise take the room down with
        # it (the renewer's own DOWN monitor is what stops it on room
        # death — the reverse direction must not fire here).
        if is_pid(state.renewer) do
          Process.unlink(state.renewer)
          Process.exit(state.renewer, :kill)
        end

        state = %{state | lease: handle, renewer: renewer}
        {:reply, {:ok, frame_epoch(state)}, state}

      {:error, reason} ->
        _ = held
        {:reply, {:error, reason}, state}
    end
  end

  def handle_call({:install_lease, %Lease.Handle{} = handle}, _from, state) do
    # Un-owned room adopting its first handle.
    case start_renewer(handle) do
      {:ok, renewer} ->
        state = %{state | lease: handle, renewer: renewer}
        {:reply, {:ok, frame_epoch(state)}, state}

      {:error, reason} ->
        {:reply, {:error, reason}, state}
    end
  end

  def handle_call(:stats, _from, state) do
    depth =
      case Process.info(self(), :message_queue_len) do
        {:message_queue_len, len} -> len
        _ -> 0
      end

    {:reply, %{room: state.room.wire_id, roster_size: map_size(state.members), mailbox_depth: depth}, state}
  end

  def handle_call({:leave_for_member, member_pid, reason}, _from, state) do
    case Enum.find(state.members, fn {_id, m} -> m.channel_pid == member_pid end) do
      nil ->
        {:reply, :ok, state}

      {player_id, member} ->
        {:reply, :ok, do_leave(state, player_id, member.conn_ref, reason)}
    end
  end

  defp start_renewer(handle), do: Renewer.start_link(room_pid: self(), handle: handle, query_timeout: lease_query_timeout())

  @impl true
  def handle_cast({:broadcast_frame, frame}, state) do
    Enum.each(members_in_order(state), fn member -> send_frame(state.room.wire_id, member.channel_pid, frame) end)
    {:noreply, state}
  end

  @doc """
  Addressed delivery to ONE member channel (add-multiplayer-snowboard-arcade
  5.3): high-rate race snapshots go only to accepted participants and
  subscribed watchers instead of the room-wide broadcast fanout. The room
  process relays only to current members; stale pids are skipped silently.
  """
  def send_to_member(room_pid, channel_pid, frame) when is_map(frame) do
    GenServer.cast(room_pid, {:send_to_members, [channel_pid], frame})
  end

  def handle_cast({:send_to_members, channel_pids, frame}, state) do
    known = MapSet.new(members_in_order(state), fn member -> member.channel_pid end)

    Enum.each(Enum.take(channel_pids, 64), fn pid ->
      # Only pids that are current members ever receive addressed frames:
      # a stale or forged pid list can never widen the audience.
      if MapSet.member?(known, pid), do: send_frame(state.room.wire_id, pid, frame)
    end)

    {:noreply, state}
  end

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
          telemetry([:afterlight, :movement, :dropped], %{count: 1}, %{
            room: state.room.wire_id,
            reason: :invalid,
            player: player_id
          })

          {:noreply, state}
      end
    else
      telemetry([:afterlight, :movement, :dropped], %{count: 1}, %{
        room: state.room.wire_id,
        reason: :stale_connection,
        player: player_id
      })

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
        frame = Frames.emote_broadcast(player_id, live_nickname(member), emote, frame_epoch(state))

        Enum.each(members_in_order(state), fn m ->
          send_frame(state.room.wire_id, m.channel_pid, frame)
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

  def handle_cast({:update_avatar, player_id, avatar}, state) do
    case Map.get(state.members, player_id) do
      nil ->
        {:noreply, state}

      member ->
        updated = Map.put(member, :avatar, avatar)
        state = put_member(state, updated)
        frame = Frames.join_roster([updated], frame_epoch(state))

        Enum.each(state.order, fn pid_id ->
          if pid_id != player_id do
            other = Map.get(state.members, pid_id)
            if other, do: send_frame(state.room.wire_id, other.channel_pid, frame)
          end
        end)

        {:noreply, state}
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

    # Semantic atmosphere (task 2.1): bounded scheduling inside the EXISTING
    # tick — O(1) deadline checks, a broadcast frame only when an event
    # window was replaced or the ≤30 s repair snapshot is due, and never for
    # an un-owned (epoch 0) or empty room.
    {atmosphere, atmosphere_frame} = Atmosphere.tick(state.atmosphere, frame_epoch(state), state.members != %{}, now)
    state = %{state | atmosphere: atmosphere}

    if atmosphere_frame != nil do
      Enum.each(members_in_order(state), fn member ->
        send_frame(state.room.wire_id, member.channel_pid, atmosphere_frame)
      end)
    end

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

  # Renewal succeeded (jittered Renewer cadence): adopt the fresh handle.
  # The epoch itself only changes across ownership transfer, but the
  # handle stays the single source of truth.
  def handle_info({:lease_renewed, %Lease.Handle{} = handle}, state) do
    state =
      if is_pid(state.renewer) do
        state
      else
        # Degraded-room adoption via install_lease started a fresh renewer
        # whose first renewal will arrive as a message; keep the handle
        # bookkeeping symmetric either way.
        state
      end

    {:noreply, %{state | lease: handle}}
  end

  # Ownership lost (renewal rejected: expired or taken over). Fail closed
  # as the FORMER owner: stop the room so every member transport closes
  # with the retryable `room_unavailable` and the desiredRoom replay
  # starts a successor that acquires a strictly greater epoch. Queued
  # old-owner output dies with this process, and clients additionally
  # discard stale epochs per room (src/net/roomEpoch.js).
  def handle_info({:lease_fenced, reason}, state) do
    telemetry([:afterlight, :room, :lease, :fenced], %{count: 1}, %{
      room: state.room.wire_id,
      reason: reason
    })

    {:stop, :shutdown, %{state | lease: Lease.fence(state.lease)}}
  end

  def handle_info(_other, state), do: {:noreply, state}

  @impl true
  def terminate(_reason, state) do
    for {_id, m} <- state.members, do: Process.demonitor(m.monitor, [:flush])

    # Renewal lifecycle (P9): the linked Renewer monitors this room and
    # stops itself on DOWN — nothing to cancel here. The lease row is
    # deliberately NOT released on shutdown: `Lease.release/1` would let
    # the next acquisition restart at epoch 1, an epoch REGRESSION that
    # epoch-tracking clients discard. Letting the row expire naturally
    # keeps every later acquisition monotonic (same-owner reclaims keep
    # the epoch; expired takeovers bump it).
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
      frame = Frames.flush(members, state.tick_count, frame_epoch(state))
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
          send(member.channel_pid, {:world_stall, self()})

          telemetry([:afterlight, :room, :member, :stalled], %{count: 1}, %{
            room: state.room.wire_id,
            player: member.player_id
          })

          {do_leave(state, member.player_id, member.conn_ref, :stalled), [member | stalled]}

        _depth ->
          send_frame(state.room.wire_id, member.channel_pid, frame)
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
        frame = Frames.presence_leave(player_id, frame_epoch(state))

        state = remove_member(state, player_id)

        Enum.each(members_in_order(state), fn m -> send_frame(state.room.wire_id, m.channel_pid, frame) end)

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

    Frames.join_roster(players, frame_epoch(state))
  end

  # The epoch stamped on every frame of THIS owner: the held lease epoch,
  # or the pre-lease wire default 0 while the room holds no handle (lease
  # unverifiable at startup). A real acquired epoch is always >= 1, so 0
  # on the wire unambiguously means "un-owned" — never a fabricated claim.
  defp frame_epoch(%{lease: %Lease.Handle{fenced: false, epoch: epoch}}) when is_integer(epoch) and epoch > 0, do: epoch
  defp frame_epoch(_state), do: 0

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
  # happens in the channel handler (design D9). Every message is tagged
  # with the sending room's wire id (task 3.2, D3): the channel drops
  # frames from a room it has already left, so queued output cannot cross
  # travel.
  defp send_frame(wire_id, channel_pid, frame) do
    send(channel_pid, Frames.world_message(wire_id, frame))
  end

  defp telemetry(event, measurements, metadata), do: :telemetry.execute(event, measurements, metadata)
end
