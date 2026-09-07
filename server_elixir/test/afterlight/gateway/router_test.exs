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

  @world_types ~w(join_room movement emote)

  @base_routing %{
    "ping" => :terminate_pong,
    "join_room" => :node,
    "movement" => :node,
    "emote" => :node
  }

  @world_routing %{
    "ping" => :terminate_pong,
    "join_room" => :phoenix,
    "movement" => :phoenix,
    "emote" => :phoenix
  }

  describe "disposition/1 — P11 unrouted default (remove-node-server-authority)" do
    test "unknown types are unrouted — no silent Node fallback" do
      :ok =
        GatewayTest.ConfigLock.with_lock(:routing, @base_routing, fn ->
          assert Router.disposition("hologram_deparse") == :unrouted
          assert Router.disposition("") == :unrouted
          :ok
        end)
    end

    test "non-binary input is unrouted" do
      assert Router.disposition(nil) == :unrouted
      assert Router.disposition(:hello) == :unrouted
    end

    test "transitional relay types stay :node when not flipped" do
      :ok =
        GatewayTest.ConfigLock.with_lock(:routing, @base_routing, fn ->
          for type <- Router.node_relay_types() do
            assert Router.disposition(type) == :node, "expected #{type} => :node relay"
          end

          :ok
        end)
    end
  end

  describe "disposition/1 — the P2 table (design D4)" do
    test "every catalog game type is either phoenix, node relay, or unrouted — never silent default" do
      :ok =
        GatewayTest.ConfigLock.with_lock(:routing, @base_routing, fn ->
          for type <- @catalog_types -- ["ping"] do
            d = Router.disposition(type)
            assert d in [:node, :phoenix, :unrouted], "expected explicit disposition for #{type}, got #{d}"
          end

          :ok
        end)
    end

    test "ping is terminated at the gateway" do
      :ok =
        GatewayTest.ConfigLock.with_lock(:routing, @base_routing, fn ->
          assert Router.disposition("ping") == :terminate_pong
          :ok
        end)
    end

    test "dormant world and chat rows relay to Node sidecar" do
      :ok =
        GatewayTest.ConfigLock.with_lock(:routing, @base_routing, fn ->
          for type <- ~w(join_room movement emote chat_send) do
            assert Router.disposition(type) == :node, "expected dormant #{type} => :node"
          end

          :ok
        end)
    end
  end

  describe "disposition/1 — the P3 verbatim contract (add-world-room-runtime)" do
    test "a :phoenix routing row reports the configured owner verbatim" do
      :ok =
        GatewayTest.ConfigLock.with_lock(
          :routing,
          %{"theater_queue" => :phoenix, "ping" => :terminate_pong},
          fn ->
            # P3 removed the P2 clamp (router moduledoc): disposition reports
            # the row verbatim, so a :phoenix row without a live handler WOULD
            # black-hole that traffic. That is why the world handler landed
            # before the flip and the world rows default to :node.
            assert Router.disposition("theater_queue") == :phoenix
            assert Router.disposition("ping") == :terminate_pong
            :ok
          end
        )
    end

    test "torrent_resolve routes to the specialty adapter by default" do
      assert Router.disposition("torrent_resolve") == :specialty
      assert {:specialty, "torrent_resolve", %{"magnet" => "x"}} =
               Router.dispatch("torrent_resolve", %{"magnet" => "x"})
    end

    test "world rows default to :node in the base config (runtime dormant)" do
      :ok =
        GatewayTest.ConfigLock.with_lock(:routing, @base_routing, fn ->
          for type <- @world_types do
            assert Router.disposition(type) == :node, "expected #{type} => :node by default"
          end

          assert Router.world_owner() == :node
          refute Router.world_phx?()
          :ok
        end)
    end

    test "world_owner/0 and world_phx?/0 track the join_room routing row" do
      :ok =
        GatewayTest.ConfigLock.with_lock(:routing, @world_routing, fn ->
          assert Router.world_owner() == :phoenix
          assert Router.world_phx?() == true

          for type <- @world_types do
            assert Router.disposition(type) == :phoenix,
                   "expected #{type} => :phoenix when flipped"
          end

          :ok
        end)
    end

    test "flipping back to :node restores the dormant posture in both directions" do
      :ok =
        GatewayTest.ConfigLock.with_lock(:routing, @world_routing, fn ->
          assert Router.world_phx?() == true
          :ok
        end)

      :ok =
        GatewayTest.ConfigLock.with_lock(:routing, @base_routing, fn ->
          # Rollback: suppression and the flip are keyed on the SAME row, so
          # they toggle together in this direction too (design D6).
          assert Router.world_owner() == :node
          refute Router.world_phx?()
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

    test "world rows dispatch to the world runtime when flipped" do
      :ok =
        GatewayTest.ConfigLock.with_lock(:routing, @world_routing, fn ->
          assert {:world, "join_room", %{"roomId" => "market"}} =
                   Router.dispatch("join_room", %{"roomId" => "market"})

          assert {:world, "movement", %{"x" => 1.5}} = Router.dispatch("movement", %{"x" => 1.5})

          assert {:world, "emote", %{"emote" => "wave"}} =
                   Router.dispatch("emote", %{"emote" => "wave"})

          :ok
        end)
    end

    test "chat rows dispatch to the chat runtime when flipped" do
      chat_routing = Map.merge(@base_routing, %{"chat_send" => :phoenix})

      :ok =
        GatewayTest.ConfigLock.with_lock(:routing, chat_routing, fn ->
          assert Router.chat_owner() == :phoenix
          assert Router.chat_phx?() == true

          assert {:chat, "chat_send", %{"text" => "hello"}} =
                   Router.dispatch("chat_send", %{"text" => "hello"})

          :ok
        end)
    end

    test "chat rows dispatch to the relay while dormant (:node)" do
      :ok =
        GatewayTest.ConfigLock.with_lock(:routing, @base_routing, fn ->
          assert Router.chat_owner() == :node
          refute Router.chat_phx?()

          assert {:relay, %{"type" => "chat_send", "text" => "hello"}} =
                   Router.dispatch("chat_send", %{"text" => "hello"})

          :ok
        end)
    end

    test "world rows dispatch to the relay while dormant (:node)" do
      :ok =
        GatewayTest.ConfigLock.with_lock(:routing, @base_routing, fn ->
          assert {:relay, %{"type" => "join_room", "roomId" => "market"}} =
                   Router.dispatch("join_room", %{"roomId" => "market"})

          assert {:relay, %{"type" => "movement"}} = Router.dispatch("movement", nil)
          :ok
        end)
    end

    test "unrouted types fail dispatch loudly (P11)" do
      :ok =
        GatewayTest.ConfigLock.with_lock(:routing, @base_routing, fn ->
          assert {:unrouted, "hologram_deparse"} =
                   Router.dispatch("hologram_deparse", %{})

          :ok
        end)
    end

    test "relay dispatch rebuilds the flat Node frame with string keys" do
      :ok =
        GatewayTest.ConfigLock.with_lock(:routing, @base_routing, fn ->
          assert {:relay, frame} =
                   Router.dispatch("movement", %{"x" => 1.5, "z" => -2.0, "walking" => true})

          assert frame == %{"type" => "movement", "x" => 1.5, "z" => -2.0, "walking" => true}
          :ok
        end)
    end

    test "relay dispatch normalizes atom keys and drops nothing" do
      :ok =
        GatewayTest.ConfigLock.with_lock(:routing, @base_routing, fn ->
          assert {:relay, frame} = Router.dispatch("join_room", %{roomId: "garden:guest_abc"})
          assert frame == %{"type" => "join_room", "roomId" => "garden:guest_abc"}
          :ok
        end)
    end

    test "relay dispatch handles nested payloads" do
      :ok =
        GatewayTest.ConfigLock.with_lock(:routing, @base_routing, fn ->
          payload = %{"nested" => %{"deep" => [%{"k" => 1}]}, "plain" => 2}
          assert {:relay, frame} = Router.dispatch("hello", payload)
          assert frame["nested"] == %{"deep" => [%{"k" => 1}]}
          assert frame["type"] == "hello"
          :ok
        end)
    end

    test "relay dispatch with a non-map payload produces a bare typed frame" do
      :ok =
        GatewayTest.ConfigLock.with_lock(:routing, @base_routing, fn ->
          assert {:relay, frame} = Router.dispatch("join_room", nil)
          assert frame == %{"type" => "join_room"}
          :ok
        end)
    end
  end
end
