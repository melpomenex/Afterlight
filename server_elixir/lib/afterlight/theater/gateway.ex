defmodule Afterlight.Theater.Gateway do
  @moduledoc """
  Phoenix gateway handlers for theater client messages (design D1/D3).

  Wired from `GameChannel` when router disposition is `:phoenix`; the base
  routing table still relays to Node until the cutover flip.
  """

  alias Afterlight.Theater
  alias Afterlight.Theater.{PlaylistResolve, SessionTracker}

  @theater_room "theater"
  @queue_ops ~w(add addMany remove playNow skip clear)
  @control_ops ~w(pause resume seek ended failed)

  @doc """
  Handle a theater client push. Returns `{:noreply, replies}` where
  `replies` is a list of `{event, payload}` tuples to push to the socket.
  """
  @spec handle(String.t(), map(), map()) :: {:noreply, [{String.t(), map()}]}
  def handle(type, payload, ctx) when is_map(payload) and is_map(ctx) do
    player_id = ctx[:guest_id] || ctx["guest_id"]
    conn_ref = ctx[:conn_ref] || ctx["conn_ref"]
    nickname = ctx[:nickname] || ctx["nickname"] || player_id
    wire_room = ctx[:world_room][:wire_id] || ctx[:world_room]["wire_id"]

    cond do
      wire_room != @theater_room ->
        {:noreply, [error("You need to be inside The Orpheum to reach the projector.")]}

      type == "theater_playlist_resolve" ->
        handle_playlist_resolve(payload, player_id, conn_ref)

      type == "theater_channel" ->
        action = channel_action(payload)
        dispatch_action(action, player_id, conn_ref, nickname, nil)

      type == "theater_queue" ->
        dispatch_action(payload, player_id, conn_ref, nickname, nil)

      type == "theater_control" ->
        dispatch_action(payload, player_id, conn_ref, nickname, session_key(player_id, conn_ref))

      true ->
        {:noreply, [error("The projector ignores that.")]}
    end
  end

  defp dispatch_action(%{"op" => op} = action, player_id, conn_ref, nickname, session_key)
       when op in @queue_ops or op in @control_ops do
    receipt_id = mint_receipt_id()

    result =
      Theater.apply_action(@theater_room, action, nickname,
        session_key: session_key,
        receipt_id: receipt_id,
        receipt_actor: player_id
      )

    case result do
      {:ok, commit} ->
        Afterlight.Specialty.BillSync.sync_now()
        stamp_session(player_id, conn_ref, commit)
        replies = commit_replies(commit, player_id)
        {:noreply, replies}

      {:error, reason} when is_binary(reason) ->
        {:noreply, [error(Theater.error_text(reason))]}
    end
  end

  defp dispatch_action(_action, _player_id, _conn_ref, _nickname, _session_key) do
    {:noreply, [error(Theater.error_text("invalid_action"))]}
  end

  defp handle_playlist_resolve(payload, player_id, _conn_ref) do
    request_id = to_string(payload["requestId"] || "")
    list_id = to_string(payload["listId"] || "")

    with :ok <- PlaylistResolve.check_in_flight(player_id),
         :ok <- PlaylistResolve.check_cooldown(player_id),
         :ok <- PlaylistResolve.decline_mix(list_id) do
      PlaylistResolve.mark_started(player_id)

      case PlaylistResolve.enqueue(request_id, list_id, player_id) do
        {:ok, _job} ->
          {:noreply, []}

        {:error, _reason} ->
          PlaylistResolve.mark_finished(player_id)
          {:noreply, [error(Theater.error_text("playlist_unreadable"))]}
      end
    else
      {:error, reason} -> {:noreply, [error(Theater.error_text(reason))]}
    end
  end

  defp channel_action(payload) do
    %{
      "op" => "channel",
      "url" => payload["url"],
      "title" => payload["title"],
      "torrentName" => payload["torrentName"],
      "fileIndex" => payload["fileIndex"],
      "filePath" => payload["filePath"],
      "fileBytes" => payload["fileBytes"]
    }
  end

  defp commit_replies(commit, _player_id) do
    import =
      case commit[:report] || commit["report"] do
        %{} = report ->
          [{"theater_import_result", %{
            "queued" => report["queued"] || report[:queued],
            "skipped" => report["skipped"] || report[:skipped],
            "didNotFit" => report["didNotFit"] || report[:didNotFit]
          }}]

        _ ->
          []
      end

    import
  end

  defp stamp_session(player_id, conn_ref, commit) do
    SessionTracker.stamp(
      session_key(player_id, conn_ref),
      commit[:revision] || commit["revision"],
      commit[:now_generation] || commit["now_generation"] || 0
    )
  end

  defp session_key(player_id, conn_ref), do: SessionTracker.session_key(player_id, conn_ref)

  defp mint_receipt_id do
    "srv_" <> Base.encode16(:crypto.strong_rand_bytes(8), case: :lower)
  end

  defp error(message), do: {"error", %{"message" => message}}
end
