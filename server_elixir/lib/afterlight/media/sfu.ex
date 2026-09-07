defmodule Afterlight.Media.SFU do
  @moduledoc """
  The only conferencing media seam (P8 design D1).

  Phoenix and Ash never talk to a concrete SFU. Allocate, join, publish,
  subscribe, remove, close, and authenticated signaling all go through this
  behaviour. A Membrane/ExWebRTC prototype is one implementation; a NO-GO
  gate keeps this adapter and evaluates a maintained external SFU later.

  Media packets must never traverse Channels, LiveView, or Ash. Implementations
  validate grants independently on every call — a call id or SDP body alone
  grants no access.
  """

  @type call_id :: String.t()
  @type player_id :: String.t()
  @type grant :: String.t()
  @type signal :: map()

  @callback allocate_call(map()) :: {:ok, map()} | {:error, term()}
  @callback join(call_id(), player_id(), grant()) :: {:ok, map()} | {:error, term()}
  @callback publish(call_id(), player_id(), grant(), map()) :: :ok | {:error, term()}
  @callback subscribe(call_id(), player_id(), grant(), map()) :: :ok | {:error, term()}
  @callback remove_participant(call_id(), player_id()) :: :ok | {:error, term()}
  @callback close_call(call_id()) :: :ok | {:error, term()}
  @callback signal(call_id(), player_id(), grant(), signal()) :: :ok | {:error, term()}
end
