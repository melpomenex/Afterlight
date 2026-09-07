defmodule Afterlight.Social.Relay do
  @moduledoc """
  Single-writer GenServer for the `#afterlight` game chat relay.

  Owns:
    * The single global channel `#afterlight`.
    * In-memory ephemeral history ring: keeps the last 100 accepted messages,
      delivers the last 50 in chronological insertion order on connect.
    * Sessions: tracks connected game sessions (`guest_id => %{conn_ref, channel_pid, nickname}`).
    * Exactly-once sender echo on channel broadcasts (holds in bridged and degraded modes).
    * Direct message routing (`chat_dm`) to sender with `echo: true` and recipient without `echo`.
    * Presence broadcasts on player join/part and IRC join/part.
      Duplicate transport connections for the same player supersede in place
      without producing duplicate presence transitions.
  """

  use GenServer
  require Logger

  alias Afterlight.Social.Parser

  @history_keep 100
  @history_deliver 50
  @default_channel "#afterlight"

  defstruct [
    channel: @default_channel,
    history: [],
    sessions: %{},
    nicks: %{},
    monitors: %{},
    bridge: nil
  ]

  # --- Client API -------------------------------------------------------------

  def start_link(opts \\ []) do
    name = Keyword.get(opts, :name, __MODULE__)
    GenServer.start_link(__MODULE__, opts, name: name)
  end

  @doc """
  Registers a player connection or supersedes an existing connection for the same player.
  Only emits a presence `join` if this is a new logical session (superseded duplicates
  produce no extra join/part transitions).
  """
  def player_connected(relay \\ __MODULE__, guest_id, conn_ref, channel_pid, nickname) do
    GenServer.call(relay, {:player_connected, guest_id, conn_ref, channel_pid, nickname})
  end

  @doc """
  Disconnects a player connection if `conn_ref` matches the current active connection.
  Emits a presence `part` only when the active session is actually removed.
  """
  def player_disconnected(relay \\ __MODULE__, guest_id, conn_ref) do
    GenServer.call(relay, {:player_disconnected, guest_id, conn_ref})
  end

  @doc "Updates a player's nickname (e.g. after sanitized welcome or set_nickname)."
  def update_nickname(relay \\ __MODULE__, guest_id, nickname) do
    GenServer.call(relay, {:update_nickname, guest_id, nickname})
  end

  @doc "Sends targeted chat_history (up to 50 messages) to the specified channel_pid."
  def send_history(relay \\ __MODULE__, channel_pid) do
    GenServer.call(relay, {:send_history, channel_pid})
  end

  @doc "Returns the current history messages (last 50 in chronological order)."
  def get_history(relay \\ __MODULE__) do
    GenServer.call(relay, :get_history)
  end

  @doc "Handles raw text submission from a connected player."
  def handle_chat_send(relay \\ __MODULE__, guest_id, conn_ref, raw_text) do
    GenServer.call(relay, {:chat_send, guest_id, conn_ref, raw_text})
  end

  @doc "Delivers an inbound channel message from IRC."
  def receive_irc_message(relay \\ __MODULE__, from, text, is_action \\ false) do
    GenServer.call(relay, {:receive_irc_message, from, text, is_action})
  end

  @doc "Delivers an inbound direct message from IRC to a game player."
  def receive_irc_dm(relay \\ __MODULE__, from, target_player_name, text, is_action \\ false) do
    GenServer.call(relay, {:receive_irc_dm, from, target_player_name, text, is_action})
  end

  @doc "Broadcasts an IRC presence transition (join or part) to all game sessions."
  def receive_irc_presence(relay \\ __MODULE__, event, who) do
    GenServer.call(relay, {:receive_irc_presence, event, who})
  end

  @doc "Returns active game player nicknames."
  def list_players(relay \\ __MODULE__) do
    GenServer.call(relay, :list_players)
  end

  @doc "Sets or updates the bridge module or PID."
  def set_bridge(relay \\ __MODULE__, bridge) do
    GenServer.call(relay, {:set_bridge, bridge})
  end

  # --- Server Callbacks -------------------------------------------------------

  @impl true
  def init(opts) do
    bridge = Keyword.get(opts, :bridge, nil)
    {:ok, %__MODULE__{bridge: bridge}}
  end

  @impl true
  def handle_call({:player_connected, guest_id, conn_ref, channel_pid, nickname}, _from, state) do
    clean_nick = if is_binary(nickname) and nickname != "", do: nickname, else: guest_id
    existing = Map.get(state.sessions, guest_id)

    {state, is_new} =
      if existing do
        # Superseded duplicate: replace connection in place; no presence broadcast
        Process.demonitor(existing.monitor_ref, [:flush])
        mref = Process.monitor(channel_pid)

        # Update nicks map if nickname changed
        nicks =
          state.nicks
          |> Map.delete(String.downcase(existing.nickname))
          |> Map.put(String.downcase(clean_nick), guest_id)

        session = %{
          conn_ref: conn_ref,
          channel_pid: channel_pid,
          nickname: clean_nick,
          monitor_ref: mref
        }

        monitors =
          state.monitors
          |> Map.delete(existing.monitor_ref)
          |> Map.put(mref, guest_id)

        state = %{
          state
          | sessions: Map.put(state.sessions, guest_id, session),
            nicks: nicks,
            monitors: monitors
        }

        {state, false}
      else
        # Fresh connection: monitor and broadcast join
        mref = Process.monitor(channel_pid)

        session = %{
          conn_ref: conn_ref,
          channel_pid: channel_pid,
          nickname: clean_nick,
          monitor_ref: mref
        }

        state = %{
          state
          | sessions: Map.put(state.sessions, guest_id, session),
            nicks: Map.put(state.nicks, String.downcase(clean_nick), guest_id),
            monitors: Map.put(state.monitors, mref, guest_id)
        }

        {state, true}
      end

    if is_new do
      ts = System.system_time(:millisecond)

      presence = %{
        "channel" => state.channel,
        "event" => "join",
        "who" => clean_nick,
        "fromKind" => "player",
        "ts" => ts
      }

      broadcast_to_all(state.sessions, "chat_presence", presence)
      notify_bridge(state.bridge, {:player_joined, guest_id, clean_nick})
    end

    {:reply, :ok, state}
  end

  @impl true
  def handle_call({:player_disconnected, guest_id, conn_ref}, _from, state) do
    case Map.get(state.sessions, guest_id) do
      %{conn_ref: ^conn_ref} = session ->
        Process.demonitor(session.monitor_ref, [:flush])
        state = remove_session(state, guest_id, session)

        ts = System.system_time(:millisecond)

        presence = %{
          "channel" => state.channel,
          "event" => "part",
          "who" => session.nickname,
          "fromKind" => "player",
          "ts" => ts
        }

        broadcast_to_all(state.sessions, "chat_presence", presence)
        notify_bridge(state.bridge, {:player_parted, guest_id, session.nickname})

        {:reply, :ok, state}

      _ ->
        # Stale conn_ref: connection was already superseded or disconnected
        {:reply, :ok, state}
    end
  end

  @impl true
  def handle_call({:update_nickname, guest_id, new_nickname}, _from, state) do
    case Map.get(state.sessions, guest_id) do
      nil ->
        {:reply, :ok, state}

      session ->
        old_nick = session.nickname

        if old_nick != new_nickname and is_binary(new_nickname) and new_nickname != "" do
          nicks =
            state.nicks
            |> Map.delete(String.downcase(old_nick))
            |> Map.put(String.downcase(new_nickname), guest_id)

          updated_session = %{session | nickname: new_nickname}
          state = %{state | sessions: Map.put(state.sessions, guest_id, updated_session), nicks: nicks}
          notify_bridge(state.bridge, {:nickname_changed, guest_id, old_nick, new_nickname})
          {:reply, :ok, state}
        else
          {:reply, :ok, state}
        end
    end
  end

  @impl true
  def handle_call({:send_history, channel_pid}, _from, state) do
    messages = Enum.take(state.history, @history_deliver) |> Enum.reverse()

    send(channel_pid, {:chat_push, "chat_history", %{
      "channel" => state.channel,
      "messages" => messages
    }})

    {:reply, :ok, state}
  end

  @impl true
  def handle_call(:get_history, _from, state) do
    messages = Enum.take(state.history, @history_deliver) |> Enum.reverse()
    {:reply, messages, state}
  end

  @impl true
  def handle_call(:list_players, _from, state) do
    players = Enum.map(state.sessions, fn {_id, s} -> s.nickname end)
    {:reply, players, state}
  end

  @impl true
  def handle_call({:set_bridge, bridge}, _from, state) do
    {:reply, :ok, %{state | bridge: bridge}}
  end

  @impl true
  def handle_call({:chat_send, guest_id, conn_ref, raw_text}, _from, state) do
    case Map.get(state.sessions, guest_id) do
      %{conn_ref: ^conn_ref} = session ->
        other_players =
          for {id, s} <- state.sessions, id != guest_id, do: s.nickname

        irc_nicks = get_bridge_irc_nicks(state.bridge)

        parsed =
          Parser.parse(raw_text,
            sender: session.nickname,
            players: other_players,
            irc_nicks: irc_nicks
          )

        state = dispatch_parsed(parsed, session, state)
        {:reply, :ok, state}

      _ ->
        {:reply, :error, state}
    end
  end

  @impl true
  def handle_call({:receive_irc_message, from, text, is_action}, _from, state) do
    ts = System.system_time(:millisecond)

    msg = %{
      "channel" => state.channel,
      "from" => from,
      "fromKind" => "irc",
      "text" => text,
      "ts" => ts
    }

    msg = if is_action, do: Map.put(msg, "action", true), else: msg
    state = append_history(state, msg)
    broadcast_to_all(state.sessions, "chat_message", msg)

    {:reply, :ok, state}
  end

  @impl true
  def handle_call({:receive_irc_dm, from, target_player_name, text, is_action}, _from, state) do
    target_lower = String.downcase(target_player_name)

    case Map.get(state.nicks, target_lower) do
      nil ->
        {:reply, :not_found, state}

      recipient_id ->
        case Map.get(state.sessions, recipient_id) do
          nil ->
            {:reply, :not_found, state}

          recipient ->
            ts = System.system_time(:millisecond)

            dm = %{
              "from" => from,
              "fromKind" => "irc",
              "to" => recipient.nickname,
              "text" => text,
              "ts" => ts
            }

            dm = if is_action, do: Map.put(dm, "action", true), else: dm
            send(recipient.channel_pid, {:chat_push, "chat_dm", dm})
            {:reply, :ok, state}
        end
    end
  end

  @impl true
  def handle_call({:receive_irc_presence, event, who}, _from, state) do
    ts = System.system_time(:millisecond)

    presence = %{
      "channel" => state.channel,
      "event" => event,
      "who" => who,
      "fromKind" => "irc",
      "ts" => ts
    }

    broadcast_to_all(state.sessions, "chat_presence", presence)
    {:reply, :ok, state}
  end

  @impl true
  def handle_info({:DOWN, mref, :process, _pid, _reason}, state) do
    case Map.get(state.monitors, mref) do
      nil ->
        {:noreply, state}

      guest_id ->
        session = Map.get(state.sessions, guest_id)
        state = remove_session(state, guest_id, session)

        if session do
          ts = System.system_time(:millisecond)

          presence = %{
            "channel" => state.channel,
            "event" => "part",
            "who" => session.nickname,
            "fromKind" => "player",
            "ts" => ts
          }

          broadcast_to_all(state.sessions, "chat_presence", presence)
          notify_bridge(state.bridge, {:player_parted, guest_id, session.nickname})
        end

        {:noreply, state}
    end
  end

  def handle_info(_other, state), do: {:noreply, state}

  # --- Internal Helpers -------------------------------------------------------

  defp dispatch_parsed(%{"error" => err}, session, state) do
    send(session.channel_pid, {:chat_push, "chat_error", %{"message" => err}})
    state
  end

  defp dispatch_parsed(%{"kind" => "help", "text" => help_text}, session, state) do
    send(session.channel_pid, {:chat_push, "chat_message", %{
      "channel" => state.channel,
      "fromKind" => "system",
      "from" => "afterlight",
      "text" => help_text,
      "ts" => System.system_time(:millisecond)
    }})

    state
  end

  defp dispatch_parsed(%{"kind" => "me", "text" => action_text}, session, state) do
    ts = System.system_time(:millisecond)

    msg = %{
      "channel" => state.channel,
      "from" => session.nickname,
      "fromKind" => "player",
      "text" => action_text,
      "action" => true,
      "ts" => ts
    }

    state = append_history(state, msg)
    broadcast_to_all(state.sessions, "chat_message", msg)
    notify_bridge(state.bridge, {:channel_message, session.nickname, action_text, true})
    state
  end

  defp dispatch_parsed(%{"kind" => "message", "text" => text}, session, state) do
    ts = System.system_time(:millisecond)

    msg = %{
      "channel" => state.channel,
      "from" => session.nickname,
      "fromKind" => "player",
      "text" => text,
      "ts" => ts
    }

    state = append_history(state, msg)
    broadcast_to_all(state.sessions, "chat_message", msg)
    notify_bridge(state.bridge, {:channel_message, session.nickname, text, false})
    state
  end

  defp dispatch_parsed(%{"kind" => "dm", "target" => target_name, "targetKind" => "player", "text" => body}, session, state) do
    target_lower = String.downcase(target_name)

    case Map.get(state.nicks, target_lower) do
      nil ->
        send(session.channel_pid, {:chat_push, "chat_error", %{
          "message" => "No one called #{target_name} is around right now."
        }})
        state

      recipient_id ->
        case Map.get(state.sessions, recipient_id) do
          nil ->
            send(session.channel_pid, {:chat_push, "chat_error", %{
              "message" => "No one called #{target_name} is around right now."
            }})
            state

          recipient ->
            ts = System.system_time(:millisecond)

            # Recipient gets normal DM
            send(recipient.channel_pid, {:chat_push, "chat_dm", %{
              "from" => session.nickname,
              "fromKind" => "player",
              "to" => recipient.nickname,
              "text" => body,
              "ts" => ts
            }})

            # Sender gets echo copy with echo: true
            send(session.channel_pid, {:chat_push, "chat_dm", %{
              "from" => session.nickname,
              "fromKind" => "player",
              "to" => recipient.nickname,
              "text" => body,
              "ts" => ts,
              "echo" => true
            }})

            state
        end
    end
  end

  defp dispatch_parsed(%{"kind" => "dm", "target" => target_name, "targetKind" => "irc", "text" => body}, session, state) do
    ts = System.system_time(:millisecond)

    # Sender gets echo copy with echo: true
    send(session.channel_pid, {:chat_push, "chat_dm", %{
      "from" => session.nickname,
      "fromKind" => "player",
      "to" => target_name,
      "text" => body,
      "ts" => ts,
      "echo" => true
    }})

    notify_bridge(state.bridge, {:direct_message, session.nickname, target_name, body})
    state
  end

  defp append_history(state, msg) do
    history = Enum.take([msg | state.history], @history_keep)
    %{state | history: history}
  end

  defp broadcast_to_all(sessions, event, payload) do
    Enum.each(sessions, fn {_guest_id, session} ->
      send(session.channel_pid, {:chat_push, event, payload})
    end)
  end

  defp remove_session(state, guest_id, session) do
    sessions = Map.delete(state.sessions, guest_id)

    nicks =
      if session do
        Map.delete(state.nicks, String.downcase(session.nickname))
      else
        state.nicks
      end

    monitors =
      if session do
        Map.delete(state.monitors, session.monitor_ref)
      else
        state.monitors
      end

    %{state | sessions: sessions, nicks: nicks, monitors: monitors}
  end

  defp notify_bridge(nil, _event), do: :ok

  defp notify_bridge(bridge_pid, event) when is_pid(bridge_pid) do
    send(bridge_pid, {:relay_event, event})
    :ok
  end

  defp notify_bridge(bridge_mod, event) when is_atom(bridge_mod) do
    if Code.ensure_loaded?(bridge_mod) and function_exported?(bridge_mod, :relay_event, 1) do
      bridge_mod.relay_event(event)
    end
    :ok
  end

  defp get_bridge_irc_nicks(nil), do: []

  defp get_bridge_irc_nicks(bridge_pid) when is_pid(bridge_pid) do
    try do
      GenServer.call(bridge_pid, :irc_nicks, 500)
    catch
      _, _ -> []
    end
  end

  defp get_bridge_irc_nicks(bridge_mod) when is_atom(bridge_mod) do
    if Code.ensure_loaded?(bridge_mod) and function_exported?(bridge_mod, :irc_nicks, 0) do
      bridge_mod.irc_nicks()
    else
      []
    end
  end
end
