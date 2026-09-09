defmodule Afterlight.Activities.Tournament.StateTest do
  use ExUnit.Case, async: true

  alias Afterlight.Activities.Tournament.State

  defp enroll_all(size, now \\ 1000) do
    state = State.idle("theater")

    Enum.reduce(0..(size - 1), state, fn i, acc ->
      assert {:ok, next} =
               State.apply_action(
                 acc,
                 %{
                   type: "enroll",
                   player_id: "p#{i}",
                   display_name: "Player #{i}",
                   size: size,
                   tournament_id: "t_test"
                 },
                 now + i
               )

      next
    end)
  end

  defp check_in_both(state, match, now) do
    assert {:ok, s1} = State.apply_action(state, %{type: "check_in", player_id: match.player_a}, now)
    assert {:ok, s2} = State.apply_action(s1, %{type: "check_in", player_id: match.player_b}, now + 1)
    s2
  end

  test "four-player field opens a bracket and starts check-in" do
    state = enroll_all(4)
    assert state.status == "check_in"
    assert length(state.matches) == 3
    active = Enum.find(state.matches, &(&1.id == state.active_match_id))
    assert active.status == "check_in"
    assert active.player_a == "p0"
  end

  test "casual occupants cannot enroll" do
    {:error, "casual_tournament_conflict", _} =
      State.apply_action(State.idle(), %{type: "enroll", player_id: "p0", size: 4}, 1, %{
        casual_player_ids: ["p0"]
      })
  end

  test "one check-in plus deadline is a labeled walkover without credit" do
    state = enroll_all(4, 5000)
    match = Enum.find(state.matches, &(&1.id == state.active_match_id))
    {:ok, state} = State.apply_action(state, %{type: "check_in", player_id: match.player_a}, 5100)
    {:ok, ticked} = State.apply_action(state, %{type: "tick"}, state.check_in_deadline)
    done = Enum.find(ticked.matches, &(&1.id == match.id))
    assert done.outcome == "walkover"
    assert done.credited == false
    assert done.winner_id == match.player_a
  end

  test "neither present cancels the pairing without fictional wins" do
    state = enroll_all(4, 0)
    match = Enum.find(state.matches, &(&1.id == state.active_match_id))
    {:ok, ticked} = State.apply_action(state, %{type: "tick"}, state.check_in_deadline)
    done = Enum.find(ticked.matches, &(&1.id == match.id))
    assert done.outcome == "cancelled"
    assert done.winner_id == nil
    assert done.credited == false
  end

  test "verified result advances once and ignores retries" do
    state = enroll_all(4, 0)
    match = Enum.find(state.matches, &(&1.id == state.active_match_id))
    state = check_in_both(state, match, 10)
    payload = %{type: "verified_result", match_id: match.id, winner_id: match.player_a, outcome: "eight_ball"}
    {:ok, first} = State.apply_action(state, payload, 20)
    final = Enum.find(first.matches, &(&1.round == 1))
    assert final.player_a == match.player_a
    {:ok, retry} = State.apply_action(first, payload, 21)
    assert Enum.find(retry.matches, &(&1.round == 1)).player_a == match.player_a
    played = Enum.find(retry.matches, &(&1.id == match.id))
    assert played.credited == true
    assert played.outcome == "played"
  end

  test "complete four-player bracket names a champion from verified play" do
    state = enroll_all(4, 0)

    state =
      Enum.reduce(1..3, state, fn _, acc ->
        match = Enum.find(acc.matches, &(&1.id == acc.active_match_id))
        acc = check_in_both(acc, match, acc.revision)
        {:ok, next} =
          State.apply_action(acc, %{
            type: "verified_result",
            match_id: match.id,
            winner_id: match.player_a,
            outcome: "completed"
          }, acc.revision + 1)

        next
      end)

    assert state.status == "complete"
    assert state.champion_id == "p0"
    assert Enum.count(state.matches, & &1.credited) == 3
  end

  test "server restart cancels unfinished matches and keeps played results" do
    state = enroll_all(4, 0)
    match = Enum.find(state.matches, &(&1.id == state.active_match_id))
    state = check_in_both(state, match, 10)

    {:ok, state} =
      State.apply_action(state, %{
        type: "verified_result",
        match_id: match.id,
        winner_id: match.player_a,
        outcome: "completed"
      }, 20)

    {:ok, cancelled} = State.apply_action(state, %{type: "server_restart"}, 30)
    assert cancelled.status == "cancelled"
    assert cancelled.cancel_reason == "server_restart"
    kept = Enum.find(cancelled.matches, &(&1.id == match.id))
    assert kept.outcome == "played"
    assert kept.credited == true
    refute State.occupies?(cancelled, match.player_a)
  end

  test "eight-player withdraw is an immediate walkover" do
    state = enroll_all(8, 0)
    assert length(state.matches) == 7
    match = Enum.find(state.matches, &(&1.id == state.active_match_id))
    {:ok, next_state} = State.apply_action(state, %{type: "withdraw", player_id: match.player_b}, 50)
    walked = Enum.find(next_state.matches, &(&1.id == match.id))
    assert walked.outcome == "walkover"
    assert walked.winner_id == match.player_a
    assert walked.credited == false
  end
end
