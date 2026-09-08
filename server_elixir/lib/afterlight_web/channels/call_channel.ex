defmodule AfterlightWeb.CallChannel do
  @moduledoc """
  Phoenix Channel for call signaling on topic `call:<id>` (P8 design D3).

  Responsibilities:
    * Authorized join against server-verified identity, room/call membership,
      moderation state, and participant capacity cap.
    * Feature flag check: rejects join when conferencing is disabled.
    * Short-lived media grant and TURN credential delivery on join and renewal.
    * Per-command membership re-check on signaling commands.
    * SDP/ICE signal relay between authorized call participants only.
    * Participant join/leave/mute/revoke event propagation.
    * Log hygiene: grant tokens, TURN credentials, and SDP payloads are never logged.
  """

  use Phoenix.Channel
  require Logger
  require Ash.Query

  alias Afterlight.Conferencing
  alias Afterlight.Conferencing.{CallMembership, Feature, Turn}
  alias Afterlight.Media.Allocator
  alias Afterlight.Media.Worker

  @impl true
  def join("call:" <> call_id, _params, socket) do
    if not Feature.enabled?() do
      {:error, %{reason: "conferencing_disabled"}}
    else
      guest_id = socket.assigns[:guest_id]

      if is_nil(guest_id) do
        {:error, %{reason: "unauthenticated"}}
      else
        authorize_and_join(call_id, guest_id, socket)
      end
    end
  end

  defp authorize_and_join(call_id, guest_id, socket) do
    actor = Conferencing.actor(guest_id)

    # 1. Authorize join and register/verify membership in Ash domain
    case Conferencing.authorize_join(call_id, actor: actor) do
      {:ok, _membership} ->
        complete_join(call_id, guest_id, socket, actor)

      {:error, error} ->
        reason = Exception.message(error)
        Logger.info("call join rejected call=#{call_id} guest=#{guest_id} reason=#{reason}")
        {:error, %{reason: reason}}
    end
  end

  defp complete_join(call_id, guest_id, socket, actor) do
    # 2. Issue media grant
    with {:ok, %{token: grant_token, expires_at: expires_at}} <-
           Conferencing.issue_media_grant(call_id, actor: actor),
         # 3. Issue TURN credentials
         turn_creds = Turn.issue_credentials(guest_id),
         # 4. Ensure media worker is allocated
         {:ok, _alloc} <- Allocator.allocate(call_id),
         # 5. Join media worker
         {:ok, _worker_info} <- Worker.join(call_id, guest_id, grant_token) do
      # 6. Fetch other participants
      participants = list_participants(call_id)

      # 7. Notify others after join completes
      send(self(), :after_join)

      # Log connection hygiene: never log token or TURN secret
      Logger.info("call join accepted call=#{call_id} guest=#{guest_id}")

      reply = %{
        call_id: call_id,
        player_id: guest_id,
        grant: grant_token,
        expires_at: expires_at,
        turn: turn_creds,
        participants: participants
      }

      {:ok, reply,
       socket
       |> assign(:call_id, call_id)
       |> assign(:grant_token, grant_token)}
    else
      {:error, reason} ->
        Logger.warning("call setup failed call=#{call_id} guest=#{guest_id} reason=#{inspect(reason)}")
        {:error, %{reason: "media_worker_error"}}
    end
  end

  @impl true
  def handle_in("signal", %{"target_player_id" => target, "type" => type} = payload, socket) do
    call_id = socket.assigns.call_id
    guest_id = socket.assigns.guest_id
    grant_token = socket.assigns.grant_token

    with :ok <- require_active_member(call_id, guest_id),
         :ok <- require_active_member(call_id, target),
         :ok <- Worker.signal(call_id, guest_id, grant_token, payload) do
      # Relay signal envelope to target participant on this call topic
      # Payload contains signal data; credentials are never in signal payload
      broadcast_from!(socket, "signal", %{
        from_player_id: guest_id,
        target_player_id: target,
        type: type,
        data: Map.get(payload, "data", %{})
      })

      {:reply, :ok, socket}
    else
      {:error, reason} ->
        {:reply, {:error, %{reason: to_string(reason)}}, socket}
    end
  end

  @impl true
  def handle_in("mute", %{"kind" => kind, "muted" => muted?}, socket) do
    call_id = socket.assigns.call_id
    guest_id = socket.assigns.guest_id
    grant_token = socket.assigns.grant_token

    with :ok <- require_active_member(call_id, guest_id),
         :ok <- Worker.set_mute(call_id, guest_id, grant_token, kind, muted?) do
      broadcast!(socket, "participant_muted", %{
        player_id: guest_id,
        kind: kind,
        muted: muted?
      })

      {:reply, :ok, socket}
    else
      {:error, reason} ->
        {:reply, {:error, %{reason: to_string(reason)}}, socket}
    end
  end

  @impl true
  def handle_in("renew_grant", _params, socket) do
    call_id = socket.assigns.call_id
    guest_id = socket.assigns.guest_id
    actor = Conferencing.actor(guest_id)

    with :ok <- require_active_member(call_id, guest_id),
         {:ok, %{token: new_token, expires_at: expires_at}} <-
           Conferencing.renew_grant(call_id, actor: actor) do
      Logger.info("grant renewed call=#{call_id} guest=#{guest_id}")
      {:reply, {:ok, %{grant: new_token, expires_at: expires_at}}, assign(socket, :grant_token, new_token)}
    else
      {:error, reason} ->
        {:reply, {:error, %{reason: to_string(reason)}}, socket}
    end
  end

  @impl true
  def handle_in("leave", _params, socket) do
    call_id = socket.assigns.call_id
    guest_id = socket.assigns.guest_id
    actor = Conferencing.actor(guest_id)

    _ = Conferencing.leave_call(call_id, actor: actor)
    _ = Worker.remove_participant(call_id, guest_id)

    broadcast!(socket, "participant_left", %{player_id: guest_id})
    Logger.info("call leave call=#{call_id} guest=#{guest_id}")

    {:stop, :normal, :ok, socket}
  end

  @impl true
  def handle_info(:after_join, socket) do
    broadcast_from!(socket, "participant_joined", %{player_id: socket.assigns.guest_id})
    {:noreply, socket}
  end

  @impl true
  def terminate(_reason, socket) do
    call_id = socket.assigns[:call_id]
    guest_id = socket.assigns[:guest_id]

    if call_id && guest_id do
      actor = Conferencing.actor(guest_id)
      _ = Conferencing.leave_call(call_id, actor: actor)
      _ = Worker.remove_participant(call_id, guest_id)
      broadcast!(socket, "participant_left", %{player_id: guest_id})
    end

    :ok
  end

  # --- Helpers ---

  defp require_active_member(call_id, player_id) do
    case CallMembership
         |> Ash.Query.filter(call_id == ^call_id and player_id == ^player_id and state == :joined)
         |> Ash.read_one(authorize?: false) do
      {:ok, %{state: :joined}} -> :ok
      _ -> {:error, :not_member}
    end
  end

  defp list_participants(call_id) do
    CallMembership
    |> Ash.Query.filter(call_id == ^call_id and state == :joined)
    |> Ash.read!(authorize?: false)
    |> Enum.map(fn m ->
      %{player_id: m.player_id, joined_at: m.joined_at}
    end)
  end
end
