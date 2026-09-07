defmodule Afterlight.Social do
  @moduledoc """
  Context for Afterlight chat and social features.

  Owns:
    * The game chat relay (`Afterlight.Social.Relay`).
    * The IRC sidecar bridge (`Afterlight.Social.Bridge`).
    * The chat parser and caps (`Afterlight.Social.Parser`).
  """

  alias Afterlight.Social.Relay

  @doc "Notifies the relay of a player connection (or superseded reconnect)."
  def player_connected(guest_id, conn_ref, channel_pid, nickname) do
    Relay.player_connected(guest_id, conn_ref, channel_pid, nickname)
  end

  @doc "Notifies the relay of a player disconnection."
  def player_disconnected(guest_id, conn_ref) do
    Relay.player_disconnected(guest_id, conn_ref)
  end

  @doc "Updates the nickname for a player session."
  def update_nickname(guest_id, nickname) do
    Relay.update_nickname(guest_id, nickname)
  end

  @doc "Pushes targeted chat_history (up to 50 items) to the channel process."
  def send_history(channel_pid) do
    Relay.send_history(channel_pid)
  end

  @doc "Returns the last 50 channel messages."
  def get_history do
    Relay.get_history()
  end

  @doc "Submits a raw chat string from a player."
  def chat_send(guest_id, conn_ref, raw_text) do
    Relay.handle_chat_send(guest_id, conn_ref, raw_text)
  end

  @doc "Returns a list of all active player nicknames in the chat relay."
  def list_players do
    Relay.list_players()
  end
end
