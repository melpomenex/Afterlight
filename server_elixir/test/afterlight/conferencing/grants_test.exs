defmodule Afterlight.Conferencing.GrantsTest do
  use ExUnit.Case, async: true

  alias Afterlight.Conferencing.Grants

  @secret "test-grant-secret-aaaaaaaaaaaaaaaa"

  defp grant(overrides \\ %{}) do
    now = DateTime.utc_now()

    Map.merge(
      %{
        id: "11111111-1111-4111-8111-111111111111",
        call_id: "22222222-2222-4222-8222-222222222222",
        player_id: "player-a",
        worker_id: "worker-1",
        can_publish_audio: true,
        can_publish_video: false,
        can_publish_screen: false,
        expires_at: DateTime.add(now, 300, :second)
      },
      overrides
    )
  end

  test "signs a token that verifies with matching binding fields" do
    g = grant()
    token = Grants.sign(g, secret: @secret)
    assert {:ok, payload} = Grants.verify(token, secret: @secret)
    assert payload["jti"] == g.id
    assert payload["call_id"] == g.call_id
    assert payload["player_id"] == g.player_id
    assert payload["worker_id"] == g.worker_id
    assert payload["can_publish_audio"] == true
    assert payload["can_publish_video"] == false
    refute String.contains?(token, @secret)
  end

  test "rejects tampered payload, expired grants, and revoked jtis" do
    token = Grants.sign(grant(), secret: @secret)
    [body, mac] = String.split(token, ".", parts: 2)
    {:ok, json} = Base.url_decode64(body, padding: false)
    payload = json |> Jason.decode!() |> Map.put("player_id", "forged")
    forged_body = Base.url_encode64(Jason.encode!(payload), padding: false)
    forged = forged_body <> "." <> mac

    assert {:error, :bad_signature} = Grants.verify(forged, secret: @secret)

    expired = grant(%{expires_at: DateTime.add(DateTime.utc_now(), -120, :second)})
    stale = Grants.sign(expired, secret: @secret)
    assert {:error, :expired} = Grants.verify(stale, secret: @secret, leeway_secs: 5)

    live = Grants.sign(grant(), secret: @secret)
    assert {:error, :revoked} = Grants.live?(live, ["11111111-1111-4111-8111-111111111111"], secret: @secret)
    assert {:ok, _} = Grants.live?(live, [], secret: @secret)
  end

  test "rejects SDP-shaped junk and missing binding fields" do
    assert {:error, :malformed} = Grants.verify("not-a-grant", secret: @secret)
    assert {:error, :malformed} = Grants.verify("", secret: @secret)
  end
end
