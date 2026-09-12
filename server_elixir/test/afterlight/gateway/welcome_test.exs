defmodule Afterlight.Gateway.WelcomeTest do
  use Afterlight.DataCase, async: false

  alias Afterlight.Accounts
  alias Afterlight.Gateway.Welcome
  alias Afterlight.World.Weather

  setup do
    # Weather is supervised by World.Supervisor when domain supervisors run;
    # start it here only when they are disabled (BEFORELIGHT_OBS_TEST=1).
    if Process.whereis(Weather) == nil, do: start_supervised!(Weather)
    :ok
  end

  test "compose builds the retained hello welcome field set" do
    player_id = "welcome_guest"
    now = Accounts.now_ms()

    Repo.insert_all("players", [
      %{
        id: player_id,
        nickname: "QuietLantern",
        current_room: "market",
        last_seen: now,
        active: true,
        shadow: false
      }
    ])

    welcome = Welcome.compose(player_id, "QuietLantern", nil)

    assert welcome["player"]["id"] == player_id
    assert welcome["player"]["nickname"] == "QuietLantern"
    assert welcome["player"]["currentRoom"] == "market"
    assert is_binary(welcome["weather"])
    assert is_map(welcome["theater"])
    assert is_map(welcome["iptv"])
    refute Map.has_key?(welcome, "prices")
    refute Map.has_key?(welcome, "contracts")
    refute Map.has_key?(welcome, "orderBook")
  end

  test "initial_frames emits no retired garden state" do
    player_id = "welcome_garden"
    now = Accounts.now_ms()

    Repo.insert_all("players", [
      %{
        id: player_id,
        nickname: player_id,
        current_room: "market",
        last_seen: now,
        active: true,
        shadow: false
      }
    ])

    Welcome.compose(player_id, player_id, nil)

    assert Welcome.initial_frames(player_id) == []
  end
end
