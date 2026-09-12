defmodule Afterlight.Realtime.Negotiation do
  @moduledoc "Capability negotiation (contract §5) — mirrors `shared/realtime/negotiation.js`."

  @protocol "afterlight-soa-v1"

  @spec parse_hello_rt(map()) :: map() | nil
  def parse_hello_rt(%{"rt" => %{"protocols" => protocols}} = hello) when is_list(protocols) do
    if @protocol in protocols do
      %{
        protocol: @protocol,
        webgpu: false,
        wasm: false,
        # Additive live-flush capability (fix-remote-avatar-flicker): the
        # client applies lifecycle-carrying FULL snapshots. Absent = delta.
        spawn: get_in(hello, ["rt", "spawn"]) == true
      }
    else
      nil
    end
  end

  def parse_hello_rt(_), do: nil

  @spec welcome_rt() :: map()
  def welcome_rt do
    %{"protocol" => @protocol, "snapshot_hz" => 10}
  end
end
