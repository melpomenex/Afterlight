defmodule Afterlight.Activities.CompletionRecorder do
  @moduledoc """
  Bounded supervised completion worker for durable activity results
  (task 3.9, design D8).

  Guarantees:

    - At most `@max_pending` (100) pending results per node; excess work is
      rejected honestly with `:recording_backlog_full` instead of growing
      without bound.
    - Failed writes retry for `@retry_window_ms` (five minutes) at bounded
      intervals; results still pending when the window expires are dropped
      with a warning — a crash before persistence can leave a result
      unrecorded, and the UI must say so rather than claim a lossless write.
    - Duplicate completion keys never double-apply: the writer resolves them
      to `{:ok, :duplicate}` without touching stats or scores.
  """

  use GenServer

  require Logger

  alias Afterlight.Accounts.Actor
  alias Afterlight.Activities.{ActivityMatch, ArcadeRun}

  @max_pending 100
  @default_retry_window_ms 5 * 60 * 1000
  @retry_interval_ms 1_000
  @max_retry_interval_ms 30_000

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: Keyword.get(opts, :name, __MODULE__))
  end

  @doc """
  Enqueue a validated result for bounded persistence.

  Returns `{:ok, :recorded}`, `{:ok, :duplicate}`, `{:ok, :retrying}`
  (accepted, will retry within the window), or
  `{:error, :recording_backlog_full}` when the node's pending bound is hit.
  """
  def record(entry, server \\ __MODULE__) do
    GenServer.call(server, {:record, entry})
  catch
    :exit, _ -> {:error, :recorder_unavailable}
  end

  @doc "Drain all pending entries immediately (tests and shutdown)."
  def flush(server \\ __MODULE__) do
    GenServer.call(server, :flush)
  end

  @doc "Current queue statistics: %{pending: n, dropped: n}."
  def stats(server \\ __MODULE__) do
    GenServer.call(server, :stats)
  end

  @impl true
  def init(opts) do
    state = %{
      queue: [],
      max_pending: Keyword.get(opts, :max_pending, @max_pending),
      retry_window_ms: Keyword.get(opts, :retry_window_ms, @default_retry_window_ms),
      retry_interval_ms: Keyword.get(opts, :retry_interval_ms, @retry_interval_ms),
      writer: Keyword.get(opts, :writer, &default_writer/1),
      timer_ref: nil,
      dropped: 0
    }

    {:ok, state}
  end

  @impl true
  def handle_call({:record, {kind, key, row} = entry}, _from, state)
      when kind in [:arcade_run, :activity_match] and is_binary(key) and is_map(row) do
    if length(state.queue) >= state.max_pending do
      Logger.warning("activity result recording backlog full, rejecting result key=#{key}")
      {:reply, {:error, :recording_backlog_full}, state}
    else
      now = System.system_time(:millisecond)
      entry = %{entry: entry, attempts: 0, first_seen: now, next_retry_at: now}

      case attempt(entry, state.writer, state.retry_interval_ms) do
        {:ok, status, nil} ->
          {:reply, {:ok, status}, state}

        {:error, pending_entry} ->
          state = %{state | queue: [pending_entry | state.queue]} |> ensure_timer()
          {:reply, {:ok, :retrying}, state}
      end
    end
  end

  def handle_call({:record, _malformed}, _from, state) do
    {:reply, {:error, :forged_or_invalid}, state}
  end

  def handle_call(:flush, _from, state) do
    {state, results} = drain(state)
    {:reply, results, state}
  end

  def handle_call(:stats, _from, state) do
    {:reply, %{pending: length(state.queue), dropped: state.dropped}, state}
  end

  @impl true
  def handle_info(:retry, state) do
    now = System.system_time(:millisecond)

    {pending, dropped} =
      state.queue
      |> Enum.reverse()
      |> Enum.reduce({[], 0}, fn
        entry, {acc, dropped} when entry.next_retry_at > now ->
          {[entry | acc], dropped}

        entry, {acc, dropped} ->
          case attempt(entry, state.writer, state.retry_interval_ms) do
            {:ok, _status, nil} ->
              {acc, dropped}

            {:error, retry_entry} ->
              if now - retry_entry.first_seen >= state.retry_window_ms do
                Logger.warning(
                  "activity result #{elem(retry_entry.entry, 1)} left unrecorded after retry window"
                )

                {acc, dropped + 1}
              else
                {[retry_entry | acc], dropped}
              end
          end
      end)

    state = %{state | queue: pending, dropped: state.dropped + dropped, timer_ref: nil}
    {:noreply, ensure_timer(state)}
  end

  def handle_info(_other, state), do: {:noreply, state}

  ## Internals

  defp attempt(entry, writer, base_interval) do
    case writer.(entry.entry) do
      {:ok, status} when status in [:recorded, :duplicate] ->
        {:ok, status, nil}

      _ ->
        attempts = entry.attempts + 1
        now = System.system_time(:millisecond)

        backoff = min(base_interval * attempts, @max_retry_interval_ms)

        {:error, %{entry | attempts: attempts, next_retry_at: now + backoff}}
    end
  end

  defp drain(state) do
    {remaining, results} =
      state.queue
      |> Enum.reverse()
      |> Enum.map_reduce([], fn entry, acc ->
        case writer_result(entry, state.writer) do
          {:ok, status} -> {entry, [{:ok, status} | acc]}
          {:error, status} -> {entry, [{:error, status} | acc]}
        end
      end)

    dropped = length(state.queue) - length(remaining)
    {%{state | queue: remaining, dropped: state.dropped + dropped, timer_ref: nil}, results}
  end

  defp writer_result(entry, writer) do
    case writer.(entry.entry) do
      {:ok, status} -> {:ok, status}
      {:error, _} -> {:error, :unrecorded}
    end
  end

  defp ensure_timer(%{timer_ref: nil, queue: [_ | _]} = state) do
    ref = Process.send_after(self(), :retry, state.retry_interval_ms)
    %{state | timer_ref: ref}
  end

  defp ensure_timer(state), do: state

  ## Default writer (real persistence)

  # Any write failure — including database outages — is a retryable error,
  # never a crash: the worker survives outages and keeps its bounded queue.
  defp default_writer(entry) do
    default_writer!(entry)
  rescue
    _ -> {:error, :write_failed}
  end

  defp default_writer!({:arcade_run, key, row}) do
    case Ash.get(ArcadeRun, key, authorize?: false) do
      {:ok, _existing} ->
        {:ok, :duplicate}

      _ ->
        case ArcadeRun
             |> Ash.Changeset.for_create(:record, Map.to_list(row), actor: Actor.system())
             |> Ash.create(authorize?: false) do
          {:ok, _} -> {:ok, :recorded}
          {:error, _} -> {:error, :write_failed}
        end
    end
  end

  defp default_writer!({:activity_match, key, row}) do
    case Ash.get(ActivityMatch, key, authorize?: false) do
      {:ok, _existing} ->
        {:ok, :duplicate}

      _ ->
        case ActivityMatch
             |> Ash.Changeset.for_create(:record, Map.to_list(row), actor: Actor.system())
             |> Ash.create(authorize?: false) do
          {:ok, _} -> {:ok, :recorded}
          {:error, _} -> {:error, :write_failed}
        end
    end
  end

  defp default_writer!(_), do: {:error, :forged_or_invalid}
end
