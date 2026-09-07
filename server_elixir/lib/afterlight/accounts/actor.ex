defmodule Afterlight.Accounts.Actor do
  @moduledoc """
  Actor derived from a verified GuestSession (or the connecting token before
  the session row exists). Client-supplied ids are never authorization.
  """

  @enforce_keys [:role, :player_id]
  defstruct [:role, :player_id, :session_id, :token_hash]

  @type t :: %__MODULE__{
          role: :session | :connecting | :system,
          player_id: String.t(),
          session_id: String.t() | nil,
          token_hash: String.t() | nil
        }

  def session(player_id, session_id, token_hash \\ nil) do
    %__MODULE__{role: :session, player_id: player_id, session_id: session_id, token_hash: token_hash}
  end

  def connecting(player_id, token_hash) do
    %__MODULE__{role: :connecting, player_id: player_id, token_hash: token_hash}
  end

  def system do
    %__MODULE__{role: :system, player_id: "system"}
  end
end
