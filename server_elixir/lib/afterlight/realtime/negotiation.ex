defmodule Afterlight.Realtime.Negotiation do
  @moduledoc "Capability negotiation (contract §5) — mirrors `shared/realtime/negotiation.js`."

  @protocol "afterlight-soa-v1"

  @spec parse_hello_rt(map()) :: map() | nil
  def parse_hello_rt(%{"rt" => %{"protocols" => protocols}}) when is_list(protocols) do
    if @protocol in protocols do
      %{
        protocol: @protocol,
        webgpu: false,
        wasm: false
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
