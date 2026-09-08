defmodule Afterlight.Media.Prototype do
  @moduledoc """
  Membrane/ExWebRTC SFU adapter prototype implementing `Afterlight.Media.SFU` (P8 design D1, D5).

  Pinned versions for this implementation:
    * Erlang/OTP: 27.2+
    * Elixir: 1.18.3
    * Codecs: Opus (audio, 48kHz stereo/mono), VP8 & H.264 (baseline video)
    * Single screen-share lifecycle (VP8, up to 1080p 30fps)
    * Audio-only fallback supported seamlessly
  """

  @behaviour Afterlight.Media.SFU

  alias Afterlight.Media.Allocator
  alias Afterlight.Media.Worker

  @impl true
  def allocate_call(params) when is_map(params) do
    call_id = Map.get(params, :call_id) || Map.get(params, "call_id")
    mode = Map.get(params, :mode) || Map.get(params, "mode") || :voice
    region = Map.get(params, :region) || Map.get(params, "region") || "local"
    worker_id = Map.get(params, :worker_id) || Map.get(params, "worker_id")

    opts = [mode: mode, region: region]
    opts = if worker_id, do: Keyword.put(opts, :worker_id, worker_id), else: opts

    Allocator.allocate(to_string(call_id), opts)
  end

  @impl true
  def join(call_id, player_id, grant) do
    Worker.join(to_string(call_id), to_string(player_id), grant)
  end

  @impl true
  def publish(call_id, player_id, grant, track_info) do
    Worker.publish(to_string(call_id), to_string(player_id), grant, track_info)
  end

  @impl true
  def subscribe(call_id, player_id, grant, track_info) do
    Worker.subscribe(to_string(call_id), to_string(player_id), grant, track_info)
  end

  @impl true
  def remove_participant(call_id, player_id) do
    Worker.remove_participant(to_string(call_id), to_string(player_id))
  end

  @impl true
  def close_call(call_id) do
    Allocator.release(to_string(call_id))
  end

  @impl true
  def signal(call_id, player_id, grant, signal_payload) do
    Worker.signal(to_string(call_id), to_string(player_id), grant, signal_payload)
  end
end
