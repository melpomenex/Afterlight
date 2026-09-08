defmodule Afterlight.Activities.ResultsTest do
  use Afterlight.DataCase, async: false

  alias Afterlight.Activities.{ArcadeRun, ActivityMatch, CompletionRecorder, Results}
  alias Afterlight.Repo

  import Ecto.Query

  defp valid_run(overrides \\ %{}) do
    Map.merge(
      %{
        game: "sporefall",
        rules_version: 1,
        player_id: "guest_signed_1",
        session_id: "sess_abc123",
        match_id: "match_abc123",
        score: 1200,
        outcome: "top_out",
        stats: %{"lines" => 14, "level" => 3},
        ended_at: 1_700_000_000_000
      },
      overrides
    )
  end

  defp valid_match(overrides \\ %{}) do
    Map.merge(
      %{
        game: "pong",
        rules_version: 1,
        session_id: "sess_m_1",
        match_id: "match_m_1",
        outcome: "completed",
        winner_id: "guest_signed_a",
        participants: %{"0" => "guest_signed_a", "1" => "guest_signed_b"},
        ended_at: 1_700_000_001_000
      },
      overrides
    )
  end

  defp start_recorder(opts \\ []) do
    name = :"recorder_#{System.unique_integer([:positive])}"
    start_supervised!({CompletionRecorder, Keyword.merge(opts, name: name)})
    name
  end

  describe "arcade run recording" do
    test "records a validated run and persists one row" do
      server = start_recorder()

      fields = valid_run()
      key = Results.completion_key({:arcade_run, fields})
      row = fields |> Map.put(:completion_key, key) |> Map.put(:recorded_at, 1_700_000_001_000)

      assert {:ok, :recorded} = CompletionRecorder.record({:arcade_run, key, row}, server)
      assert [%ArcadeRun{}] = Repo.all(ArcadeRun)
      assert Repo.one(from(r in ArcadeRun, where: r.completion_key == ^key)).score == 1200
    end

    test "record_run/record_match persist through the default recorder" do
      assert {:ok, :recorded} =
               Results.record_run(valid_run(%{session_id: "sess_rr", match_id: "match_rr"}))

      assert {:ok, :duplicate} =
               Results.record_run(valid_run(%{session_id: "sess_rr", match_id: "match_rr"}))

      assert {:ok, :recorded} = Results.record_match(valid_match())
      assert Repo.aggregate(ArcadeRun, :count) == 1
      assert Repo.aggregate(ActivityMatch, :count) == 1
    end

    test "duplicate completion is idempotent and cannot credit scores twice" do
      server = start_recorder()
      key = Results.completion_key({:arcade_run, valid_run()})

      row =
        valid_run() |> Map.put(:completion_key, key) |> Map.put(:recorded_at, 1_700_000_001_000)

      assert {:ok, :recorded} = CompletionRecorder.record({:arcade_run, key, row}, server)

      # Replay with a DIFFERENT (forged) score but identical terminal facts:
      # the completion key is unchanged, so the write is a no-op.
      forged = row |> Map.put(:score, 99_999_999) |> Map.put(:recorded_at, 1_700_000_002_000)
      assert {:ok, :duplicate} = CompletionRecorder.record({:arcade_run, key, forged}, server)

      runs = Repo.all(ArcadeRun)
      assert length(runs) == 1
      assert hd(runs).score == 1200
    end

    test "distinct completions create distinct rows" do
      server = start_recorder()

      for i <- 1..2 do
        fields = valid_run(%{session_id: "sess_#{i}", match_id: "match_#{i}"})
        key = Results.completion_key({:arcade_run, fields})
        row = fields |> Map.put(:completion_key, key) |> Map.put(:recorded_at, 1_700_000_001_000)
        assert {:ok, :recorded} = CompletionRecorder.record({:arcade_run, key, row}, server)
      end

      assert length(Repo.all(ArcadeRun)) == 2
    end
  end

  describe "match recording" do
    test "records a completed match with participants and winner" do
      server = start_recorder()
      key = Results.completion_key({:activity_match, valid_match()})

      row =
        valid_match() |> Map.put(:completion_key, key) |> Map.put(:recorded_at, 1_700_000_001_000)

      assert {:ok, :recorded} = CompletionRecorder.record({:activity_match, key, row}, server)

      match = Repo.one(ActivityMatch)
      assert match.game == "pong"
      assert match.winner_id == "guest_signed_a"
      assert match.participants == %{"0" => "guest_signed_a", "1" => "guest_signed_b"}
    end

    test "aborted and forfeited matches are distinguished from completed play" do
      server = start_recorder()

      for outcome <- ["completed", "forfeit", "aborted"] do
        fields = valid_match(%{outcome: outcome, match_id: "match_#{outcome}"})
        key = Results.completion_key({:activity_match, fields})
        row = fields |> Map.put(:completion_key, key) |> Map.put(:recorded_at, 1_700_000_001_000)
        assert {:ok, :recorded} = CompletionRecorder.record({:activity_match, key, row}, server)
      end

      assert Repo.aggregate(ActivityMatch, :count) == 3
    end
  end

  describe "forged results" do
    test "negative, non-integer and over-cap scores are rejected" do
      for score <- [-1, 1.5, "9999", 100_000_001] do
        assert {:error, :forged_or_invalid} = Results.record_run(valid_run(%{score: score}))
      end
    end

    test "unknown games, bad rules versions and bogus ids are rejected" do
      assert {:error, :forged_or_invalid} = Results.record_run(valid_run(%{game: "coin-tosser"}))
      assert {:error, :forged_or_invalid} = Results.record_run(valid_run(%{rules_version: 0}))
      assert {:error, :forged_or_invalid} = Results.record_run(valid_run(%{player_id: ""}))
      assert {:error, :forged_or_invalid} = Results.record_run(valid_run(%{session_id: nil}))

      assert {:error, :forged_or_invalid} =
               Results.record_run(valid_run(%{outcome: "absolute_win"}))

      assert {:error, :forged_or_invalid} = Results.record_run("not a map")
    end

    test "match payloads with bogus winner or empty participants are rejected" do
      assert {:error, :forged_or_invalid} =
               Results.record_match(valid_match(%{winner_id: String.duplicate("x", 65)}))

      assert {:error, :forged_or_invalid} =
               Results.record_match(valid_match(%{participants: %{}}))

      long_id = String.duplicate("g", 65)

      assert {:error, :forged_or_invalid} =
               Results.record_match(valid_match(%{participants: %{"0" => long_id}}))

      assert {:error, :forged_or_invalid} =
               Results.record_match(valid_match(%{participants: %{999 => "guest_a"}}))
    end

    test "resource create path is system-only: non-system actors cannot write rows" do
      # The create policy forbids every non-system actor; results can only
      # originate from the fenced session-side completion path.
      row = valid_run() |> Map.put(:completion_key, "forged_key") |> Map.put(:recorded_at, 0)

      assert {:error, _} =
               ArcadeRun
               |> Ash.Changeset.for_create(:record, Map.to_list(row),
                 actor: %{role: :guest, player_id: "guest_signed_1"}
               )
               |> Ash.create(authorize?: true)

      assert Repo.all(ArcadeRun) == []
    end
  end

  describe "bounded retry recorder" do
    test "accepts at most max_pending entries and rejects excess honestly" do
      failing_writer = fn _ -> {:error, :write_failed} end

      server =
        start_recorder(max_pending: 3, writer: failing_writer, retry_interval_ms: 3_600_000)

      for i <- 1..3 do
        assert {:ok, :retrying} =
                 CompletionRecorder.record({:arcade_run, "k#{i}", %{i: i}}, server)
      end

      assert {:error, :recording_backlog_full} =
               CompletionRecorder.record({:arcade_run, "k4", %{i: 4}}, server)

      assert %{pending: 3} = CompletionRecorder.stats(server)
    end

    test "failed writes retry and succeed when the database recovers" do
      {:ok, attempts} = Agent.start_link(fn -> 0 end)

      writer = fn {_, "recover", _} ->
        # Fail the first two attempts, then "recover" (database comes back).
        if Agent.get_and_update(attempts, fn n -> {n < 2, n + 1} end) do
          {:error, :write_failed}
        else
          {:ok, :recorded}
        end
      end

      {:ok, pid} =
        GenServer.start_link(CompletionRecorder,
          writer: writer,
          retry_interval_ms: 5,
          name: nil
        )

      assert {:ok, :retrying} =
               CompletionRecorder.record({:arcade_run, "recover", %{i: 1}}, pid)

      # Let the retry tick drain the entry.
      assert eventually(fn -> CompletionRecorder.stats(pid).pending == 0 end)
      assert %{pending: 0, dropped: 0} = CompletionRecorder.stats(pid)
    end

    test "results still failing after the retry window are dropped and left unrecorded" do
      {:ok, pid} =
        GenServer.start_link(CompletionRecorder,
          writer: fn _ -> {:error, :write_failed} end,
          retry_interval_ms: 5,
          retry_window_ms: 30,
          name: nil
        )

      assert {:ok, :retrying} = CompletionRecorder.record({:arcade_run, "doomed", %{i: 1}}, pid)

      assert eventually(fn -> CompletionRecorder.stats(pid).dropped == 1 end)
      assert %{pending: 0, dropped: 1} = CompletionRecorder.stats(pid)
    end
  end

  describe "session hook (from_session)" do
    defp state_for(game, players) do
      %{
        activity_def: %{"type" => game, "rulesVersion" => 1},
        session_id: "sess_hook",
        match_id: "match_hook",
        players:
          players
          |> Enum.with_index()
          |> Map.new(fn {pid, slot} -> {slot, %{player_id: pid}} end)
      }
    end

    test "arcade game builds a run with terminal stats and sanitized score" do
      state = state_for("sporefall", ["guest_signed_1"])

      assert {:run, fields} =
               Results.from_session(
                 "match_ended",
                 state,
                 %{"reason" => "top_out", "score" => 500, "lines" => 8, "level" => 2}
               )

      assert fields.game == "sporefall"
      assert fields.rules_version == 1
      assert fields.player_id == "guest_signed_1"
      assert fields.outcome == "top_out"
      assert fields.score == 500
      assert fields.stats == %{"lines" => 8, "level" => 2}
    end

    test "match game builds a distinguished match row" do
      state = state_for("pong", ["guest_a", "guest_b"])

      assert {:match, fields} =
               Results.from_session("match_ended", state, %{
                 "reason" => "forfeit",
                 "winner" => "guest_a"
               })

      assert fields.outcome == "forfeit"
      assert fields.winner_id == "guest_a"
      assert fields.participants == %{"0" => "guest_a", "1" => "guest_b"}
    end

    test "aborted events mark outcome aborted and unknown games are ignored" do
      state = state_for("sporefall", ["guest_signed_1"])

      assert {:run, fields} =
               Results.from_session("match_aborted", state, %{"reason" => "aborted"})

      assert fields.outcome == "aborted"

      assert :ignore =
               Results.from_session("match_ended", state_for("theater", ["guest_x"]), %{})

      assert :ignore = Results.from_session("match_ended", %{players: %{}}, %{})
    end

    test "maybe_record never raises, even for garbage sessions" do
      result =
        Results.maybe_record(
          "match_ended",
          %{
            activity_def: %{"type" => "sporefall"},
            session_id: "s",
            match_id: nil,
            players: %{}
          },
                 %{}
               )

      assert match?({:ok, _}, result) or match?({:error, _}, result) or result == :ignore
    end
  end

  defp eventually(_fun, tries \\ 400)
  defp eventually(_fun, tries) when tries <= 0, do: false

  defp eventually(fun, tries) do
    if fun.() do
      true
    else
      Process.sleep(5)
      eventually(fun, tries - 1)
    end
  end
end
