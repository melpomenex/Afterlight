defmodule AfterlightWeb.UserSocketTest do
  use Afterlight.DataCase, async: false

  import Phoenix.ChannelTest

  alias Afterlight.Gateway.Auth
  alias Afterlight.Gateway.RateLimit

  @endpoint AfterlightWeb.Endpoint

  setup do
    RateLimit.reset()
    :ok
  end

  test "valid token connects; guest_id comes ONLY from the verified claim" do
    {:ok, %{token: token}} = Auth.issue("guest_sock_ok", "Fern")

    assert {:ok, socket} = connect(AfterlightWeb.UserSocket, %{"token" => token, "playerId" => "forged"})
    assert socket.assigns.guest_id == "guest_sock_ok"
    assert socket.id == "guest:guest_sock_ok"
    assert is_binary(socket.assigns.correlation_id)
  end

  test "missing token is refused" do
    assert :error = connect(AfterlightWeb.UserSocket, %{})
    assert :error = connect(AfterlightWeb.UserSocket, %{"token" => 123})
  end

  test "garbage / tampered token is refused" do
    assert :error = connect(AfterlightWeb.UserSocket, %{"token" => "garbage.token.value"})

    tampered = "A" <> String.slice(valid_token(), 1..-1//1)
    assert :error = connect(AfterlightWeb.UserSocket, %{"token" => tampered})
  end

  test "expired token is refused" do
    back = System.system_time(:second) - 120
    {:ok, %{token: token}} = Auth.issue("guest_sock_exp", nil, signed_at: back)

    # Configured TTL (43_200s) makes a 120s-old token VALID...
    assert {:ok, _} = connect(AfterlightWeb.UserSocket, %{"token" => token})

    # ...so verify the expiry path with a tiny max_age pinned under the
    # config lock (other modules read this config in parallel).
    :ok =
      GatewayTest.ConfigLock.with_lock(:token_max_age_secs, 60, fn ->
        assert :error = connect(AfterlightWeb.UserSocket, %{"token" => token})
        :ok
      end)
  end

  test "connect is rate limited per source IP (burst -> refusal, retryable)" do
    {:ok, %{token: token}} = Auth.issue("guest_sock_rl", nil)
    ip = {192, 0, 2, 11}
    connect_info = %{peer_data: %{address: ip}}

    # Pre-fill the bucket from config (limit is 60 in test.exs) to reach
    # the boundary without mutating config.
    opts = Afterlight.Gateway.config(:connect_rate_limit, [])
    limit = Keyword.fetch!(opts, :limit)

    for _ <- 1..limit, do: RateLimit.check(RateLimit.table(), {:connect_ip, ip}, opts)

    assert :error = connect(AfterlightWeb.UserSocket, %{"token" => token}, connect_info: connect_info)

    # A different source IP is unaffected.
    assert {:ok, _} =
             connect(AfterlightWeb.UserSocket, %{"token" => token},
               connect_info: %{peer_data: %{address: {192, 0, 2, 12}}}
             )
  end

  test "connect is rate limited per verified identity" do
    {:ok, %{token: token}} = Auth.issue("guest_sock_idrl", nil)
    opts = Afterlight.Gateway.config(:connect_rate_limit, [])
    limit = Keyword.fetch!(opts, :limit)

    for _ <- 1..limit, do: RateLimit.check(RateLimit.table(), {:connect_identity, "guest_sock_idrl"}, opts)

    assert :error = connect(AfterlightWeb.UserSocket, %{"token" => token})
  end

  defp valid_token do
    {:ok, %{token: token}} = Auth.issue("guest_sock_tamper", nil)
    token
  end
end
