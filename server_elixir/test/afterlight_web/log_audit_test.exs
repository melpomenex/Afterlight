defmodule AfterlightWeb.LogAuditTest do
  use Afterlight.DataCase, async: false

  import ExUnit.CaptureLog
  import Phoenix.ChannelTest

  alias Afterlight.Gateway.Auth
  alias Afterlight.Gateway.RateLimit
  alias Afterlight.Repo
  alias Afterlight.Specialty.Grants

  @endpoint AfterlightWeb.Endpoint

  setup do
    GatewayTest.FakeCore.set_owner(self())
    RateLimit.reset()
    :ok
  end

  test "tokens never appear in captured logs across accept / refuse / relay / teardown" do
    {:ok, %{token: token}} = Auth.issue("guest_audit1", "Fern")
    garbage = "garbage.token.value"

    log =
      capture_log([level: :info], fn ->
        # Accepted connect + join + hello + upstream drop (relay error path).
        assert {:ok, socket} = connect(AfterlightWeb.UserSocket, %{"token" => token})

        {:ok, _, socket} = subscribe_and_join(socket, AfterlightWeb.GameChannel, "game:v1")
        Process.unlink(socket.channel_pid)

        push(socket, "hello", %{"guestId" => "guest_audit1"})
        assert_receive {:fake_frame, up, _json}, 1_000

        GatewayTest.FakeCore.inject_down(up)
        assert_push "error", %{"message" => "relay_down"}

        # Refused connects (garbage + missing token).
        :error = connect(AfterlightWeb.UserSocket, %{"token" => garbage})
        :error = connect(AfterlightWeb.UserSocket, %{})
      end)

    refute log =~ token, "the issued token leaked into logs"
    refute log =~ garbage, "the garbage token leaked into logs"
  end

  test "the boundary secret is never logged by the proxy path" do
    secret = "super-secret-boundary-value-audit"

    log =
      capture_log([level: :info], fn ->
        :ok =
          GatewayTest.ConfigLock.with_lock(:boundary_secret, secret, fn ->
            {:ok, %{token: token}} = Auth.issue("guest_audit2", nil)

            assert {:ok, socket} = connect(AfterlightWeb.UserSocket, %{"token" => token})
            {:ok, _, socket} = subscribe_and_join(socket, AfterlightWeb.GameChannel, "game:v1")
            Process.unlink(socket.channel_pid)

            assert_receive {:fake_upstream_started, _up, _headers}, 1_000
            leave(socket)
            :ok
          end)
      end)

    refute log =~ secret, "the boundary secret leaked into logs"
  end

  test "torrent grant tokens, signing secret, and magnets never appear in logs" do
    secret = "audit-torrent-grant-secret-000000000000000"
    magnet = "magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=AuditFilm"

    prev_secret = Application.get_env(:afterlight, :torrent_grant_secret)
    prev_env = System.get_env("AFTERLIGHT_TORRENT_GRANT_SECRET")

    Application.put_env(:afterlight, :torrent_grant_secret, secret)
    System.put_env("AFTERLIGHT_TORRENT_GRANT_SECRET", secret)

    on_exit(fn ->
      case prev_secret do
        nil -> Application.delete_env(:afterlight, :torrent_grant_secret)
        value -> Application.put_env(:afterlight, :torrent_grant_secret, value)
      end

      case prev_env do
        nil -> System.delete_env("AFTERLIGHT_TORRENT_GRANT_SECRET")
        value -> System.put_env("AFTERLIGHT_TORRENT_GRANT_SECRET", value)
      end
    end)

    start_supervised!(Afterlight.Theater.Supervisor)
    Repo.delete_all(from(ti in "theater_items"))
    Repo.delete_all(from(tr in "theater_rooms"))
    Repo.delete_all(from(e in "outbox_events"))

    {:ok, _} =
      Afterlight.Theater.apply_action(
        "theater",
        %{
          "op" => "add",
          "url" => magnet,
          "title" => "Audit Film",
          "fileIndex" => 0,
          "filePath" => "AuditFilm/AuditFilm.mp4",
          "fileBytes" => 12_345
        },
        "Auditor"
      )

    routes = %{
      "join_room" => :phoenix,
      "theater_queue" => :phoenix,
      "theater_control" => :phoenix,
      "theater_channel" => :phoenix
    }

    log =
      GatewayTest.ConfigLock.with_lock(:routing, routes, fn ->
        capture_log([level: :debug], fn ->
          {:ok, %{token: token}} = Auth.issue("guest_audit_grant", "Fern")
          assert {:ok, socket} = connect(AfterlightWeb.UserSocket, %{"token" => token})
          {:ok, _, socket} = subscribe_and_join(socket, AfterlightWeb.GameChannel, "game:v1")
          Process.unlink(socket.channel_pid)

          push(socket, "hello", %{"guestId" => "guest_audit_grant"})
          assert_receive {:fake_frame, _up, _json}, 1_000

          push(socket, "join_room", %{"roomId" => "theater"})
          assert_push "presence_update", _roster
          assert_push "torrent_grant", %{"grant" => grant}
          send(self(), {:audit_grant, grant})
          assert_push "theater_state", _state
        end)
      end)

    assert_receive {:audit_grant, grant}

    assert {:ok, _claims} = Grants.verify(grant, "08ada5a7a6183aae1e09d831df6748d566095a10", 0)

    refute log =~ grant, "the grant token leaked into logs"
    refute log =~ secret, "the signing secret leaked into logs"
    refute log =~ magnet, "the full magnet leaked into logs"
  end
end
