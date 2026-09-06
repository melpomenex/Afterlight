defmodule AfterlightWeb.AuthController do
  @moduledoc """
  `POST /api/auth/guest` — gateway-owned credential issuance (design D3,
  task 2.1).

  Request: JSON `{guestId, nickname?}` (guestId non-empty, printable,
  <= 64 bytes; nickname optional, printable, <= 40 bytes).
  Response 200: `{token, guestId, expiresIn}` (expiresIn in seconds).
  Errors: 400 `{ok: false, error: "invalid_request"}` on bad shape;
  429 `{ok: false, error: "rate_limited"}` with a `Retry-After` header
  when the per-remote-IP token bucket is empty.
  """

  use Phoenix.Controller, formats: [:json]

  alias Afterlight.Gateway
  alias Afterlight.Gateway.{Auth, RateLimit}

  def create(conn, params) do
    case RateLimit.check(RateLimit.table(), {:auth_ip, conn.remote_ip}, Gateway.config(:auth_rate_limit, [])) do
      :ok ->
        issue(conn, params)

      {:limited, retry_after_ms} ->
        conn
        |> put_resp_header("retry-after", Integer.to_string(RateLimit.retry_after_secs(retry_after_ms)))
        |> put_status(429)
        |> json(%{ok: false, error: "rate_limited"})
    end
  end

  defp issue(conn, params) do
    case Auth.validate_guest(params) do
      {:ok, %{guest_id: guest_id, nickname_hint: nickname}} ->
        {:ok, %{token: token, guest_id: guest_id, expires_in: expires_in}} =
          Auth.issue(guest_id, nickname)

        # The token body is only ever in the response — never in a log.
        json(conn, %{token: token, guestId: guest_id, expiresIn: expires_in})

      :error ->
        conn
        |> put_status(400)
        |> json(%{ok: false, error: "invalid_request"})
    end
  end
end
