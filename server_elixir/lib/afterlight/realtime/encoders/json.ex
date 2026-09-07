defmodule Afterlight.Realtime.Encoders.JSON do
  @moduledoc """
  Debug encoder: renders a `Afterlight.Realtime.RealtimeFrame` in the legacy
  `presence_update` JSON shape (protocol-catalog §1) so development traffic
  stays inspectable (contract: AFTERLIGHT_REALTIME_ENCODING=json). Not for
  the fast path — it exists so the binary protocol is never opaque.

  ## World frame renderers (P3, add-world-room-runtime D9)

  The room runtime's outbound frames (task 3.4) are ALSO rendered here, as
  additive functions: `join_roster/1`, `presence_join/1`, `presence_leave/1`,
  `emote_broadcast/3` and `flush/1`. These produce the exact frozen catalog
  wire shapes (string keys, no extra fields — notably no internal `tick`),
  so `Afterlight.World.RoomServer` never builds frames by hand and channel
  handlers stay free of frame construction. The binary flip stays a config
  change away: `Afterlight.World.Frames` selects the encoder module from
  config and these are the JSON implementation of that seam.
  """

  @behaviour Afterlight.Realtime.FrameEncoder

  import Bitwise

  @flush_type "presence_update"

  @impl true
  def encode(%Afterlight.Realtime.RealtimeFrame{} = frame, _opts \\ []) do
    flags_by_id = Map.new(Enum.zip(frame.flags_ids, frame.flags))
    default = Application.get_env(:afterlight, :rt_default_flags, 0)

    players =
      Enum.zip([frame.transform_ids, frame.transform_x, frame.transform_z, frame.transform_yaw])
      |> Enum.map(fn {id, x, z, yaw} ->
        flag = Map.get(flags_by_id, id, default)

        %{
          id: id,
          x: x,
          z: z,
          rotY: yaw,
          walking: (flag &&& 1) != 0,
          sitting: (flag &&& 2) != 0,
          airborne: (flag &&& 4) != 0
        }
      end)

    %{type: :presence_update, players: players, tick: frame.server_tick}
  end

  @doc """
  The join roster (task 2.1): a `presence_update` whose entries carry the
  JOIN shape `{id, nickname, x, z, rotY, walking, sitting}` — the
  wire-observed asymmetry with the flush shape (no `airborne` here, no
  `nickname` there). A member whose nickname was never learned drops the
  key, exactly as Node's `JSON.stringify` drops `undefined`.
  """
  @spec join_roster([map], non_neg_integer) :: %{String.t() => term}
  def join_roster(entries, epoch \\ 0) do
    %{"type" => @flush_type, "players" => Enum.map(entries, &join_entry/1), "epoch" => epoch}
  end

  @doc """
  The room broadcast when a member joins (joiner excluded by the caller):
  `{presence_join, player: <join shape>}`.
  """
  @spec presence_join(map, non_neg_integer) :: %{String.t() => term}
  def presence_join(entry, epoch \\ 0) do
    %{"type" => "presence_join", "player" => join_entry(entry), "epoch" => epoch}
  end

  @doc "A member left (travel or disconnect): `{presence_leave, playerId}`."
  @spec presence_leave(term) :: %{String.t() => term}
  def presence_leave(player_id) do
    %{"type" => "presence_leave", "playerId" => player_id}
  end

  @doc "Room-scoped emote relay: `{emote_broadcast, playerId, nickname, emote}`."
  @spec emote_broadcast(term, term, term) :: %{String.t() => term}
  def emote_broadcast(player_id, nickname, emote) do
    %{"type" => "emote_broadcast", "playerId" => player_id, "nickname" => nickname, "emote" => emote}
  end

  @doc """
  The 10 Hz dirty-room flush (task 3.2): FULL roster, no delta encoding,
  entries in the FLUSH shape `{id, x, z, rotY, walking, sitting, airborne}`
  (no nickname). Unlike the debug `encode/2` above, the wire frame carries
  no internal `tick` — the frozen catalog shape is byte-exact.
  """
  @spec flush([map], non_neg_integer) :: %{String.t() => term}
  def flush(entries, epoch \\ 0) do
    %{
      "type" => @flush_type,
      "epoch" => epoch,
      "players" =>
        Enum.map(entries, fn e ->
          %{
            "id" => e.id,
            "x" => e.x,
            "z" => e.z,
            "rotY" => e[:rot_y] || e[:rotY],
            "walking" => e.walking,
            "sitting" => e.sitting,
            "airborne" => e.airborne
          }
        end)
    }
  end

  # Join-shape entry: {id, nickname, x, z, rotY, walking, sitting} — no
  # airborne; a missing nickname is dropped (Node undefined-drop parity).
  defp join_entry(e) do
    base = %{
      "id" => e.id,
      "x" => e.x,
      "z" => e.z,
      "rotY" => e[:rot_y] || e[:rotY],
      "walking" => e.walking,
      "sitting" => e.sitting
    }

    if Map.has_key?(e, :nickname) and e.nickname != nil do
      Map.put(base, "nickname", e.nickname)
    else
      base
    end
  end
end
