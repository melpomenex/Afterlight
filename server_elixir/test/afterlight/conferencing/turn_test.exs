defmodule Afterlight.Conferencing.TurnTest do
  use ExUnit.Case, async: true

  alias Afterlight.Conferencing.Turn

  test "issues short-lived HMAC credentials and verifies them" do
    player_id = "player-turn-1"
    creds = Turn.issue_credentials(player_id, ttl_secs: 300)

    assert is_binary(creds.username)
    assert is_binary(creds.credential)
    assert is_list(creds.urls)
    assert creds.exp > DateTime.to_unix(DateTime.utc_now(), :second)

    # Valid verification
    assert {:ok, ^player_id} = Turn.verify_credentials(creds.username, creds.credential)
  end

  test "rejects forged credentials" do
    player_id = "player-turn-2"
    creds = Turn.issue_credentials(player_id, ttl_secs: 300)

    assert {:error, :bad_credential} = Turn.verify_credentials(creds.username, "forged-credential-token")
  end

  test "rejects expired credentials" do
    player_id = "player-turn-3"
    past = DateTime.add(DateTime.utc_now(), -600, :second)
    creds = Turn.issue_credentials(player_id, ttl_secs: 300, now: past)

    assert {:error, :expired} = Turn.verify_credentials(creds.username, creds.credential)
  end

  test "rejects malformed username" do
    assert {:error, :malformed_username} = Turn.verify_credentials("invalid_username", "token")
  end
end
