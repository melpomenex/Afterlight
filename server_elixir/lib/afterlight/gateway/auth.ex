defmodule Afterlight.Gateway.Auth do
  @moduledoc """
  Transitional signed guest identity (design D3, tasks 2.1/2.2/5.3).

  The gateway verifies nothing about a guestId except its shape and rate
  limits; `POST /api/auth/guest` issues a short-lived `Phoenix.Token`
  (~12 h TTL) over `{guest_id, nickname_hint, issued_at}` and records a
  transient session entry in `Afterlight.Gateway.Sessions` (ETS, no DB).
  The WS connect requires a valid, unexpired token and the connection's
  identity comes ONLY from the verified `guest_id` claim — client-supplied
  player fields are never trusted.

  Transitional semantics, precisely: guestId continues to *identify*
  (self-echo filtering, Node session keying), but possession of a bare
  guestId no longer *authorizes* a connection — the signed token does.
  Player-identity trust lands in P4/P6 when tokens bind to durable
  session/player rows.

  Tokens are NEVER logged (design risk item); logs carry correlation ids.
  """

  alias Afterlight.Gateway
  alias Afterlight.Gateway.Sessions

  @token_salt "afterlight guest token v1"
  @guest_id_max_bytes 64
  @nickname_max_bytes 40

  @type claims :: %{required(:guest_id) => String.t(), optional(atom) => term}

  @doc "Shape validation for the guest auth request (400 on failure)."
  @spec validate_guest(term) :: {:ok, %{guest_id: String.t(), nickname_hint: String.t() | nil}} | :error
  def validate_guest(%{} = params) do
    with {:ok, guest_id} <- validate_guest_id(params["guestId"]),
         {:ok, nickname} <- validate_nickname(params["nickname"]) do
      {:ok, %{guest_id: guest_id, nickname_hint: nickname}}
    end
  end

  def validate_guest(_other), do: :error

  @doc """
  Issues a guest token. Returns `{:ok, %{token, guest_id, expires_in}}`
  where `expires_in` is the TTL in seconds. Also records the transient
  token => guest_id entry in the sessions registry.

  `opts` are passed through to `Phoenix.Token.sign/4` (tests backdate
  tokens with `signed_at:` to exercise expiry deterministically).
  """
  @spec issue(String.t(), String.t() | nil, keyword) ::
          {:ok, %{token: String.t(), guest_id: String.t(), expires_in: pos_integer()}}
  def issue(guest_id, nickname_hint, opts \\ []) do
    claims = %{
      guest_id: guest_id,
      nickname_hint: nickname_hint,
      issued_at: Keyword.get(opts, :signed_at, System.system_time(:second))
    }

    expires_in = token_max_age_secs()
    token = Phoenix.Token.sign(signing_context(), @token_salt, claims, opts)
    Sessions.record_token(token, guest_id)
    {:ok, %{token: token, guest_id: guest_id, expires_in: expires_in}}
  end

  @doc """
  Verifies a token with the configured max_age. Returns
  `{:ok, claims}` — the caller must take `guest_id` from the CLAIMS, or
  `{:error, :invalid | :expired | :missing}`.
  """
  @spec verify(String.t(), keyword) :: {:ok, claims()} | {:error, term}
  def verify(token, opts \\ []) when is_binary(token) do
    max_age = Keyword.get(opts, :max_age, token_max_age_secs())

    case Phoenix.Token.verify(signing_context(), @token_salt, token, max_age: max_age) do
      {:ok, %{guest_id: guest_id} = claims} when is_binary(guest_id) -> {:ok, claims}
      {:ok, _claims_without_identity} -> {:error, :invalid}
      {:error, reason} -> {:error, reason}
    end
  end

  @doc "The token TTL from config, in seconds (default 12 h)."
  @spec token_max_age_secs() :: pos_integer()
  def token_max_age_secs do
    case Gateway.config(:token_max_age_secs, 43_200) do
      secs when is_integer(secs) and secs > 0 -> secs
      _other -> 43_200
    end
  end

  ## Validation

  defp validate_guest_id(guest_id)
       when is_binary(guest_id) and byte_size(guest_id) > 0 and byte_size(guest_id) <= @guest_id_max_bytes do
    if printable?(guest_id) do
      {:ok, guest_id}
    else
      :error
    end
  end

  defp validate_guest_id(_), do: :error

  defp validate_nickname(nil), do: {:ok, nil}

  defp validate_nickname(nickname)
       when is_binary(nickname) and byte_size(nickname) <= @nickname_max_bytes do
    if printable?(nickname) do
      {:ok, nickname}
    else
      :error
    end
  end

  defp validate_nickname(_), do: :error

  # UTF-8 printable and no control characters (rejects raw control bytes;
  # whitespace like space inside a name is Node's sanitize job, not ours).
  defp printable?(value) do
    String.printable?(value) and not String.match?(value, ~r/[\x00-\x1F\x7F]/)
  end

  ## Signing context

  @doc """
  The Phoenix.Token signing context: the dedicated token secret when
  configured (config :afterlight, :gateway, token_secret:) so it rotates
  independently of the endpoint's secret_key_base; otherwise the
  Endpoint (its secret_key_base + the same salt). Public so tests can
  forge structurally-valid tokens against the real context.
  """
  def signing_context do
    case Gateway.config(:token_secret) do
      secret when is_binary(secret) and byte_size(secret) >= 20 -> secret
      _ -> AfterlightWeb.Endpoint
    end
  end
end
