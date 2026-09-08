defmodule Afterlight.Activities.Results do
  @moduledoc """
  Server-side completion path for durable activity results (task 3.9, design D8).

  Rules:

    - Only the fenced activity session (authoritative room owner) calls this
      module; clients have no create action and cannot reach this path.
    - `player_id` comes from the session's verified signed identity
      (`Afterlight.Gateway.Auth` guest claims), never from client payloads.
    - Every record is validated and bounded before enqueueing; malformed or
      forged payloads are rejected with `:forged_or_invalid`.
    - `completion_key` is derived deterministically from the terminal facts,
      so replaying the same completion is an idempotent no-op that cannot
      credit scores twice.
    - Actual persistence is bounded and retried by
      `Afterlight.Activities.CompletionRecorder` (max 100 pending per node,
      five-minute retry window, honest backlog rejection).
  """

  alias Afterlight.Activities.{CompletionRecorder}

  @max_id_length 64
  @max_score 100_000_000
  @arcade_games MapSet.new(["rain-runner", "signal-lost", "sporefall"])
  @match_games MapSet.new(["pong"])
  @valid_outcomes MapSet.new([
                    "completed",
                    "score",
                    "run_cap",
                    "top_out",
                    "collision",
                    "crashed",
                    "forfeit",
                    "aborted"
                  ])

  @doc "Activity types recorded as single-player runs."
  def arcade_games, do: MapSet.to_list(@arcade_games)

  @doc "Activity types recorded as multiplayer matches."
  def match_games, do: MapSet.to_list(@match_games)

  @doc """
  Record a terminal single-player run. Returns:

    - `{:ok, :recorded}` when a new row was persisted
    - `{:ok, :duplicate}` when the completion key already exists
    - `{:error, :forged_or_invalid}` for malformed/forged payloads
    - `{:error, :recording_backlog_full}` when the node's bounded queue is full
  """
  def record_run(fields) do
    with {:ok, run} <- validate_run(fields) do
      key = completion_key({:arcade_run, run})
      row = run |> Map.put(:completion_key, key) |> Map.put(:recorded_at, now_ms())
      CompletionRecorder.record({:arcade_run, key, row})
    end
  end

  @doc """
  Record a terminal multiplayer match. Return contract as `record_run/1`.
  """
  def record_match(fields) do
    with {:ok, match} <- validate_match(fields) do
      key = completion_key({:activity_match, match})
      row = match |> Map.put(:completion_key, key) |> Map.put(:recorded_at, now_ms())
      CompletionRecorder.record({:activity_match, key, row})
    end
  end

  @doc """
  Deterministic idempotency key over terminal facts. Exported for tests and
  for the recorder's dedup checks.
  """
  def completion_key(kind_and_fields) do
    {kind, fields} = kind_and_fields

    payload =
      fields
      |> Enum.sort()
      |> Enum.map(fn {k, v} -> "#{k}=#{inspect(v)}" end)
      |> Enum.join("|")

    :crypto.hash(:sha256, "#{kind}|#{payload}") |> Base.encode16(case: :lower)
  end

  @doc """
  Build the durable record payload from a finished session (session server
  hook). Single-player games produce an arcade run per player; multiplayer
  games produce one match row. Returns `:ignore` for games without durable
  records, and `:ignore` for malformed input — recording is best-effort and
  must never crash or block the session.
  """
  def from_session(event_name, %{activity_def: def} = state, outcome) when is_map(outcome) do
    game = Map.get(def, "type")
    rules_version = Map.get(def, "rulesVersion", 1)
    ended_at = now_ms()

    players =
      state.players
      |> Enum.map(fn {slot, p} -> %{slot: slot, player_id: p.player_id} end)
      |> Enum.sort_by(& &1.slot)

    outcome_name =
      case outcome do
        %{"reason" => reason} when is_binary(reason) -> reason
        _ -> if event_name == "match_aborted", do: "aborted", else: "completed"
      end

    cond do
      game in @arcade_games ->
        case players do
          [%{player_id: player_id} | _] ->
            {:run,
             %{
               game: game,
               rules_version: rules_version,
               player_id: player_id,
               session_id: state.session_id,
               match_id: state.match_id || "match_" <> state.session_id,
               score: sanitize_score(outcome["score"]),
               outcome: outcome_name,
               stats: terminal_stats(outcome),
               ended_at: ended_at
             }}

          _ ->
            :ignore
        end

      game in @match_games ->
        {:match,
         %{
           game: game,
           rules_version: rules_version,
           session_id: state.session_id,
           match_id: state.match_id || "match_" <> state.session_id,
           outcome: outcome_name,
           winner_id: Map.get(outcome, "winner"),
           participants: Map.new(players, fn p -> {Integer.to_string(p.slot), p.player_id} end),
           ended_at: ended_at
         }}

      true ->
        :ignore
    end
  end

  def from_session(_event_name, _state, _outcome), do: :ignore

  @doc "Best-effort record from a session: enqueue and never raise. Returns the recording status (or :ignore)."
  def maybe_record(event_name, state, outcome) do
    case from_session(event_name, state, outcome) do
      {:run, fields} ->
        record_run(fields)

      {:match, fields} ->
        record_match(fields)

      :ignore ->
        :ignore
    end
  rescue
    err ->
      require Logger
      Logger.warning("activity result recording failed: #{Exception.message(err)}")
      {:error, :recording_failed}
  end

  ## Validation — the forgery gate

  defp validate_run(f) when is_map(f) do
    with :ok <- validate_common(f),
         :ok <- validate_game_kind(f, @arcade_games),
         :ok <- validate_string(f, :player_id),
         :ok <- validate_score(f),
         :ok <- validate_stats(f) do
      {:ok,
       %{
         game: f.game,
         rules_version: f.rules_version,
         player_id: f.player_id,
         session_id: f.session_id,
         match_id: f.match_id,
         score: f.score,
         outcome: f.outcome,
         stats: Map.get(f, :stats, %{}),
         ended_at: f.ended_at
       }}
    end
  end

  defp validate_run(_), do: {:error, :forged_or_invalid}

  defp validate_match(f) when is_map(f) do
    with :ok <- validate_common(f),
         :ok <- validate_game_kind(f, @match_games) do
      winner = Map.get(f, :winner_id)
      participants = Map.get(f, :participants, %{})

      cond do
        winner != nil and not valid_id?(winner) ->
          {:error, :forged_or_invalid}

        not is_map(participants) or participants == %{} or
            not Enum.all?(participants, fn {k, v} ->
              valid_id?(k) and valid_id?(v)
            end) ->
          {:error, :forged_or_invalid}

        true ->
          {:ok,
           %{
             game: f.game,
             rules_version: f.rules_version,
             session_id: f.session_id,
             match_id: f.match_id,
             outcome: f.outcome,
             winner_id: winner,
             participants: participants,
             ended_at: f.ended_at
           }}
      end
    end
  end

  defp validate_match(_), do: {:error, :forged_or_invalid}

  defp validate_common(f) do
    cond do
      not valid_id?(Map.get(f, :game)) ->
        {:error, :forged_or_invalid}

      not is_integer(Map.get(f, :rules_version)) or
          Map.get(f, :rules_version, 0) < 1 ->
        {:error, :forged_or_invalid}

      not valid_id?(Map.get(f, :session_id)) or
          not valid_id?(Map.get(f, :match_id)) ->
        {:error, :forged_or_invalid}

      not is_integer(Map.get(f, :ended_at)) ->
        {:error, :forged_or_invalid}

      not MapSet.member?(@valid_outcomes, Map.get(f, :outcome)) ->
        {:error, :forged_or_invalid}

      true ->
        :ok
    end
  end

  defp validate_score(f) do
    score = Map.get(f, :score)

    if is_integer(score) and score >= 0 and score <= @max_score do
      :ok
    else
      {:error, :forged_or_invalid}
    end
  end

  defp validate_stats(f) do
    stats = Map.get(f, :stats, %{})

    if is_map(stats) and map_size(stats) <= 16 and
         Enum.all?(stats, fn {k, v} -> valid_id?(k) and bounded_stat?(v) end) do
      :ok
    else
      {:error, :forged_or_invalid}
    end
  end

  defp bounded_stat?(v) when is_integer(v) and v >= 0 and v <= @max_score, do: true
  defp bounded_stat?(v) when is_float(v) and v >= 0 and v <= @max_score, do: true
  defp bounded_stat?(v) when is_boolean(v), do: true
  defp bounded_stat?(_), do: false

  defp validate_string(f, key) do
    if valid_id?(Map.get(f, key)), do: :ok, else: {:error, :forged_or_invalid}
  end

  # The catalog is bounded (design D8): only declared first-release games can
  # produce durable results. New games extend these sets explicitly.
  defp validate_game_kind(f, allowed) do
    if MapSet.member?(allowed, Map.get(f, :game)) do
      :ok
    else
      {:error, :forged_or_invalid}
    end
  end

  defp valid_id?(v) when is_binary(v),
    do: v != "" and String.length(v) <= @max_id_length

  defp valid_id?(_), do: false

  defp sanitize_score(score) when is_integer(score) and score >= 0, do: min(score, @max_score)
  defp sanitize_score(_), do: 0

  defp terminal_stats(outcome) when is_map(outcome) do
    outcome
    |> Map.take(["lines", "level", "distance", "wave", "lives"])
    |> Map.new(fn {k, v} ->
      {k, if(is_number(v), do: v, else: 0)}
    end)
  end

  defp terminal_stats(_), do: %{}

  defp now_ms, do: System.system_time(:millisecond)
end
