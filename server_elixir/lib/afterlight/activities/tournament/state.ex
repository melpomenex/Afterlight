defmodule Afterlight.Activities.Tournament.State do
  @moduledoc """
  Pure room-local pool bracket reducer (tasks 10.6–10.7, design D8).

  Mirrors `shared/tournamentModel.js`: 4/8-player single-elim, 60s check-in,
  labeled walkovers without played-match credit, idempotent advancement.
  """

  @game "pool"
  @sizes [4, 8]
  @check_in_ms 60_000
  @activity_id "orpheum-pool"
  @played MapSet.new([
            "completed",
            "played",
            "eight_ball",
            "early_eight",
            "wrong_pocket_eight",
            "scratch_on_eight",
            "resignation",
            "score"
          ])

  def check_in_ms, do: @check_in_ms
  def activity_id, do: @activity_id
  def sizes, do: @sizes

  def idle(room_id \\ nil) do
    %{
      id: nil,
      room_id: room_id,
      game: @game,
      rules_version: 1,
      size: nil,
      status: "idle",
      cancel_reason: nil,
      players: [],
      matches: [],
      active_match_id: nil,
      check_in_deadline: nil,
      activity_id: @activity_id,
      champion_id: nil,
      revision: 0
    }
  end

  def apply_action(state, action, now \\ 0, ctx \\ %{})

  def apply_action(state, %{"type" => type} = action, now, ctx),
    do: apply_action(state, Map.put(action, :type, type), now, ctx)

  def apply_action(state, %{type: "enroll"} = action, now, ctx), do: enroll(state, action, now, ctx)
  def apply_action(state, %{type: "withdraw"} = action, now, _ctx), do: withdraw(state, action, now)
  def apply_action(state, %{type: "check_in"} = action, now, _ctx), do: check_in(state, action, now)
  def apply_action(state, %{type: "tick"}, now, _ctx), do: tick(state, now)
  def apply_action(state, %{type: "verified_result"} = action, now, _ctx), do: verified_result(state, action, now)
  def apply_action(state, %{type: "server_restart"}, _now, _ctx), do: cancel_unfinished(state, "server_restart")
  def apply_action(state, %{type: "cancel"} = action, _now, _ctx),
    do: cancel_unfinished(state, Map.get(action, :reason) || Map.get(action, "reason") || "cancelled")

  def apply_action(state, _, _, _), do: fail(state, "invalid_request")

  def occupies?(state, player_id) do
    state.status not in ["idle", "complete", "cancelled"] and
      Enum.any?(state.players, fn p -> p.player_id == player_id and p.status != "withdrawn" end)
  end

  def assigned_activity(state, player_id) do
    if occupies?(state, player_id) do
      match = Enum.find(state.matches, &(&1.id == state.active_match_id))

      if match && match.status == "assigned" &&
           (match.player_a == player_id or match.player_b == player_id) do
        state.activity_id
      end
    end
  end

  def snapshot(state) do
    %{
      "type" => "tournament_state",
      "id" => state.id,
      "roomId" => state.room_id,
      "game" => state.game,
      "rulesVersion" => state.rules_version,
      "size" => state.size,
      "status" => state.status,
      "cancelReason" => state.cancel_reason,
      "players" =>
        Enum.map(state.players, fn p ->
          %{
            "playerId" => p.player_id,
            "displayName" => p.display_name,
            "enrolledAt" => p.enrolled_at,
            "checkedIn" => p.checked_in,
            "status" => p.status
          }
        end),
      "matches" =>
        Enum.map(state.matches, fn m ->
          %{
            "id" => m.id,
            "round" => m.round,
            "index" => m.index,
            "playerA" => m.player_a,
            "playerB" => m.player_b,
            "winnerId" => m.winner_id,
            "outcome" => m.outcome,
            "status" => m.status,
            "activityId" => m.activity_id,
            "credited" => m.credited,
            "verifiedMatchId" => m.verified_match_id
          }
        end),
      "activeMatchId" => state.active_match_id,
      "checkInDeadline" => state.check_in_deadline,
      "activityId" => state.activity_id,
      "championId" => state.champion_id,
      "revision" => state.revision
    }
  end

  defp enroll(state, action, now, ctx) do
    player_id = id(action, :player_id, "playerId")

    cond do
      player_id == nil ->
        fail(state, "invalid_request")

      occupies?(state, player_id) ->
        fail(state, "already_enrolled")

      player_id in List.wrap(Map.get(ctx, :casual_player_ids) || Map.get(ctx, "casualPlayerIds")) ->
        fail(state, "casual_tournament_conflict")

      state.status == "idle" ->
        size = Map.get(action, :size) || Map.get(action, "size")

        if size in @sizes do
          ok(
            mutate(state, %{
              id: Map.get(action, :tournament_id) || Map.get(action, "tournamentId") || "t_#{now}_#{player_id}",
              size: size,
              status: "enrolling",
              cancel_reason: nil,
              champion_id: nil,
              players: [player(player_id, action, now)],
              matches: [],
              active_match_id: nil,
              check_in_deadline: nil
            })
          )
        else
          fail(state, "invalid_size")
        end

      state.status != "enrolling" ->
        fail(state, "tournament_not_open")

      length(state.players) >= state.size ->
        fail(state, "tournament_full")

      true ->
        next = mutate(state, %{players: state.players ++ [player(player_id, action, now)]})

        if length(next.players) == next.size do
          ok(open_bracket(next, now))
        else
          ok(next)
        end
    end
  end

  defp withdraw(state, action, now) do
    player_id = id(action, :player_id, "playerId")

    cond do
      player_id == nil ->
        fail(state, "invalid_request")

      not Enum.any?(state.players, &(&1.player_id == player_id)) ->
        fail(state, "not_enrolled")

      state.status == "enrolling" ->
        players = Enum.reject(state.players, &(&1.player_id == player_id))

        if players == [] do
          ok(%{idle(state.room_id) | revision: state.revision + 1})
        else
          ok(mutate(state, %{players: players}))
        end

      state.status not in ["check_in", "in_progress"] ->
        fail(state, "tournament_not_open")

      true ->
        players =
          Enum.map(state.players, fn p ->
            if p.player_id == player_id, do: %{p | status: "withdrawn", checked_in: false}, else: p
          end)

        next = mutate(state, %{players: players})
        active = Enum.find(next.matches, &(&1.id == next.active_match_id))

        next =
          cond do
            active && (active.player_a == player_id or active.player_b == player_id) ->
              other = if active.player_a == player_id, do: active.player_b, else: active.player_a

              if other && player_active?(next, other) do
                next
                |> complete_match(active, %{winner_id: other, outcome: "walkover", credited: false})
                |> advance_winner(active, other)
              else
                complete_match(next, active, %{winner_id: nil, outcome: "cancelled", credited: false})
              end

            true ->
              next
          end

        ok(progress(next, now))
    end
  end

  defp check_in(state, action, _now) do
    player_id = id(action, :player_id, "playerId")
    match = Enum.find(state.matches, &(&1.id == state.active_match_id))

    cond do
      player_id == nil ->
        fail(state, "invalid_request")

      state.status != "check_in" ->
        fail(state, "tournament_not_open")

      match == nil or match.status != "check_in" ->
        fail(state, "unknown_match")

      match.player_a != player_id and match.player_b != player_id ->
        fail(state, "not_enrolled")

      true ->
        players =
          Enum.map(state.players, fn p ->
            if p.player_id == player_id, do: %{p | checked_in: true}, else: p
          end)

        next = mutate(state, %{players: players})

        next =
          if checked_in?(next, match.player_a) and checked_in?(next, match.player_b) do
            mutate(next, %{
              status: "in_progress",
              check_in_deadline: nil,
              matches:
                Enum.map(next.matches, fn m ->
                  if m.id == match.id,
                    do: %{m | status: "assigned", activity_id: next.activity_id},
                    else: m
                end)
            })
          else
            next
          end

        ok(next)
    end
  end

  defp tick(state, now) do
    match = Enum.find(state.matches, &(&1.id == state.active_match_id))

    cond do
      state.status != "check_in" ->
        ok(state)

      state.check_in_deadline == nil or now < state.check_in_deadline ->
        ok(state)

      match == nil or match.status != "check_in" ->
        ok(state)

      true ->
        ok(progress(resolve_no_show(state, match), now))
    end
  end

  defp verified_result(state, action, now) do
    match = find_assigned(state, action)

    cond do
      state.status not in ["in_progress", "check_in"] ->
        fail(state, "tournament_not_open")

      match == nil ->
        fail(state, "unknown_match")

      match.status in ["complete", "cancelled"] ->
        ok(state)

      match.status != "assigned" ->
        fail(state, "unknown_match")

      true ->
        winner_id = id(action, :winner_id, "winnerId")
        outcome = Map.get(action, :outcome) || Map.get(action, "outcome")
        credited = MapSet.member?(@played, outcome)

        cond do
          winner_id == nil or (winner_id != match.player_a and winner_id != match.player_b) ->
            fail(state, "invalid_request")

          not credited and outcome != "forfeit" ->
            fail(state, "invalid_request")

          true ->
            next =
              complete_match(state, match, %{
                winner_id: winner_id,
                outcome: if(credited, do: "played", else: "forfeit"),
                credited: credited,
                verified_match_id:
                  Map.get(action, :verified_match_id) || Map.get(action, "verifiedMatchId") || match.id
              })

            ok(progress(next, now))
        end
    end
  end

  defp cancel_unfinished(state, reason) do
    if state.status in ["idle", "complete", "cancelled"] do
      ok(state)
    else
      matches =
        Enum.map(state.matches, fn m ->
          if m.status in ["complete", "cancelled"] do
            m
          else
            %{m | status: "cancelled", outcome: "cancelled", credited: false, winner_id: nil}
          end
        end)

      ok(
        mutate(state, %{
          status: "cancelled",
          cancel_reason: reason,
          matches: matches,
          active_match_id: nil,
          check_in_deadline: nil,
          champion_id: nil
        })
      )
    end
  end

  defp open_bracket(state, now) do
    matches = build_matches(state.id, state.size, state.players)
    start_next_check_in(mutate(state, %{matches: matches, status: "check_in"}), now)
  end

  defp build_matches(tid, size, players) do
    rounds = round_count(size)

    for round <- 0..(rounds - 1),
        index <- 0..(div(size, Bitwise.bsl(1, round + 1)) - 1) do
      {a, b} =
        if round == 0 do
          pa = Enum.at(players, index * 2)
          pb = Enum.at(players, index * 2 + 1)
          {pa && pa.player_id, pb && pb.player_id}
        else
          {nil, nil}
        end

      %{
        id: "#{tid}:r#{round}:m#{index}",
        round: round,
        index: index,
        player_a: a,
        player_b: b,
        winner_id: nil,
        outcome: nil,
        status: "pending",
        activity_id: nil,
        credited: false,
        verified_match_id: nil,
        advanced: false
      }
    end
  end

  defp start_next_check_in(state, now) do
    next_pending =
      Enum.find(state.matches, fn m ->
        m.status == "pending" and m.player_a && m.player_b
      end)

    unresolved =
      Enum.find(state.matches, fn m ->
        m.status == "pending" and (m.player_a == nil or m.player_b == nil)
      end)

    cond do
      next_pending ->
        players = Enum.map(state.players, &%{&1 | checked_in: false})

        mutate(state, %{
          status: "check_in",
          active_match_id: next_pending.id,
          check_in_deadline: now + @check_in_ms,
          players: players,
          matches:
            Enum.map(state.matches, fn m ->
              if m.id == next_pending.id, do: %{m | status: "check_in"}, else: m
            end)
        })

      unresolved && unresolved.player_a == nil && unresolved.player_b == nil ->
        start_next_check_in(
          complete_match(state, unresolved, %{winner_id: nil, outcome: "cancelled", credited: false}),
          now
        )

      unresolved ->
        present = unresolved.player_a || unresolved.player_b

        state
        |> complete_match(unresolved, %{winner_id: present, outcome: "walkover", credited: false})
        |> advance_winner(unresolved, present)
        |> start_next_check_in(now)

      true ->
        finish_if_done(state)
    end
  end

  defp resolve_no_show(state, match) do
    a_in = checked_in?(state, match.player_a) and player_active?(state, match.player_a)
    b_in = checked_in?(state, match.player_b) and player_active?(state, match.player_b)

    cond do
      a_in and not b_in ->
        state
        |> complete_match(match, %{winner_id: match.player_a, outcome: "walkover", credited: false})
        |> advance_winner(match, match.player_a)

      b_in and not a_in ->
        state
        |> complete_match(match, %{winner_id: match.player_b, outcome: "walkover", credited: false})
        |> advance_winner(match, match.player_b)

      true ->
        complete_match(state, match, %{winner_id: nil, outcome: "cancelled", credited: false})
    end
  end

  defp progress(state, now) do
    state |> maybe_advance_played() |> start_next_check_in(now)
  end

  defp maybe_advance_played(state) do
    case Enum.find(state.matches, &(&1.status == "complete" and &1.winner_id && not &1.advanced)) do
      nil -> state
      match -> advance_winner(state, match, match.winner_id)
    end
  end

  defp advance_winner(state, match, winner_id) do
    next_round = match.round + 1
    next_index = div(match.index, 2)
    next_id = "#{state.id}:r#{next_round}:m#{next_index}"
    slot = if rem(match.index, 2) == 0, do: :player_a, else: :player_b

    matches =
      Enum.map(state.matches, fn m ->
        cond do
          m.id == match.id ->
            %{m | advanced: true}

          m.id == next_id ->
            Map.put(m, slot, winner_id)

          true ->
            m
        end
      end)

    finish_if_done(%{
      state
      | matches: matches,
        active_match_id: if(state.active_match_id == match.id, do: nil, else: state.active_match_id),
        check_in_deadline: if(state.active_match_id == match.id, do: nil, else: state.check_in_deadline)
    })
  end

  defp finish_if_done(state) do
    final_round = round_count(state.size) - 1
    final = Enum.find(state.matches, &(&1.round == final_round))

    cond do
      final && final.status == "complete" && final.winner_id ->
        mutate(state, %{
          status: "complete",
          champion_id: final.winner_id,
          active_match_id: nil,
          check_in_deadline: nil
        })

      final && final.status == "cancelled" ->
        mutate(state, %{
          status: "cancelled",
          cancel_reason: state.cancel_reason || "empty_final",
          champion_id: nil,
          active_match_id: nil,
          check_in_deadline: nil
        })

      not Enum.any?(state.matches, &(&1.status in ["pending", "check_in", "assigned"])) and
          state.status != "complete" ->
        mutate(state, %{
          status: "cancelled",
          cancel_reason: state.cancel_reason || "empty_final",
          active_match_id: nil,
          check_in_deadline: nil
        })

      true ->
        state
    end
  end

  defp complete_match(state, match, fields) do
    status = if fields.outcome == "cancelled", do: "cancelled", else: "complete"

    mutate(state, %{
      matches:
        Enum.map(state.matches, fn m ->
          if m.id == match.id do
            %{
              m
              | status: status,
                winner_id: fields.winner_id,
                outcome: fields.outcome,
                credited: !!fields.credited,
                verified_match_id: Map.get(fields, :verified_match_id),
                activity_id: if(fields.credited, do: state.activity_id, else: m.activity_id)
            }
          else
            m
          end
        end),
      active_match_id: if(state.active_match_id == match.id, do: nil, else: state.active_match_id),
      check_in_deadline: if(state.active_match_id == match.id, do: nil, else: state.check_in_deadline)
    })
  end

  defp find_assigned(state, action) do
    match_id = Map.get(action, :match_id) || Map.get(action, "matchId")

    cond do
      is_binary(match_id) ->
        Enum.find(state.matches, &(&1.id == match_id))

      true ->
        a = id(action, :player_a, "playerA")
        b = id(action, :player_b, "playerB")

        if a && b do
          Enum.find(state.matches, fn m ->
            m.status == "assigned" and
              ((m.player_a == a and m.player_b == b) or (m.player_a == b and m.player_b == a))
          end)
        else
          Enum.find(state.matches, &(&1.id == state.active_match_id and &1.status == "assigned"))
        end
    end
  end

  defp checked_in?(state, player_id) do
    player_id != nil and
      Enum.any?(state.players, &(&1.player_id == player_id and &1.checked_in and &1.status != "withdrawn"))
  end

  defp player_active?(state, player_id) do
    player_id != nil and Enum.any?(state.players, &(&1.player_id == player_id and &1.status != "withdrawn"))
  end

  defp player(player_id, action, now) do
    name = Map.get(action, :display_name) || Map.get(action, "displayName") || "visitor"

    %{
      player_id: player_id,
      display_name: name,
      enrolled_at: now,
      checked_in: false,
      status: "enrolled"
    }
  end

  defp id(action, atom, string) do
    val = Map.get(action, atom) || Map.get(action, string)

    if is_binary(val) and val != "" and String.length(val) <= 64, do: val
  end

  defp mutate(state, patch) do
    Map.merge(state, Map.put(patch, :revision, state.revision + 1))
  end

  defp round_count(4), do: 2
  defp round_count(8), do: 3
  defp round_count(_), do: 0

  defp ok(state), do: {:ok, state}
  defp fail(state, error), do: {:error, error, state}
end
