defmodule Afterlight.World.Atmosphere do
  @moduledoc """
  Semantic room atmosphere held by the EXISTING RoomServer (task 2.1, design
  D1/D2/D3) — no extra per-room process, no weather database, no Node
  fallback. The module is pure: every function takes the atmosphere state
  plus the caller's epoch/occupancy/clock facts and returns plain data; the
  RoomServer owns the only mutable copy and calls into it from its existing
  100 ms tick.

  What is synchronized is SEMANTIC ONLY (`atmosphere_state` full-replacement
  snapshots): preset identity, weather/time modes, the room seed, bounded
  intensity/wind, the time anchor and up to four precomputed future events.
  Particle transforms never travel. Wire rules (shared with
  `shared/atmosphereModel.js`, pinned cross-language by
  `tests/fixtures/atmosphere/model-vectors.json`):

    * `epoch` is the room's HELD LEASE epoch read off the owner's handle —
      never an independent weather counter; epoch 0 (un-owned/degraded)
      emits nothing and answers `:unavailable`, fail closed;
    * `revision` is atmosphere-only and monotonic within an epoch,
      independent of Theater; a new ownership epoch and an event-window
      replacement are the only things that bump it (≤1 batch per policy
      interval);
    * scheduled weather derives from absolute server time (anchored to the
      Unix epoch), so a restart resumes the schedule without replaying;
    * shared events carry stable `epoch:revision:slot` ids, a ≥5 s lead and
      design-bounded spacing (lightning 45–90 s, meteor 35–70 s), seeded by
      the unsigned 32-bit LCG `(1664525*x + 1013904223) mod 2^32` so the
      fixture vectors reproduce identical draws here and in JS;
    * snapshots are ≤8 KiB and carry at most 4 events by construction.

  Emission points (all inside the RoomServer's existing tick / join path):
  a targeted snapshot after the roster join, an immediate broadcast when an
  event window is replaced, and a repair broadcast at most once per 30 s
  while the room is occupied. An empty room stops scheduling (and stops
  entirely at the existing empty-room grace); a fenced owner stops with the
  room, so it emits nothing after ownership loss.

  Supported rooms come from the build-controlled public projection
  (`Afterlight.World.PlaceDefinitions`): an entry whose atmosphere carries a
  preset that exists in the committed preset table with a supported weather
  mode and a fixed time clock. Unknown or no-atmosphere rooms report
  `:unavailable` — nothing is ever allocated by arbitrary room id. The
  agricultural `Afterlight.World.Weather` / `weather_update` contract is
  deliberately untouched by this module.
  """

  alias Afterlight.World
  alias Afterlight.World.{PlaceDefinitions, RoomServer, Rooms}

  @enforce_keys [:room, :preset, :mode, :seed]
  defstruct [
    :room,
    :preset,
    :mode,
    :seed,
    :rng,
    :epoch,
    :revision,
    :events,
    :next_slot,
    :last_kind_at,
    :next_resupply_at,
    :last_emit_at,
    :started_at
  ]

  @type t :: %__MODULE__{}

  @schema_version 1
  @max_events 4
  @max_frame_bytes 8 * 1024
  @per_kind_cap 2
  @min_lead_ms 5_000
  @late_tolerance_ms 250
  @repair_interval_ms 30_000
  @kinds ~w(lightning meteor)
  @durations %{"lightning" => 800, "meteor" => 1_200}
  @lcg_modulus 4_294_967_296

  # Supported policies (design D1): weather fixed/scheduled now. The
  # accelerated TIME clock is implemented by the shared model, but the
  # committed projection cannot express its rate yet, so a projected room
  # that asks for anything but a fixed clock fails CLOSED (`:unavailable`)
  # instead of silently pretending the schedule were fixed.
  @supported_weather ~w(fixed scheduled)
  @supported_time ~w(fixed)

  ## Configuration (read at init — never per tick)

  @doc """
  Resolves the atmosphere preset row for a wire room id from the public
  projection: `nil` for unknown, private or no-atmosphere rooms, and for any
  projection row whose modes are unsupported. Entries honor the
  `:place_entries` world-config override (the same test/deployment seam the
  place directory uses); presets always come from the committed projection.
  """
  @spec config_for(term) :: %{String.t() => term} | nil
  def config_for(room_id) when is_binary(room_id) do
    entries =
      case World.config(:place_entries) do
        entries when is_list(entries) -> entries
        _ -> PlaceDefinitions.all()
      end

    entry = Enum.find(entries, &(&1["id"] == room_id))
    preset_id = entry && get_in(entry, ["atmosphere", "preset"])
    preset = (is_binary(preset_id) && Map.get(PlaceDefinitions.presets(), preset_id)) || nil

    with %{} <- entry,
         %{"weather" => weather, "id" => ^preset_id} <- preset,
         true <- weather in @supported_weather,
         time_mode when time_mode in @supported_time <- get_in(entry, ["atmosphere", "timeMode"]) do
      preset
    else
      _ -> nil
    end
  end

  def config_for(_other), do: nil

  ## Lifecycle

  @doc """
  Initial atmosphere for a room: resolves the configuration once. No epoch
  is claimed and no events exist until an owned admission adopts the room —
  an un-owned room generates and emits nothing.
  """
  @spec init(String.t()) :: t()
  def init(room_id) do
    preset = config_for(room_id)

    %__MODULE__{
      room: room_id,
      preset: preset,
      mode: preset && preset["weather"],
      seed: seed_for(room_id, preset),
      rng: nil,
      epoch: nil,
      revision: 0,
      events: [],
      next_slot: 0,
      last_kind_at: %{},
      next_resupply_at: nil,
      last_emit_at: nil,
      started_at: nil
    }
  end

  # The room seed is deterministic per wire id (its bytes summed through one
  # LCG step, zero included) and identical across restarts — a new owner
  # still publishes a NEW epoch, so clients treat its snapshot as full
  # replacement whatever the seed does. `:atmosphere_seed` pins it for tests.
  defp seed_for(_room_id, nil), do: 0

  defp seed_for(room_id, _preset) do
    case World.config(:atmosphere_seed) do
      seed when is_integer(seed) and seed >= 0 and seed < @lcg_modulus -> seed
      _ -> room_id |> :binary.bin_to_list() |> Enum.sum() |> rem(@lcg_modulus) |> lcg_next()
    end
  end

  ## Snapshot (join path, atmosphere_get)

  @doc """
  The current full-replacement `atmosphere_state` frame, or `:unavailable`
  when the room has no projected atmosphere, is unknown, or holds no valid
  lease (epoch 0 = un-owned/degraded — never presented as ownership).
  `request_id` (≤64 chars) is echoed for `atmosphere_get` replies.

  Note: epoch adoption performed here is LOCAL to the returned frame — an
  owner that snapshots must persist the adopted struct first via `adopt/3`,
  so every joiner reads the SAME regenerated event window rather than
  redrawing it per reader.
  """
  @spec snapshot(t(), non_neg_integer(), integer(), String.t() | nil) ::
          {:ok, %{String.t() => term}} | :unavailable
  def snapshot(atmosphere, epoch, now, request_id \\ nil)

  def snapshot(%__MODULE__{} = atmosphere, epoch, now, request_id) when is_integer(epoch) do
    atmosphere = ensure_epoch(atmosphere, epoch, now)

    if owned?(epoch) and atmosphere.preset do
      {:ok, build_frame(atmosphere, epoch, now, request_id)}
    else
      :unavailable
    end
  end

  @doc false
  # Persisted epoch adoption for the owning RoomServer (see `snapshot/4`):
  # regenerates the bounded future window exactly once per held epoch, so
  # the join/`atmosphere_get` path and the tick share one window.
  @spec adopt(t(), non_neg_integer(), integer()) :: t()
  def adopt(%__MODULE__{} = atmosphere, epoch, now) when is_integer(epoch),
    do: ensure_epoch(atmosphere, epoch, now)

  @doc """
  The snapshot for a live wire room (the GameChannel join/get path):
  resolves the room's owner and reads its atmosphere in one owner call.
  `:unavailable` for unknown rooms, rooms without a live owner, and
  unsupported rooms — never a lazily started room, never a Node fallback.
  """
  @spec snapshot_for(String.t() | nil) :: {:ok, %{String.t() => term}} | :unavailable
  def snapshot_for(wire_room_id)

  def snapshot_for(wire_room_id) when is_binary(wire_room_id) do
    with {:ok, room} <- Rooms.resolve(wire_room_id),
         [{pid, _}] <- Registry.lookup(Afterlight.World.Registry, {RoomServer, room.wire_id}) do
      RoomServer.atmosphere_snapshot(pid)
    else
      _ -> :unavailable
    end
  end

  def snapshot_for(_other), do: :unavailable

  ## Tick (the RoomServer's existing 100 ms timer — O(1) deadline checks)

  @doc """
  One tick of bounded scheduling work: adopt a newly held epoch (full
  regeneration — restart/new owner resets state and republishes events),
  drop expired event windows, resupply the bounded future window at most
  once per policy interval, and return a broadcast frame when semantics
  changed or the ≤30 s repair snapshot is due. Emission requires ALL of: a
  supported projection, a valid held lease (epoch ≥ 1) and an occupied room
  — a lost lease (epoch 0) and an empty room emit nothing.
  """
  @spec tick(t(), non_neg_integer(), boolean(), integer()) :: {t(), %{String.t() => term} | nil}
  def tick(atmosphere, epoch, occupied?, now)

  def tick(%__MODULE__{} = atmosphere, epoch, occupied?, now) when is_integer(epoch) do
    atmosphere = ensure_epoch(atmosphere, epoch, now)

    cond do
      not owned?(epoch) or not occupied? or atmosphere.preset == nil ->
        {atmosphere, nil}

      true ->
        {atmosphere, changed?} = advance(atmosphere, now)

        repair_due? =
          atmosphere.last_emit_at == nil or now - atmosphere.last_emit_at >= repair_interval()

        if changed? or repair_due? do
          frame = build_frame(atmosphere, epoch, now, nil)
          {%{atmosphere | last_emit_at: now}, frame}
        else
          {atmosphere, nil}
        end
    end
  end

  # Ownership adoption: a strictly newer held epoch is a FULL regeneration
  # (revision restarts at 1, the event window is rebuilt with ≥5 s lead).
  # Renewals keep the same epoch and are no-ops. Epoch 0 clears any claim.
  defp ensure_epoch(%__MODULE__{epoch: held} = atmosphere, epoch, _now) when held == epoch do
    atmosphere
  end

  defp ensure_epoch(%__MODULE__{} = atmosphere, epoch, now) when is_integer(epoch) and epoch > 0 do
    atmosphere
    |> Map.merge(%{
      epoch: epoch,
      revision: 1,
      rng: atmosphere.seed,
      events: [],
      next_slot: 0,
      last_kind_at: %{},
      next_resupply_at: nil,
      last_emit_at: nil,
      started_at: now
    })
    # The initial window IS revision 1 (ids "epoch:1:slot") — it defines the
    # revision rather than replacing one, so adoption itself bumps nothing.
    |> resupply(now, false)
  end

  defp ensure_epoch(%__MODULE__{} = atmosphere, 0, _now) do
    # Un-owned/degraded: never a claim, never a schedule.
    %{
      atmosphere
      | epoch: nil,
        revision: 0,
        rng: nil,
        events: [],
        next_resupply_at: nil,
        last_emit_at: nil
    }
  end

  defp owned?(epoch), do: is_integer(epoch) and epoch >= 1

  # Cheap deadline work: drop fully expired windows (the client's late
  # tolerance is mirrored), then top the future window back up at most once
  # per policy interval. Returns whether semantics changed (a revision bump).
  defp advance(%__MODULE__{} = atmosphere, now) do
    atmosphere = %{atmosphere | events: Enum.reject(atmosphere.events, &expired?(&1, now))}

    if resupply_due?(atmosphere, now) do
      resupplied = resupply(atmosphere, now, true)
      {resupplied, resupplied.revision > atmosphere.revision}
    else
      {atmosphere, false}
    end
  end

  defp resupply_due?(%__MODULE__{} = atmosphere, now) do
    atmosphere.next_resupply_at == nil or now >= atmosphere.next_resupply_at
  end

  defp expired?(event, now) do
    event["at"] + event["durationMs"] + @late_tolerance_ms < now
  end

  # One replacement batch: top each scheduled kind back up to the per-kind
  # cap (total ≤ 4), keeping every kind inside its design spacing and ≥5 s
  # in the future. Any addition bumps the atmosphere revision once (D2: an
  # event-window replacement increments the revision), so the new events'
  # `epoch:revision:slot` ids carry the NEW revision while untouched windows
  # keep their stable ids. `bump?` is false only for the adoption-time
  # window, which IS its revision rather than a replacement of one.
  defp resupply(%__MODULE__{} = atmosphere, now, bump?) do
    policy = (atmosphere.preset && atmosphere.preset["events"]) || %{}
    starting_revision = max(atmosphere.revision, 1)
    target_revision = if bump?, do: starting_revision + 1, else: starting_revision

    {new_events, rng, next_slot, last_kind_at} =
      Enum.reduce(
        @kinds,
        {[], atmosphere.rng, atmosphere.next_slot, atmosphere.last_kind_at},
        fn kind, {acc, rng, slot, last_at} ->
          case policy[kind] do
            %{"minMs" => min_ms, "maxMs" => max_ms} ->
              pending = Enum.count(atmosphere.events ++ acc, &(&1["kind"] == kind and not expired?(&1, now)))
              total = Enum.count(atmosphere.events ++ acc, &not expired?(&1, now))

              add_batch(
                kind,
                min(@per_kind_cap - pending, @max_events - total),
                min_ms,
                max_ms,
                now,
                rng,
                slot,
                last_at,
                atmosphere.epoch,
                target_revision,
                acc
              )

            _other ->
              {acc, rng, slot, last_at}
          end
        end
      )

    added? = new_events != []

    events =
      atmosphere.events
      |> Enum.concat(new_events)
      |> Enum.reject(&expired?(&1, now))
      |> Enum.sort_by(& &1["at"])
      |> Enum.take(@max_events)

    interval =
      policy
      |> Map.values()
      |> Enum.filter(&is_map/1)
      |> Enum.map(& &1["minMs"])
      |> Enum.min(fn -> @repair_interval_ms end)

    %{
      atmosphere
      | events: events,
        rng: rng,
        next_slot: next_slot,
        last_kind_at: last_kind_at,
        revision: if(added?, do: target_revision, else: atmosphere.revision),
        next_resupply_at: now + interval
    }
  end

  defp add_batch(_kind, remaining, _min, _max, _now, rng, slot, last_at, _epoch, _revision, acc)
       when remaining <= 0,
       do: {acc, rng, slot, last_at}

  defp add_batch(kind, remaining, min_ms, max_ms, now, rng, slot, last_at, epoch, revision, acc) do
    total = Enum.count(acc, &not expired?(&1, now))

    if total >= @max_events do
      {acc, rng, slot, last_at}
    else
      {spacing, rng} = draw_in_range(rng, min_ms, max_ms)
      at = max(now + @min_lead_ms, Map.get(last_at, kind, now) + spacing)
      {event, rng} = draw_event(kind, at, epoch, revision, slot, rng)

      add_batch(
        kind,
        remaining - 1,
        min_ms,
        max_ms,
        now,
        rng,
        slot + 1,
        Map.put(last_at, kind, at),
        epoch,
        revision,
        acc ++ [event]
      )
    end
  end

  defp repair_interval, do: World.config(:atmosphere_repair_interval_ms, @repair_interval_ms)

  ## Frames

  defp build_frame(%__MODULE__{} = atmosphere, epoch, now, request_id) do
    events = Enum.filter(atmosphere.events, &not expired?(&1, now))

    [wind_x, wind_z] = atmosphere.preset["wind"]

    state = %{
      "seed" => atmosphere.seed,
      "mode" => atmosphere.mode,
      "preset" => atmosphere.preset["id"],
      "intensity" => atmosphere.preset["intensity"] * 1.0,
      "wind" => [wind_x * 1.0, wind_z * 1.0],
      "startedAt" => atmosphere.started_at,
      "transition" => nil,
      "time" => %{"mode" => "fixed", "phase" => 0, "anchorAt" => now, "rate" => 0},
      "events" => events
    }

    frame = %{
      "type" => "atmosphere_state",
      "roomId" => atmosphere.room,
      "schemaVersion" => @schema_version,
      "epoch" => epoch,
      "revision" => atmosphere.revision,
      "serverNow" => now,
      "state" => state
    }

    frame =
      if is_binary(request_id) and byte_size(request_id) in 1..64 do
        Map.put(frame, "requestId", request_id)
      else
        frame
      end

    # Bounded by construction (≤4 semantic events); the guard keeps the
    # contract explicit rather than trusting every future preset row.
    if byte_size(Jason.encode!(frame)) <= @max_frame_bytes do
      frame
    else
      %{frame | "state" => Map.put(state, "events", [])}
    end
  end

  ## Shared seeded randomness (D1): the fixture-pinned unsigned 32-bit LCG

  @doc false
  @spec lcg_next(non_neg_integer()) :: non_neg_integer()
  def lcg_next(state) when is_integer(state) and state >= 0 and state < @lcg_modulus do
    rem(1_664_525 * state + 1_013_904_223, @lcg_modulus)
  end

  # Uniform float in [0, 1) — the same value JS derives from the same draw.
  defp lcg_float(state), do: state / @lcg_modulus

  defp draw_in_range(rng, min_ms, max_ms) do
    next = lcg_next(rng)
    {min_ms + rem(next, max_ms - min_ms + 1), next}
  end

  defp draw_between(rng, min, max) do
    next = lcg_next(rng)
    {min + (max - min) * lcg_float(next), next}
  end

  # Five deterministic draws per event: intensity then the three origin
  # components. Lightning is one smooth 800 ms pulse; a meteor 1200 ms with
  # no flash (design D3).
  defp draw_event(kind, at, epoch, revision, slot, rng) do
    {intensity, rng} = draw_between(rng, 0.4, 1.0)
    {origin_x, rng} = draw_between(rng, -40.0, 40.0)
    {origin_y, rng} = draw_between(rng, 8.0, 16.0)
    {origin_z, rng} = draw_between(rng, -40.0, 40.0)

    event = %{
      "id" => "#{epoch}:#{revision}:#{slot}",
      "kind" => kind,
      "at" => at,
      "durationMs" => Map.fetch!(@durations, kind),
      "intensity" => intensity,
      "origin" => [origin_x, origin_y, origin_z]
    }

    {event, rng}
  end
end
