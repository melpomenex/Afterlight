defmodule GatewayTest.ConfigLock do
  @moduledoc """
  Serializes `:afterlight, :gateway` config mutations across test modules
  (ExUnit runs different modules in parallel). A tiny ETS mutex —
  deterministic, no distributed-erlang semantics involved. Readers always
  see a complete keyword list.
  """

  @locks :gateway_test_config_locks
  @spin_tries 5000

  defp ensure_table do
    if :ets.whereis(@locks) == :undefined do
      try do
        :ets.new(@locks, [:named_table, :set, :public])
      rescue
        ArgumentError -> :ok
      end
    end

    :ok
  end

  def with_lock(key, value, fun) do
    ensure_table()
    acquire()

    try do
      old = Application.get_env(:afterlight, :gateway)
      Application.put_env(:afterlight, :gateway, Keyword.put(old || [], key, value))

      try do
        fun.()
      after
        Application.put_env(:afterlight, :gateway, old)
      end
    after
      :ets.delete(@locks, :config)
    end
  end

  def put(key, value) do
    with_lock(key, value, fn -> :ok end)
    :ok
  end

  defp acquire(tries \\ @spin_tries)

  defp acquire(0), do: raise("gateway config lock unavailable")

  defp acquire(tries) do
    if :ets.insert_new(@locks, {:config, self()}) do
      :ok
    else
      Process.sleep(2)
      acquire(tries - 1)
    end
  end
end
