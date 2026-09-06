defmodule Afterlight.Realtime.FrameEncoder do
  @moduledoc """
  Behaviour for realtime frame encoders (contract §6). A room process
  extracts a `Afterlight.Realtime.RealtimeFrame` and asks the configured
  encoder for iodata — encode once per capability class per tick, fan the
  result out to every negotiating client.

  Implementations:

    * `Afterlight.Realtime.Encoders.JSON`      — human-debuggable legacy shape
    * `Afterlight.Realtime.Encoders.BinarySoA` — afterlight-soa-v1 binary
  """

  @callback encode(frame :: Afterlight.Realtime.RealtimeFrame.t(), opts :: keyword()) :: iodata()
end
