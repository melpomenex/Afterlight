defmodule Afterlight.Activities.DownhillMayhemTest do
  use ExUnit.Case, async: true

  alias Afterlight.Activities.DownhillMayhem
  alias Afterlight.Activities.DownhillMayhem.Course

  @fixture Path.join([__DIR__, "..", "..", "fixtures", "downhill", "rules_parity.json"])

  setup_all do
    fixture = @fixture |> Path.expand() |> File.read!() |> Jason.decode!()
    {:ok, fixture: fixture}
  end

  defp rider_from_json(j) do
    base = DownhillMayhem.initial_state(j["slot"], is_ai: j["isAI"])

    base
    |> Map.merge(%{
      def: %{
        name: j["def"]["name"],
        top: j["def"]["top"],
        corner: j["def"]["corner"],
        aggr: j["def"]["aggr"],
        trick: j["def"]["trick"],
        crashy: j["def"]["crashy"]
      },
      s: j["s"], lat: j["lat"], y: j["y"], vs: j["vs"], vlat: j["vlat"], vy: j["vy"],
      grounded: j["grounded"], meter: j["meter"], crashed: j["crashed"], finished: j["finished"],
      trick: j["trick"], chain: j["chain"], race_pos: j["race_pos"],
      punch_cd: j["punchCd"], invuln: j["invuln"], air_time: j["airTime"],
      trick_t: j["trickT"], pending_meter: j["pendingMeter"], boost_latch: j["boostLatch"],
      rubber: j["rubber"], draft_t: 0.0, steer_pos: 0.0, wall_t: 0.0
    })
  end

  test "scripted six-rider replay matches the JavaScript authority", %{fixture: fixture} do
    course = Course.load_crafted("classic")
    dt = 1 / 30

    riders =
      fixture["initial"]
      |> Enum.map(&rider_from_json/1)
      |> Map.new(&{&1.slot, &1})

    {riders, _events} =
      Enum.reduce(Enum.with_index(fixture["controls"]), {riders, 0}, fn {row, tick}, {acc, _} ->
        controls = Map.new(row, fn {slot, c} -> {String.to_integer(slot), DownhillMayhem.normalize_controls(c)} end)
        {next, _} = DownhillMayhem.step_field(course, acc, controls, %{difficulty: "mayhem", elapsed: tick * dt})
        {next, tick}
      end)

    # Compare the final recorded tick against the fixture.
    expected = List.last(fixture["states"])

    worst =
      Enum.zip(Enum.sort_by(Map.values(riders), & &1.slot), expected)
      |> Enum.reduce(0.0, fn {got, want}, worst ->
        d =
          Enum.reduce(["s", "lat", "y", "vs", "vlat", "vy", "meter"], worst, fn key, w ->
            g = Map.fetch!(got, String.to_atom(key))
            e = want[key]
            assert_in_delta g, e, 1.0e-6, "#{got.def.name}.#{key} at final tick"
            max(w, abs(g - e))
          end)

        assert got.grounded == want["grounded"], "#{got.def.name} grounded"
        assert got.crashed == want["crashed"], "#{got.def.name} crashed"
        assert got.finished == want["finished"], "#{got.def.name} finished"
        assert got.trick == want["trick"], "#{got.def.name} trick"
        assert got.chain == want["chain"], "#{got.def.name} chain"
        d
      end)

    assert worst < 1.0e-6, "rules parity worst diff #{worst}"
  end
end
