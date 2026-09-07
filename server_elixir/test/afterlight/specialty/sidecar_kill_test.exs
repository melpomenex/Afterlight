defmodule Afterlight.Specialty.SidecarKillTest do
  use ExUnit.Case, async: false

  alias Afterlight.Specialty.CircuitBreaker
  alias Afterlight.Specialty.Resolve
  alias Afterlight.Specialty.ResolveGuard
  alias Afterlight.Specialty.TorrentRules

  @magnet "magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel"
  @breaker Afterlight.Specialty.CircuitBreaker

  setup do
    _ = start_supervised!({CircuitBreaker, name: @breaker, threshold: 1, reset_ms: 60_000})
    _ = start_supervised!({ResolveGuard, name: ResolveGuard})

    on_exit(fn -> Application.delete_env(:afterlight, :specialty) end)

    Application.put_env(:afterlight, :specialty,
      sidecar_http_url: "http://127.0.0.1:1",
      resolve_cooldown_ms: 0,
      resolve_global_cap: 8,
      resolve_timeout_ms: 100
    )

    :ok
  end

  test "resolve returns engine_unavailable when the sidecar is down" do
    assert {:error, %{"type" => "error", "message" => msg}} =
             Resolve.handle("guest_sidecar", %{"requestId" => "req1", "magnet" => @magnet})

    assert msg == TorrentRules.error_text("engine_unavailable")
  end

  test "open circuit breaker fails fast without a retry storm" do
    :ok = CircuitBreaker.record_failure(@breaker)
    assert CircuitBreaker.state(@breaker) == :open

    assert {:error, %{"type" => "error", "message" => msg}} =
             Resolve.handle("guest_breaker", %{"requestId" => "req2", "magnet" => @magnet})

    assert msg == TorrentRules.error_text("engine_unavailable")
  end
end
