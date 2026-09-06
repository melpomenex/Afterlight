defmodule AfterlightWeb.AuthControllerTest do
  use ExUnit.Case, async: false

  alias Afterlight.Gateway.Auth
  alias Afterlight.Gateway.RateLimit
  alias Afterlight.Gateway.Sessions

  @path "/api/auth/guest"

  setup do
    RateLimit.reset()
    :ok
  end

  defp post_guest(params, remote_ip \\ {127, 0, 2, 1}) do
    conn =
      %{Plug.Test.conn(:post, @path, params) | remote_ip: remote_ip}
      |> Plug.Conn.put_req_header("content-type", "application/json")
      |> AfterlightWeb.Router.call(AfterlightWeb.Router.init([]))

    {conn.status, conn.resp_body, conn}
  end

  test "issues a token for a valid guestId + nickname" do
    {status, body, _conn} = post_guest(%{"guestId" => "guest_api_ok", "nickname" => "Fern"})
    assert status == 200

    decoded = Jason.decode!(body)
    assert decoded["guestId"] == "guest_api_ok"
    assert decoded["expiresIn"] == Auth.token_max_age_secs()
    assert is_binary(decoded["token"]) and byte_size(decoded["token"]) > 20

    # The token verifies and carries the guest_id claim.
    assert {:ok, claims} = Auth.verify(decoded["token"])
    assert claims.guest_id == "guest_api_ok"
    assert claims.nickname_hint == "Fern"

    # The transient session entry was recorded.
    assert Sessions.lookup_token(decoded["token"]) == {:ok, "guest_api_ok"}
  end

  test "nickname is optional" do
    {status, body, _conn} = post_guest(%{"guestId" => "guest_api_nonick"})
    assert status == 200
    assert Jason.decode!(body)["guestId"] == "guest_api_nonick"
  end

  test "400 on invalid shapes" do
    for bad <- [
          %{},
          %{"guestId" => ""},
          %{"guestId" => String.duplicate("x", 65)},
          %{"guestId" => "has\u0000nul"},
          %{"guestId" => 42},
          %{"guestId" => "ok", "nickname" => String.duplicate("x", 41)}
        ] do
      {status, body, _conn} = post_guest(bad)
      assert status == 400, "expected 400 for #{inspect(bad)}"
      assert %{"ok" => false, "error" => "invalid_request"} = Jason.decode!(body)
    end
  end

  test "429 with Retry-After once the per-IP bucket is empty" do
    ip = {203, 0, 113, 77}
    opts = Afterlight.Gateway.config(:auth_rate_limit, [])
    limit = Keyword.fetch!(opts, :limit)

    # Burn the bucket straight through the limiter (config values, no
    # config mutation), then the next POST must be refused.
    for _ <- 1..limit, do: RateLimit.check(RateLimit.table(), {:auth_ip, ip}, opts)

    {status, body, conn} = post_guest(%{"guestId" => "guest_api_rated"}, ip)
    assert status == 429
    assert %{"ok" => false, "error" => "rate_limited"} = Jason.decode!(body)

    retry_after =
      conn |> Plug.Conn.get_resp_header("retry-after") |> List.first() |> String.to_integer()

    assert retry_after >= 1

    # A different IP is unaffected (legitimate sessions unaffected, 5.1).
    {status, _body, _conn} = post_guest(%{"guestId" => "guest_api_otherip"}, {203, 0, 113, 78})
    assert status == 200
  end

  test "the route only answers POST" do
    # Phoenix raises NoRouteError (rendered 404/405 by the endpoint's
    # error handling) when the path matches with the wrong method.
    assert_raise Phoenix.Router.NoRouteError, fn ->
      Plug.Test.conn(:get, @path)
      |> AfterlightWeb.Router.call(AfterlightWeb.Router.init([]))
    end
  end
end
