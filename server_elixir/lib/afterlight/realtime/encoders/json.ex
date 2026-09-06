defmodule Afterlight.Realtime.Encoders.JSON do
  @moduledoc """
  Debug encoder: renders a `Afterlight.Realtime.RealtimeFrame` in the legacy
  `presence_update` JSON shape (protocol-catalog §1) so development traffic
  stays inspectable (contract: AFTERLIGHT_REALTIME_ENCODING=json). Not for
  the fast path — it exists so the binary protocol is never opaque.
  """

  @behaviour Afterlight.Realtime.FrameEncoder

  import Bitwise

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
end
