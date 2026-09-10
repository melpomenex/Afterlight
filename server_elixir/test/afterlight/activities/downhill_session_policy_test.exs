defmodule Afterlight.Activities.DownhillMayhem.SessionPolicyTest do
  use ExUnit.Case, async: true

  alias Afterlight.Activities.DownhillMayhem
  alias Afterlight.Activities.DownhillMayhem.{Course, SessionPolicy}

  @act_def %{"minPlayers" => 1, "readyPolicy" => "explicit", "course" => %{"id" => "classic", "version" => 1}, "capacities" => %{"players" => 6, "spectators" => 32, "queue" => 16}}

  defp human(id, joined, ready) do
    %{"player_id" => id, "role" => "player", "connected?" => true, "joined_at" => joined, "ready" => ready, "nickname" => id}
  end

  test "captain is the first seated connected human" do
    players = [human("b", 2, true), human("a", 1, false), %{"player_id" => "w", "role" => "spectator", "connected?" => true, "joined_at" => 0}]
    assert SessionPolicy.captain(players) == "a"
    assert SessionPolicy.captain([%{"player_id" => "x", "role" => "player", "connected?" => false, "joined_at" => 0}]) == nil
  end

  test "start readiness requires every connected human ready and the minimum" do
    assert SessionPolicy.start_ready?([human("a", 1, true)], 1) == true
    assert SessionPolicy.start_ready?([human("a", 1, false)], 1) == false
    assert SessionPolicy.start_ready?([human("a", 1, true), human("b", 2, false)], 1) == false
    assert SessionPolicy.start_ready?([], 1) == false
  end

  test "assign_field fills six slots with humans then AI" do
    players = [human("a", 1, true), human("b", 2, true), human("c", 3, true)]
    ai = Enum.map(1..3, fn i -> %{name: "AI#{i}"} end)
    field = SessionPolicy.assign_field(players, ai)
    assert Enum.map(field, & &1.slot) == [0, 1, 2, 3, 4, 5]
    assert Enum.map(Enum.take(field, 3), & &1.player_id) == ["a", "b", "c"]
    assert Enum.all?(Enum.drop(field, 3), & &1.is_ai)
  end

  test "min_players defaults and max_players read the manifest" do
    assert SessionPolicy.min_players(@act_def) == 1
    assert SessionPolicy.max_players(@act_def) == 6
  end

  test "a filled field simulates forward and stays finite" do
    course = Course.load_crafted("classic")
    ai = Enum.map(0..5, fn i -> %{name: "AI#{i}", slot: i} end)
    field = SessionPolicy.assign_field([], ai)
    sim = SessionPolicy.init_sim(course, field, "mayhem", 4242)
    assert map_size(sim["riders"]) == 6

    {sim, _events, _} =
      Enum.reduce(0..300, {sim, [], :continue}, fn i, {s, ev, _} ->
        {s2, e2, outcome} = SessionPolicy.step(course, s, i / 30)
        {s2, ev ++ e2, outcome}
      end)

    assert sim["tick"] == 301
    assert Enum.all?(Map.values(sim["riders"]), fn r -> is_number(r.s) and r.s >= 0 end)
    assert Enum.any?(Map.values(sim["riders"]), fn r -> r.s > 50 end)
  end

  test "standings order finishes before DNF and DNF has a reason" do
    course = Course.load_crafted("classic")
    ai = Enum.map(0..5, fn i -> %{name: "AI#{i}", slot: i} end)
    field = SessionPolicy.assign_field([], ai)
    sim = SessionPolicy.init_sim(course, field, "mayhem", 1)
    riders = sim["riders"]

    riders = Map.update!(riders, 0, fn r -> %{r | finished: true, finish_time: 90.0, finish_key: 90.0} end)
    riders = Map.update!(riders, 1, fn r -> %{r | finished: true, finish_time: 90.0, finish_key: 90.0} end)
    riders = Map.update!(riders, 2, fn r -> %{r | finished: true, finish_time: 91.0, finish_key: 91.0} end)
    riders = SessionPolicy.dnf(riders, 3, "disconnect")

    table = SessionPolicy.standings(%{sim | "riders" => riders}, [])
    assert length(table) == 6
    assert Enum.take(table, 3) |> Enum.map(& &1.place) == [1, 1, 3]
    dnf = Enum.find(table, &(&1.slot == 3))
    assert dnf.status == "dnf"
    assert dnf.dnfReason == "disconnect"
    assert dnf.timeMs == nil
  end
end
