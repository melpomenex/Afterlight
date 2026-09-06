defmodule AfterlightWeb.LogAuditTest do
  use ExUnit.Case, async: false

  import ExUnit.CaptureLog
  import Phoenix.ChannelTest

  alias Afterlight.Gateway.Auth
  alias Afterlight.Gateway.RateLimit

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
end
