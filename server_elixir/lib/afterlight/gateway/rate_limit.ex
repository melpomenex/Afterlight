defmodule Afterlight.Gateway.RateLimit do
  @moduledoc """
  ETS-backed fixed-window token bucket (tasks 2.1 / 5.1), used for
  `POST /api/auth/guest` per remote IP and WS connects per source IP and
  per verified identity. No database — the table is transient, exactly
  like the sessions registry.

  Buckets live in the named table `:afterlight_gateway_rate_limit`
  (created by `init/0` in the application tree). The window resets
  lazily: the first `check/3` after `window_ms` has elapsed starts a new
  window, so a burst that gets refused becomes allowed again once the
  window crosses — "retryable refusal".
  """

  @table :afterlight_gateway_rate_limit

  @doc "Creates the bucket table if it does not exist. Idempotent."
  @spec init() :: :ok
  def init do
    if :ets.whereis(@table) == :undefined do
      :ets.new(@table, [
        :named_table,
        :set,
        :public,
        read_concurrency: true,
        write_concurrency: true
      ])
    end

    :ok
  end

  @doc """
  Takes one token out of the bucket `key`. Returns `:ok`, or
  `{:limited, retry_after_ms}` when the bucket is empty.
  """
  @spec check(:ets.table(), term, keyword) :: :ok | {:limited, non_neg_integer()}
  def check(table, key, opts) do
    limit = Keyword.fetch!(opts, :limit)
    window_ms = Keyword.fetch!(opts, :window_ms)
    now = System.monotonic_time(:millisecond)

    case :ets.lookup(table, key) do
      [{^key, window_started, count}] when now - window_started < window_ms ->
        if count >= limit do
          {:limited, max(window_started + window_ms - now, 0)}
        else
          :ets.update_element(table, key, {3, count + 1})
          :ok
        end

      _expired_or_missing ->
        :ets.insert(table, {key, now, 1})
        :ok
    end
  end

  @doc "Clears all buckets — test isolation only."
  @spec reset(:ets.table()) :: true
  def reset(table \\ @table), do: :ets.delete_all_objects(table)

  @doc "The application-wide bucket table."
  @spec table() :: :ets.table()
  def table, do: @table

  @doc "Whole seconds to advertise in a Retry-After header (min 1)."
  @spec retry_after_secs(non_neg_integer()) :: pos_integer()
  def retry_after_secs(ms), do: div(ms, 1000) + 1
end
