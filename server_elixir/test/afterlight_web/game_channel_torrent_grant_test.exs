defmodule AfterlightWeb.GameChannelTorrentGrantTest do
  @moduledoc """
  fix-torrent-playback-grant-regression: the production grant lifecycle at
  the channel boundary.

  These tests exist because the P7 `TheaterSession` lifecycle was never wired
  into `GameChannel`: a participant could receive `theater_state` for a live
  torrent and never receive a `torrent_grant`, so the browser's first stream
  request went unsigned and was refused 403. Every assertion here goes through
  the real channel (`join_room`, `theater_queue`, `theater_channel`,
  outbox-broadcast frames), not through `TheaterSession` directly.

  Ordered pushes assert the ordering contract: a matching participant grant is
  delivered **before** the `theater_state` that instructs playback.

  Mailbox-isolation caveat: `Phoenix.ChannelTest` makes the test process the
  transport for every socket, so "another occupant's token never arrives" is
  pinned by the shape assertions (shared `theater_state` is token-free) and by
  the participant claims themselves rather than by separate mailboxes.
  """

  use Afterlight.DataCase, async: false

  import Phoenix.ChannelTest

  require Ash.Query

  @endpoint AfterlightWeb.Endpoint

  alias Afterlight.Repo
  alias Afterlight.Specialty.Grants
  alias Afterlight.Theater

  @theater_routing %{
    "join_room" => :phoenix,
    "movement" => :phoenix,
    "emote" => :phoenix,
    "theater_queue" => :phoenix,
    "theater_control" => :phoenix,
    "theater_channel" => :phoenix
  }

  @infohash "08ada5a7a6183aae1e09d831df6748d566095a10"
  @other_infohash "f5e0b9d5f9d5e6f5a5b5c5d5e5f5060708090a0b"
  @magnet "magnet:?xt=urn:btih:#{@infohash}&dn=Sintel"
  @other_magnet "magnet:?xt=urn:btih:#{@other_infohash}&dn=BigBuckBunny"
  @secret "test-torrent-grant-secret-000000000000000000"

  @youtube "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  @mp4 "https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4"
  @hls "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
  @mkv "https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_1080p.mkv"

  setup do
    GatewayTest.FakeCore.set_owner(self())

    start_supervised!(Afterlight.Theater.Supervisor)

    # Deterministic bill: the shared test DB may carry non-sandbox rows.
    Repo.delete_all(from(ti in "theater_items"))
    Repo.delete_all(from(tr in "theater_rooms"))
    Repo.delete_all(from(e in "outbox_events"))

    prev_secret = Application.get_env(:afterlight, :torrent_grant_secret)
    prev_ttl = Application.get_env(:afterlight, :torrent_grant_ttl_secs)
    prev_env_secret = System.get_env("AFTERLIGHT_TORRENT_GRANT_SECRET")
    prev_env_prev = System.get_env("AFTERLIGHT_TORRENT_GRANT_SECRET_PREVIOUS")

    Application.put_env(:afterlight, :torrent_grant_secret, @secret)
    System.put_env("AFTERLIGHT_TORRENT_GRANT_SECRET", @secret)
    System.delete_env("AFTERLIGHT_TORRENT_GRANT_SECRET_PREVIOUS")

    on_exit(fn ->
      restore_app_env(:torrent_grant_secret, prev_secret)
      restore_app_env(:torrent_grant_ttl_secs, prev_ttl)
      restore_env("AFTERLIGHT_TORRENT_GRANT_SECRET", prev_env_secret)
      restore_env("AFTERLIGHT_TORRENT_GRANT_SECRET_PREVIOUS", prev_env_prev)
    end)

    :ok
  end

  defp restore_app_env(key, nil), do: Application.delete_env(:afterlight, key)
  defp restore_app_env(key, value), do: Application.put_env(:afterlight, key, value)

  defp restore_env(key, nil), do: System.delete_env(key)
  defp restore_env(key, value), do: System.put_env(key, value)

  defp flipped(fun), do: GatewayTest.ConfigLock.with_lock(:routing, @theater_routing, fun)

  # --- bill fixtures ---------------------------------------------------------

  defp torrent_action(opts \\ %{}) do
    Map.merge(
      %{
        "op" => "channel",
        "url" => @magnet,
        "title" => "Torrent A",
        "fileIndex" => 0,
        "filePath" => "Sintel/Sintel.mp4",
        "fileBytes" => 12_345
      },
      opts
    )
  end

  defp queue_torrent_action(opts \\ %{}) do
    torrent_action(opts) |> Map.put("op", "add")
  end

  defp put_torrent_live(opts \\ %{}) do
    assert {:ok, _} = Theater.apply_action("theater", queue_torrent_action(opts), "TorrentFan")
  end

  defp put_source_live(url, title, extra \\ %{}) do
    assert {:ok, _} =
             Theater.apply_action(
               "theater",
               Map.merge(%{"op" => "channel", "url" => url, "title" => title}, extra),
               "SourceFan"
             )
  end

  # --- channel helpers -------------------------------------------------------

  defp connect_and_join(guest_id, room \\ "theater") do
    {:ok, %{token: token}} = Afterlight.Gateway.Auth.issue(guest_id, nil)

    assert {:ok, socket} = connect(AfterlightWeb.UserSocket, %{"token" => token})
    assert {:ok, _, socket} = subscribe_and_join(socket, AfterlightWeb.GameChannel, "game:v1")
    Process.unlink(socket.channel_pid)

    push(socket, "hello", %{"guestId" => guest_id})
    assert_receive {:fake_frame, _up, _hello_json}, 1_000

    push(socket, "join_room", %{"roomId" => room})
    assert_push "presence_update", _roster
    assert_receive {:fake_frame, _up, _join_json}, 1_000
    socket
  end

  # Strict mailbox ordering: the next Phoenix push must be `expected`.
  defp next_event(expected, timeout \\ 2_000) do
    assert_receive %Phoenix.Socket.Message{event: ^expected} = message, timeout
    message
  end

  defp refute_event(expected, timeout \\ 300) do
    refute_receive %Phoenix.Socket.Message{event: ^expected}, timeout
  end

  # Consume theater_state pushes until one satisfies the predicate.
  defp next_state_matching(predicate, timeout \\ 3_000) do
    deadline = System.monotonic_time(:millisecond) + timeout

    do_next_state_matching(predicate, deadline)
  end

  defp do_next_state_matching(predicate, deadline) do
    remaining = max(deadline - System.monotonic_time(:millisecond), 0)

    assert_receive %Phoenix.Socket.Message{event: "theater_state", payload: payload}, remaining

    if predicate.(payload) do
      payload
    else
      do_next_state_matching(predicate, deadline)
    end
  end

  defp assert_grant_claims(payload, infohash, file_index, participant) do
    assert is_binary(payload["grant"])

    assert {:ok, claims} =
             Grants.verify(payload["grant"], infohash, file_index, secrets: [@secret])

    assert claims["participant"] == participant
    assert claims["infohash"] == infohash
    assert claims["fileIndex"] == file_index
    assert claims["exp"] > 0
    payload
  end

  defp assert_no_grant_fields(payload) do
    refute Map.has_key?(payload, "grant"), "theater_state leaked a grant token"
    refute Map.has_key?(payload, "expiresAtMs"), "theater_state leaked grant expiry"
    refute Map.has_key?(payload, "participant"), "theater_state leaked a participant"
  end

  # Collect precisely `count` torrent_grant pushes (shared-mailbox tests can
  # observe more than one participant's channel).
  defp collect_grants(count, timeout \\ 3_000) do
    deadline = System.monotonic_time(:millisecond) + timeout
    do_collect_grants(count, [], deadline)
  end

  defp do_collect_grants(0, acc, _deadline), do: Enum.reverse(acc)

  defp do_collect_grants(count, acc, deadline) do
    remaining = max(deadline - System.monotonic_time(:millisecond), 0)
    assert_receive %Phoenix.Socket.Message{event: "torrent_grant", payload: payload}, remaining
    do_collect_grants(count - 1, [payload | acc], deadline)
  end

  # --- 1/2: join snapshot ----------------------------------------------------

  test "join: a live torrent delivers the participant grant before theater_state" do
    flipped(fn ->
      put_torrent_live()

      socket = connect_and_join("guest_grant_join")

      grant = next_event("torrent_grant")
      assert_grant_claims(grant.payload, @infohash, 0, "guest_grant_join")

      state = next_event("theater_state")
      assert state.payload["theater"]["now"]["kind"] == "torrent"
      assert state.payload["theater"]["now"]["infohash"] == @infohash
      assert_no_grant_fields(state.payload)
      _ = socket
    end)
  end

  test "late join: a second participant gets their own grant before the join snapshot" do
    flipped(fn ->
      put_torrent_live()
      _first = connect_and_join("guest_grant_first")
      _ = next_event("torrent_grant")
      _ = next_event("theater_state")

      _late = connect_and_join("guest_grant_late")

      grant = next_event("torrent_grant")
      assert_grant_claims(grant.payload, @infohash, 0, "guest_grant_late")
      next_event("theater_state")
    end)
  end

  test "non-torrent sources mint no grant at join" do
    flipped(fn ->
      sources = [
        {"guest_grant_yt", @youtube, "YouTube"},
        {"guest_grant_mp4", @mp4, "MP4"},
        {"guest_grant_hls", @hls, "HLS"},
        {"guest_grant_prepare", @mkv, "Preparing MKV"}
      ]

      Enum.each(sources, fn {guest, url, title} ->
        Repo.delete_all(from(ti in "theater_items"))
        put_source_live(url, title)

        _socket = connect_and_join(guest)
        state = next_event("theater_state")
        refute state.payload["theater"]["now"]["kind"] == "torrent"
        refute_event("torrent_grant", 200)
      end)
    end)
  end

  test "join theater_state never carries grant material" do
    flipped(fn ->
      put_torrent_live()
      _socket = connect_and_join("guest_grant_shape")

      _grant = next_event("torrent_grant")
      state = next_event("theater_state")
      assert_no_grant_fields(state.payload)
    end)
  end

  # --- 3: acting player ------------------------------------------------------

  test "theater_channel with a torrent pick replies grant then state for the actor" do
    flipped(fn ->
      socket = connect_and_join("guest_grant_actor")
      _idle = next_state_matching(fn payload -> payload["theater"]["now"] == nil end)

      push(socket, "theater_channel", %{
        "url" => @magnet,
        "title" => "Torrent Actor",
        "fileIndex" => 0,
        "filePath" => "Sintel/Sintel.mp4",
        "fileBytes" => 12_345
      })

      grant = next_event("torrent_grant")
      assert_grant_claims(grant.payload, @infohash, 0, "guest_grant_actor")

      state = next_state_matching(fn payload -> payload["theater"]["now"]["kind"] == "torrent" end)
      assert state["theater"]["now"]["kind"] == "torrent"
      assert_no_grant_fields(state)
    end)
  end

  test "theater_queue add with a torrent pick replies grant then state" do
    flipped(fn ->
      socket = connect_and_join("guest_grant_queue")
      _idle = next_state_matching(fn payload -> payload["theater"]["now"] == nil end)

      push(socket, "theater_queue", queue_torrent_action())

      grant = next_event("torrent_grant")
      assert_grant_claims(grant.payload, @infohash, 0, "guest_grant_queue")
      next_state_matching(fn payload -> payload["theater"]["now"]["kind"] == "torrent" end)
    end)
  end

  test "theater_control on a live torrent keeps the lifecycle without minting again" do
    flipped(fn ->
      put_torrent_live()
      socket = connect_and_join("guest_grant_control")

      first = next_event("torrent_grant")
      assert_grant_claims(first.payload, @infohash, 0, "guest_grant_control")
      _state = next_event("theater_state")

      item_id = Theater.snapshot("theater")["now"]["id"]
      push(socket, "theater_control", %{"op" => "pause", "itemId" => item_id})

      state = next_event("theater_state")
      assert state.payload["theater"]["now"]["kind"] == "torrent"

      # Same key with a fresh context: a control op must not force a re-mint.
      refute_event("torrent_grant", 200)
    end)
  end

  test "a participant outside the theater cannot trigger minting" do
    flipped(fn ->
      put_torrent_live()
      socket = connect_and_join("guest_grant_wrong_room", "market")

      refute_event("torrent_grant", 100)

      push(socket, "theater_channel", torrent_action(%{"url" => @other_magnet}))

      assert_push "error", %{"op" => "channel"} = error
      assert is_binary(error["message"])
      refute_event("torrent_grant", 200)
    end)
  end

  # --- 4: other occupants ----------------------------------------------------

  test "two occupants each receive their own valid grant" do
    flipped(fn ->
      a_socket = connect_and_join("guest_grant_room_a")
      _b_socket = connect_and_join("guest_grant_room_b")
      _idle_a = next_state_matching(fn payload -> payload["theater"]["now"] == nil end)
      _idle_b = next_state_matching(fn payload -> payload["theater"]["now"] == nil end)

      # A acts; B learns through the room broadcast only. Both channels share
      # the test transport, so collect both grants and pin the claims set.
      push(a_socket, "theater_queue", queue_torrent_action(%{"title" => "Torrent Two"}))

      grants = collect_grants(2)

      claims =
        Enum.map(grants, fn payload ->
          assert is_binary(payload["grant"])
          assert {:ok, claims} = Grants.verify(payload["grant"], @infohash, 0, secrets: [@secret])
          claims
        end)

      participants = claims |> Enum.map(& &1["participant"]) |> Enum.sort()
      assert participants == ["guest_grant_room_a", "guest_grant_room_b"]

      # Distinct participant-scoped tokens, never one shared token.
      assert length(Enum.uniq(Enum.map(grants, & &1["grant"]))) == 2

      state = next_state_matching(fn payload -> payload["theater"]["now"]["kind"] == "torrent" end)
      assert_no_grant_fields(state)
    end)
  end

  test "forged participant fields cannot influence minted claims" do
    flipped(fn ->
      socket = connect_and_join("guest_grant_forged")

      action =
        torrent_action(%{"participant" => "guest_attacker", "participantId" => "guest_attacker"})

      push(socket, "theater_channel", action)

      grant = next_event("torrent_grant")
      assert {:ok, claims} = Grants.verify(grant.payload["grant"], @infohash, 0, secrets: [@secret])
      assert claims["participant"] == "guest_grant_forged"
      refute claims["participant"] == "guest_attacker"
    end)
  end

  test "the room broadcast theater_state frame carries no grant fields" do
    flipped(fn ->
      _a_socket = connect_and_join("guest_grant_broadcast_a")
      _b_socket = connect_and_join("guest_grant_broadcast_b")

      assert {:ok, _} = Theater.apply_action("theater", queue_torrent_action(), "OutboxFan")

      state = next_state_matching(fn payload -> payload["theater"]["now"]["kind"] == "torrent" end)
      assert_no_grant_fields(state)
    end)
  end

  # --- 5: renewal and teardown ----------------------------------------------

  test "renewal re-mints before the short test TTL expires" do
    flipped(fn ->
      Application.put_env(:afterlight, :torrent_grant_ttl_secs, 2)
      put_torrent_live()

      _socket = connect_and_join("guest_grant_renew")
      first = next_event("torrent_grant")
      assert_grant_claims(first.payload, @infohash, 0, "guest_grant_renew")

      second = next_event("torrent_grant", 3_500)
      assert_grant_claims(second.payload, @infohash, 0, "guest_grant_renew")
      assert second.payload["expiresAtMs"] > first.payload["expiresAtMs"]
      refute second.payload["grant"] == first.payload["grant"]

      now_sec = div(System.system_time(:millisecond), 1000)

      assert {:ok, _} =
               Grants.verify(first.payload["grant"], @infohash, 0,
                 secrets: [@secret],
                 now_sec: now_sec
               )
    end)
  end

  test "replacing the live torrent cancels the old lifecycle; stale renewal mints nothing" do
    flipped(fn ->
      put_torrent_live()
      socket = connect_and_join("guest_grant_replace")
      _first = next_event("torrent_grant")
      _state = next_event("theater_state")

      put_source_live(@youtube, "Replacement")

      replacement =
        next_state_matching(fn payload -> payload["theater"]["now"]["kind"] == "youtube" end)

      assert replacement["theater"]["now"]["kind"] == "youtube"

      send(socket.channel_pid, {:torrent_grant_renew, {@infohash, 0}})
      refute_event("torrent_grant", 300)
    end)
  end

  test "a file change mints a grant for the new file index" do
    flipped(fn ->
      put_torrent_live(%{"fileIndex" => 0, "filePath" => "Sintel/Sintel.mp4"})
      socket = connect_and_join("guest_grant_file_change")
      _first = next_event("torrent_grant")
      _state = next_event("theater_state")

      push(
        socket,
        "theater_channel",
        torrent_action(%{"fileIndex" => 2, "filePath" => "Sintel/Sintel-1080.mp4"})
      )

      changed = next_event("torrent_grant")
      assert_grant_claims(changed.payload, @infohash, 2, "guest_grant_file_change")

      next_state_matching(fn payload -> payload["theater"]["now"]["fileIndex"] == 2 end)
    end)
  end

  test "leaving the theater stops renewal" do
    flipped(fn ->
      put_torrent_live()
      socket = connect_and_join("guest_grant_leave")
      _first = next_event("torrent_grant")
      _state = next_event("theater_state")

      push(socket, "join_room", %{"roomId" => "market"})
      assert_push "presence_update", _roster
      assert_receive {:fake_frame, _up, _join_json}, 1_000

      send(socket.channel_pid, {:torrent_grant_renew, {@infohash, 0}})
      refute_event("torrent_grant", 300)
    end)
  end

  test "grant verification stays fail-closed for every mismatch" do
    flipped(fn ->
      put_torrent_live()
      _socket = connect_and_join("guest_grant_failclosed")
      grant = next_event("torrent_grant")
      token = grant.payload["grant"]

      assert {:ok, _} = Grants.verify(token, @infohash, 0, secrets: [@secret])
      assert {:error, :wrong_file} = Grants.verify(token, @infohash, 1, secrets: [@secret])
      assert {:error, :wrong_file} = Grants.verify(token, @other_infohash, 0, secrets: [@secret])

      [payload | _] = String.split(token, ".")
      tampered = payload <> ".AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
      assert {:error, :invalid_signature} = Grants.verify(tampered, @infohash, 0, secrets: [@secret])
      assert {:error, :malformed} = Grants.verify("not-a-token", @infohash, 0, secrets: [@secret])

      {:ok, expired} =
        Grants.mint("guest_grant_failclosed", @infohash, 0, ttl_secs: -120)

      assert {:error, :expired} = Grants.verify(expired.grant, @infohash, 0, secrets: [@secret])
    end)
  end
end
