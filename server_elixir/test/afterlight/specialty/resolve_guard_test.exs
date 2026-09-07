defmodule Afterlight.Specialty.ResolveGuardTest do
  use ExUnit.Case, async: false

  alias Afterlight.Specialty.ResolveGuard
  alias Afterlight.Specialty.TorrentRules

  setup do
    _ = start_supervised!({ResolveGuard, name: ResolveGuard})
    :ok
  end

  test "rejects a second in-flight resolve for the same player" do
    assert :ok = ResolveGuard.acquire("guest_a")
    assert {:error, :in_flight} = ResolveGuard.acquire("guest_a")
    ResolveGuard.release("guest_a")
    assert :ok = ResolveGuard.acquire("guest_a")
    ResolveGuard.release("guest_a")
  end

  test "enforces per-player cooldown after release" do
    assert :ok = ResolveGuard.acquire("guest_b")
    ResolveGuard.release("guest_b")
    assert {:error, :cooldown} = ResolveGuard.acquire("guest_b")

    cooldown = Application.get_env(:afterlight, :specialty, [])[:resolve_cooldown_ms] ||
                 TorrentRules.resolve_cooldown_ms()

    Process.sleep(cooldown + 50)
    assert :ok = ResolveGuard.acquire("guest_b")
    ResolveGuard.release("guest_b")
  end

  test "global cap rejects overflow with cooldown semantics" do
    cap = Application.get_env(:afterlight, :specialty, [])[:resolve_global_cap] || 8

    players =
      for i <- 1..cap do
        id = "cap_player_#{i}"
        assert :ok = ResolveGuard.acquire(id)
        id
      end

    assert {:error, :global_cap} = ResolveGuard.acquire("overflow")

    for id <- players, do: ResolveGuard.release(id)
  end
end
