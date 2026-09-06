defmodule Afterlight.Gateway.RateLimitTest do
  use ExUnit.Case, async: false

  alias Afterlight.Gateway.RateLimit

  setup do
    table = :ets.new(:rate_limit_test_table, [:set, :public])
    %{table: table}
  end

  test "allows a burst up to the limit, then refuses", %{table: table} do
    opts = [limit: 3, window_ms: 60_000]

    assert :ok = RateLimit.check(table, :k, opts)
    assert :ok = RateLimit.check(table, :k, opts)
    assert :ok = RateLimit.check(table, :k, opts)

    assert {:limited, retry_after_ms} = RateLimit.check(table, :k, opts)
    assert retry_after_ms > 0 and retry_after_ms <= 60_000
  end

  test "keys are isolated buckets", %{table: table} do
    opts = [limit: 1, window_ms: 60_000]

    assert :ok = RateLimit.check(table, {:ip, {1, 2, 3, 4}}, opts)
    assert {:limited, _} = RateLimit.check(table, {:ip, {1, 2, 3, 4}}, opts)
    assert :ok = RateLimit.check(table, {:ip, {5, 6, 7, 8}}, opts)
  end

  test "the window resets lazily: refused burst becomes allowed again", %{table: table} do
    opts = [limit: 1, window_ms: 50]

    assert :ok = RateLimit.check(table, :k, opts)
    assert {:limited, _} = RateLimit.check(table, :k, opts)

    Process.sleep(60)

    assert :ok = RateLimit.check(table, :k, opts)
  end

  test "retry_after_secs is a whole number of seconds, minimum 1" do
    assert RateLimit.retry_after_secs(0) == 1
    assert RateLimit.retry_after_secs(1) == 1
    assert RateLimit.retry_after_secs(1500) == 2
    assert RateLimit.retry_after_secs(60_000) == 61
  end
end
