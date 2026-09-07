defmodule Afterlight.Social.Bridge do
  @moduledoc """
  Authenticated adapter bridge between Phoenix `Afterlight.Social.Relay`
  and the Node IRC sidecar.

  Contracts:
    * Every relayed event carries an origin-scoped unique ID (`{origin: game|irc, id}`).
    * Reflection loops (game→IRC→game and IRC→game→IRC) are prevented by an in-memory
      bounded LRU `SeenLedger`. Seen events are dropped immediately.
    * Sidecar outage degradation: when the sidecar is down, game chat continues
      unaffected, IRC presence is marked down, and no `chat_error` is produced.
    * Reconnection re-establishes event exchange without manual state repair.
  """

  use GenServer
  require Logger

  alias Afterlight.Social.{Relay, SeenLedger}

  defstruct [
    :relay,
    :adapter,
    ledger: SeenLedger.new(1000),
    irc_nicks: MapSet.new(),
    status: :up
  ]

  # --- Client API -------------------------------------------------------------

  def start_link(opts \\ []) do
    name = Keyword.get(opts, :name, __MODULE__)
    GenServer.start_link(__MODULE__, opts, name: name)
  end

  @doc "Relays an event from the game chat relay toward the IRC sidecar."
  def relay_event(bridge \\ __MODULE__, event) do
    GenServer.call(bridge, {:relay_event, event})
  end

  @doc "Handles an inbound event arriving from the IRC sidecar."
  def handle_irc_event(bridge \\ __MODULE__, event) do
    GenServer.call(bridge, {:handle_irc_event, event})
  end

  @doc "Returns the current connection status of the IRC sidecar (:up or :down)."
  def sidecar_status(bridge \\ __MODULE__) do
    GenServer.call(bridge, :sidecar_status)
  end

  @doc "Sets sidecar status (:up or :down), e.g. on sidecar connect/disconnect/crash."
  def set_sidecar_status(bridge \\ __MODULE__, status) when status in [:up, :down] do
    GenServer.call(bridge, {:set_sidecar_status, status})
  end

  @doc "Returns the current list of online IRC nicknames."
  def irc_nicks(bridge \\ __MODULE__) do
    GenServer.call(bridge, :irc_nicks)
  end

  @doc "Returns the current seen-key ledger (for inspection/tests)."
  def seen_ledger(bridge \\ __MODULE__) do
    GenServer.call(bridge, :seen_ledger)
  end

  @doc "Updates the adapter target (PID or module)."
  def set_adapter(bridge \\ __MODULE__, adapter) do
    GenServer.call(bridge, {:set_adapter, adapter})
  end

  @doc "Updates the relay target (PID or module)."
  def set_relay(bridge \\ __MODULE__, relay) do
    GenServer.call(bridge, {:set_relay, relay})
  end

  # --- Server Callbacks -------------------------------------------------------

  @impl true
  def init(opts) do
    relay = Keyword.get(opts, :relay, Relay)
    adapter = Keyword.get(opts, :adapter, nil)
    status = Keyword.get(opts, :status, :up)
    ledger_cap = Keyword.get(opts, :ledger_cap, 1000)

    {:ok,
     %__MODULE__{
       relay: relay,
       adapter: adapter,
       status: status,
       ledger: SeenLedger.new(ledger_cap)
     }}
  end

  @impl true
  def handle_call({:relay_event, event}, _from, state) do
    {state, result} = do_relay_outbound(event, state)
    {:reply, result, state}
  end

  @impl true
  def handle_call({:handle_irc_event, event}, _from, state) do
    {state, result} = do_handle_inbound(event, state)
    {:reply, result, state}
  end

  @impl true
  def handle_call(:sidecar_status, _from, state) do
    {:reply, state.status, state}
  end

  @impl true
  def handle_call({:set_sidecar_status, status}, _from, state) do
    state =
      if status == :down and state.status == :up do
        # Sidecar went down: clear IRC roster; game chat degrades to local-only
        %{state | status: :down, irc_nicks: MapSet.new()}
      else
        %{state | status: status}
      end

    {:reply, :ok, state}
  end

  @impl true
  def handle_call(:irc_nicks, _from, state) do
    if state.status == :up do
      {:reply, MapSet.to_list(state.irc_nicks), state}
    else
      {:reply, [], state}
    end
  end

  @impl true
  def handle_call(:seen_ledger, _from, state) do
    {:reply, state.ledger, state}
  end

  @impl true
  def handle_call({:set_adapter, adapter}, _from, state) do
    {:reply, :ok, %{state | adapter: adapter}}
  end

  @impl true
  def handle_call({:set_relay, relay}, _from, state) do
    {:reply, :ok, %{state | relay: relay}}
  end

  @impl true
  def handle_info({:relay_event, event}, state) do
    {state, _result} = do_relay_outbound(event, state)
    {:noreply, state}
  end

  def handle_info({:irc_event, event}, state) do
    {state, _result} = do_handle_inbound(event, state)
    {:noreply, state}
  end

  def handle_info(_other, state), do: {:noreply, state}

  # --- Outbound Helpers (Game -> IRC) -----------------------------------------

  defp do_relay_outbound({:channel_message, sender, text, is_action}, state) do
    msg_id = next_msg_id("game")
    key = {:game, msg_id}
    {:new, ledger} = SeenLedger.record(state.ledger, key)

    payload = %{
      "type" => "chat_relay",
      "origin" => "game",
      "id" => msg_id,
      "from" => sender,
      "text" => text,
      "action" => is_action,
      "channel" => "#afterlight"
    }

    forward_to_adapter(payload, state)
    {%{state | ledger: ledger}, {:ok, msg_id}}
  end

  defp do_relay_outbound({:direct_message, sender, target_irc_nick, text}, state) do
    msg_id = next_msg_id("game")
    key = {:game, msg_id}
    {:new, ledger} = SeenLedger.record(state.ledger, key)

    payload = %{
      "type" => "chat_relay_dm",
      "origin" => "game",
      "id" => msg_id,
      "from" => sender,
      "to" => target_irc_nick,
      "text" => text
    }

    forward_to_adapter(payload, state)
    {%{state | ledger: ledger}, {:ok, msg_id}}
  end

  defp do_relay_outbound({:player_joined, guest_id, nickname}, state) do
    payload = %{
      "type" => "presence_sync",
      "event" => "join",
      "who" => nickname,
      "playerId" => guest_id,
      "fromKind" => "player"
    }

    forward_to_adapter(payload, state)
    {state, :ok}
  end

  defp do_relay_outbound({:player_parted, guest_id, nickname}, state) do
    payload = %{
      "type" => "presence_sync",
      "event" => "part",
      "who" => nickname,
      "playerId" => guest_id,
      "fromKind" => "player"
    }

    forward_to_adapter(payload, state)
    {state, :ok}
  end

  defp do_relay_outbound({:nickname_changed, guest_id, old_nick, new_nick}, state) do
    payload = %{
      "type" => "nick_sync",
      "playerId" => guest_id,
      "oldNick" => old_nick,
      "newNick" => new_nick
    }

    forward_to_adapter(payload, state)
    {state, :ok}
  end

  defp do_relay_outbound(_other, state), do: {state, :ok}

  # --- Inbound Helpers (IRC -> Game) ------------------------------------------

  defp do_handle_inbound(event, state) when is_map(event) do
    origin = event["origin"] || "irc"
    raw_id = event["id"] || next_msg_id("irc")
    key = {to_origin(origin), to_string(raw_id)}

    case SeenLedger.record(state.ledger, key) do
      {:seen, _ledger} ->
        # Loop prevention: drop re-entrant event carrying seen ID
        Logger.debug("dropping reflected chat event origin=#{origin} id=#{raw_id}")
        {state, {:dropped, :duplicate}}

      {:new, updated_ledger} ->
        state = %{state | ledger: updated_ledger}
        state = process_inbound_frame(event, state)
        {state, :ok}
    end
  end

  defp do_handle_inbound(_other, state), do: {state, :ignored}

  defp process_inbound_frame(%{"type" => type} = event, state) when type in ["chat_relay", "chat_message"] do
    from = event["from"] || "irc"
    text = event["text"] || ""
    is_action = truthy?(event["action"] || event["is_action"])

    if state.relay do
      Relay.receive_irc_message(state.relay, from, text, is_action)
    end

    state
  end

  defp process_inbound_frame(%{"type" => type} = event, state) when type in ["chat_relay_dm", "chat_dm"] do
    from = event["from"] || "irc"
    to = event["to"] || ""
    text = event["text"] || ""
    is_action = truthy?(event["action"] || event["is_action"])

    if state.relay do
      Relay.receive_irc_dm(state.relay, from, to, text, is_action)
    end

    state
  end

  defp process_inbound_frame(%{"type" => type} = event, state) when type in ["chat_presence", "presence"] do
    evt = event["event"] || "join"
    who = event["who"] || "irc_user"

    irc_nicks =
      case evt do
        "join" -> MapSet.put(state.irc_nicks, who)
        "part" -> MapSet.delete(state.irc_nicks, who)
        _ -> state.irc_nicks
      end

    if state.relay do
      Relay.receive_irc_presence(state.relay, evt, who)
    end

    %{state | irc_nicks: irc_nicks}
  end

  defp process_inbound_frame(_other, state), do: state

  # --- Adapter Communication --------------------------------------------------

  defp forward_to_adapter(_payload, %{status: :down}), do: :ok

  defp forward_to_adapter(payload, %{adapter: pid}) when is_pid(pid) do
    send(pid, {:sidecar_outbound, payload})
    :ok
  end

  defp forward_to_adapter(payload, %{adapter: mod}) when is_atom(mod) and not is_nil(mod) do
    if Code.ensure_loaded?(mod) and function_exported?(mod, :send_event, 1) do
      mod.send_event(payload)
    end
    :ok
  end

  defp forward_to_adapter(_payload, _state), do: :ok

  defp next_msg_id(origin) do
    "msg_#{origin}_#{System.unique_integer([:positive])}"
  end

  defp to_origin("game"), do: :game
  defp to_origin(:game), do: :game
  defp to_origin("irc"), do: :irc
  defp to_origin(:irc), do: :irc
  defp to_origin(other), do: other

  defp truthy?(nil), do: false
  defp truthy?(false), do: false
  defp truthy?(""), do: false
  defp truthy?(0), do: false
  defp truthy?(_), do: true
end
