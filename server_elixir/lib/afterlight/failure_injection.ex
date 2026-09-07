defmodule Afterlight.FailureInjection do
  @moduledoc """
  Test-only hooks for deterministic failure injection (P10 §5).
  Production code ignores these; tests set Application env for the VM.
  """

  @key :failure_injection

  def get, do: Application.get_env(:afterlight, @key, %{})

  def put!(map) when is_map(map) do
    Application.put_env(:afterlight, @key, map)
  end

  def clear! do
    Application.delete_env(:afterlight, @key)
  end

  def db_mode do
    get() |> Map.get(:db, :normal)
  end

  def db_available?, do: db_mode() == :normal

  def db_delay_ms do
    case get() |> Map.get(:db) do
      {:slow, ms} when is_integer(ms) -> ms
      _ -> 0
    end
  end

  @doc "Wrap a repo callback; simulates unavailable or slow DB in tests."
  def maybe_simulate_db(fun) when is_function(fun, 0) do
    case db_mode() do
      :unavailable -> {:error, :db_unavailable}
      {:slow, ms} when is_integer(ms) ->
        Process.sleep(ms)
        fun.()
      _ -> fun.()
    end
  end
end
