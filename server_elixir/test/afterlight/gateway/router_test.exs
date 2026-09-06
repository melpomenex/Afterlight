defmodule Afterlight.Gateway.RouterTest do
  use ExUnit.Case, async: false

  alias Afterlight.Gateway.Router

  @catalog_types ~w(
    hello set_nickname join_room movement garden_action
    market_buy market_sell order_place order_cancel contract_complete
    node_harvest machine_contribute machine_mill machine_craft
    emote chat_send theater_queue theater_control theater_channel
    theater_playlist_resolve torrent_resolve iptv_list_get iptv_list_remove
    epg_lookup ping
  )

  describe "disposition/1 — the P2 table (design D4)" do
    test "ping is terminated at the gateway" do
      assert Router.disposition("ping") == :terminate_pong
    end

    test "every game domain is relayed to Node" do
      for type <- @catalog_types -- ["ping"] do
        assert Router.disposition(type) == :node, "expected #{type} => :node"
      end
    end

    test "unknown types default to :node (Node ignores unknown types)" do
      assert Router.disposition("hologram_deparse") == :node
      assert Router.disposition("") == :node
    end

    test "non-binary input defaults to :node" do
      assert Router.disposition(nil) == :node
      assert Router.disposition(:hello) == :node
    end

    test "a config row pointing at :phoenix still relays to Node while no Phoenix handler exists (P2)" do
      :ok =
        GatewayTest.ConfigLock.with_lock(:routing, %{"theater_queue" => :phoenix, "ping" => :terminate_pong}, fn ->
          # No Phoenix theater handler exists yet in P2: the row must not
          # black-hole game traffic, so disposition stays :node.
          assert Router.disposition("theater_queue") == :node
          assert Router.disposition("ping") == :terminate_pong
          :ok
        end)
    end
  end

  describe "dispatch/2" do
    test "ping dispatches a pong instruction echoing t" do
      assert Router.dispatch("ping", %{"t" => 42}) == {:pong, 42}
      assert Router.dispatch("ping", %{t: "abc"}) == {:pong, "abc"}
      assert Router.dispatch("ping", %{}) == {:pong, nil}
    end

    test "relay dispatch rebuilds the flat Node frame with string keys" do
      assert {:relay, frame} = Router.dispatch("movement", %{"x" => 1.5, "z" => -2.0, "walking" => true})
      assert frame == %{"type" => "movement", "x" => 1.5, "z" => -2.0, "walking" => true}
    end

    test "relay dispatch normalizes atom keys and drops nothing" do
      assert {:relay, frame} = Router.dispatch("join_room", %{roomId: "garden:guest_abc"})
      assert frame == %{"type" => "join_room", "roomId" => "garden:guest_abc"}
    end

    test "relay dispatch handles nested payloads" do
      payload = %{"nested" => %{"deep" => [%{"k" => 1}]}, "plain" => 2}
      assert {:relay, frame} = Router.dispatch("hello", payload)
      assert frame["nested"] == %{"deep" => [%{"k" => 1}]}
      assert frame["type"] == "hello"
    end

    test "relay dispatch with a non-map payload produces a bare typed frame" do
      assert {:relay, frame} = Router.dispatch("join_room", nil)
      assert frame == %{"type" => "join_room"}
    end
  end
end
