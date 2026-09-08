defmodule Afterlight.Theater.GatewayTest do
  use Afterlight.DataCase, async: false

  alias Afterlight.Accounts.{Actor, Player}
  alias Afterlight.Theater
  alias Afterlight.Theater.Gateway

  @room "theater"
  @hls "https://example.test/live/channel.m3u8"

  setup do
    start_supervised!(Afterlight.Theater.Supervisor)
    Afterlight.Repo.delete_all(from(ti in "theater_items"))
    Afterlight.Repo.delete_all(from(tr in "theater_rooms"))

    now = Afterlight.Accounts.now_ms()
    actor = Actor.system()

    _ =
      Player
      |> Ash.Changeset.for_create(
        :stub,
        %{id: "guest_iptv", nickname: "Tuner", last_seen: now},
        actor: actor
      )
      |> Ash.create(authorize?: false)

    :ok
  end

  defp ctx do
    %{
      guest_id: "guest_iptv",
      conn_ref: :conn_iptv,
      nickname: "Tuner",
      world_room: %{wire_id: @room}
    }
  end

  test "theater_channel commits hls now and replies with theater_state" do
    {:noreply, replies} =
      Gateway.handle("theater_channel", %{"url" => @hls, "title" => "News"}, ctx())

    assert {"theater_state", %{"theater" => theater, "serverNow" => server_now}} =
             Enum.find(replies, fn {event, _} -> event == "theater_state" end)

    assert is_integer(server_now)
    assert theater["now"]["kind"] == "hls"
    assert theater["now"]["url"] == @hls
    assert theater["now"]["title"] == "News"

    snapshot = Theater.snapshot(@room)
    assert snapshot["now"]["id"] == theater["now"]["id"]
  end

  test "theater_channel outside the theater is refused" do
    bad_ctx = Map.put(ctx(), :world_room, %{wire_id: "market"})

    {:noreply, [{"error", %{"message" => message}}]} =
      Gateway.handle("theater_channel", %{"url" => @hls}, bad_ctx)

    assert message =~ "Orpheum"
  end
end
