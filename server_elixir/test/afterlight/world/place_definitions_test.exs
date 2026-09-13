defmodule Afterlight.World.PlaceDefinitionsTest do
  @moduledoc """
  Task 3.1: the boot-validated public place projection — roundtrip with the
  committed file, drift-shaped named errors on malformed/oversized
  configuration, retired garden privacy, and unchanged Rooms.resolve compatibility
  for unknown legacy room strings.
  """

  use ExUnit.Case, async: false

  alias Afterlight.World.PlaceDefinitions
  alias Afterlight.World.Rooms

  @committed Path.join(Application.app_dir(:afterlight), "priv/place_definitions.json")

  describe "the committed projection" do
    test "loads at boot and serves the exact public ids the JS manifest froze" do
      assert {:ok, entries} = PlaceDefinitions.load(@committed)
      assert length(entries) == 17
      assert PlaceDefinitions.count() == 17

      assert PlaceDefinitions.ids() == ~w(court canal station aqueduct caldera understory saltworks rooftops mangrove trestle foundry frost-spire delta archives kiln-terrace theater desert-camp)

      # Both runtimes agree on the identical public ids/bounds for the venue.
      theater = PlaceDefinitions.get("theater")
      assert theater["public"] == true
      assert theater["kind"] == "venue"
      assert theater["bounds"] == %{"minX" => -11.3, "maxX" => 11.3, "minZ" => -9.5, "maxZ" => 10.3}

      # The Theater Environment campaign: the venue spawns in Coastal Dusk and
      # carries the explicit 18-preset allow-list `atmosphere_set` validates
      # against. Every other place keeps a fixed preset.
      assert theater["atmosphere"]["preset"] == "env-coastal-sunset"
      assert theater["atmosphere"]["weatherMode"] == "fixed"
      assert theater["atmosphere"]["timeMode"] == "fixed"

      assert theater["atmosphere"]["presets"] == ~w(
        env-coastal-sunset env-coastal-storm env-coastal-midnight
        env-rainforest-mist env-rainforest-afternoon env-rainforest-thunderstorm
        env-alpine-aurora env-alpine-morning env-alpine-snowfall
        env-desert-golden env-desert-sandstorm env-desert-night
        env-redwood-firefly env-redwood-fog env-redwood-sunshafts
        env-cloud-sunrise env-cloud-day env-cloud-storm
      )

      for entry <- entries, entry["id"] != "theater" do
        refute Map.has_key?(entry["atmosphere"], "presets"), "only the Theater adopts environment presets"
      end
    end

    test "every entry is public and carries only the whitelisted fields" do
      for entry <- PlaceDefinitions.all() do
        assert MapSet.new(Map.keys(entry)) ==
                 MapSet.new(["id", "public", "kind", "bounds", "atmosphere", "activities"])

        assert entry["public"] == true
        assert entry["kind"] in ~w(environment venue view)
        assert is_list(entry["activities"])
      end
    end

    test "known?/get answer feature lookups; unknown ids have no entry" do
      assert PlaceDefinitions.known?("theater")
      assert PlaceDefinitions.known?("frost-spire")
      refute PlaceDefinitions.known?("the-orpheum")
      refute PlaceDefinitions.known?(nil)
      assert PlaceDefinitions.get("nope") == nil
    end

    test "no retired garden entry is ever projected" do
      for entry <- PlaceDefinitions.all() do
        refute String.starts_with?(entry["id"], "garden:")
      end
    end

    test "unknown legacy room strings stay resolvable — they just get no feature entry" do
      # Rooms.resolve compatibility is untouched (task 3.1 do-not-change).
      assert {:ok, %{wire_id: "some-legacy-tool-room"}} = Rooms.resolve("some-legacy-tool-room")
      refute PlaceDefinitions.known?("some-legacy-tool-room")

      # The retired garden-prefix room id survives as an open public string.
      assert {:ok, %{kind: :public}} = Rooms.resolve("garden:someone")
      refute PlaceDefinitions.known?("garden:someone")
    end
  end

  describe "validation fails closed with named errors" do
    test "malformed JSON" do
      path = tmp_path("not-json")
      File.write!(path, "{definitely not json")

      assert {:error, :not_json} = PlaceDefinitions.load(path)
      assert_raise ArgumentError, ~r/invalid place projection/, fn -> PlaceDefinitions.load!(path) end
    after
      cleanup_tmp("not-json")
    end

    test "wrong schema version" do
      path = tmp_path("schema")
      File.write!(path, Jason.encode!(%{"schemaVersion" => 99, "entries" => []}))

      assert {:error, {:invalid_schema_version, 99}} = PlaceDefinitions.load(path)
    after
      cleanup_tmp("schema")
    end

    test "missing entries" do
      path = tmp_path("missing-entries")
      File.write!(path, Jason.encode!(%{"schemaVersion" => 1}))

      assert {:error, :missing_entries} = PlaceDefinitions.load(path)
    after
      cleanup_tmp("missing-entries")
    end

    test "oversized configuration is rejected, never silently hidden" do
      entries =
        for i <- 1..(PlaceDefinitions.max_entries() + 1), do: valid_entry("probe-#{i}")

      path = tmp_path("oversized")
      File.write!(path, Jason.encode!(%{"schemaVersion" => 1, "entries" => entries}))

      assert {:error, {:too_many_entries, 65}} = PlaceDefinitions.load(path)
    after
      cleanup_tmp("oversized")
    end

    test "invalid entry reports the offending id" do
      bad_bounds = valid_entry("bad-bounds") |> Map.put("bounds", %{"minX" => 0, "maxX" => "x", "minZ" => 0, "maxZ" => 1})
      bad_kind = valid_entry("bad-kind") |> Map.put("kind", "castle")

      path = tmp_path("invalid-entry")
      File.write!(path, Jason.encode!(%{"schemaVersion" => 1, "entries" => [valid_entry("good-place"), bad_bounds]}))

      assert {:error, {:invalid_entry, "bad-bounds", problems}} = PlaceDefinitions.load(path)
      assert "bounds must be finite numbers" in problems

      path2 = tmp_path("invalid-kind")
      File.write!(path2, Jason.encode!(%{"schemaVersion" => 1, "entries" => [bad_kind]}))

      assert {:error, {:invalid_entry, "bad-kind", problems}} = PlaceDefinitions.load(path2)
      assert "kind must be one of environment, venue, view" in problems
    after
      cleanup_tmp("invalid-entry")
      cleanup_tmp("invalid-kind")
    end

    test "duplicate ids" do
      path = tmp_path("duplicate")
      File.write!(path, Jason.encode!(%{"schemaVersion" => 1, "entries" => [valid_entry("twice"), valid_entry("twice")]}))

      assert {:error, {:duplicate_id, "twice"}} = PlaceDefinitions.load(path)
    after
      cleanup_tmp("duplicate")
    end

    test "a retired garden-prefixed id is rejected by validation" do
      garden = %{"id" => "garden:someone", "public" => true, "kind" => "environment"}
      path = tmp_path("garden")
      File.write!(path, Jason.encode!(%{"schemaVersion" => 1, "entries" => [garden]}))

      assert {:error, {:retired_garden_id, "garden:someone"}} = PlaceDefinitions.load(path)
    after
      cleanup_tmp("garden")
    end

    test "a non-public entry is rejected" do
      hidden = valid_entry("hidden-place") |> Map.put("public", false)
      path = tmp_path("hidden")
      File.write!(path, Jason.encode!(%{"schemaVersion" => 1, "entries" => [hidden]}))

      assert {:error, {:invalid_entry, "hidden-place", problems}} = PlaceDefinitions.load(path)
      assert "only public places are projected" in problems
    after
      cleanup_tmp("hidden")
    end
  end

  defp valid_entry(id) do
    %{
      "id" => id,
      "public" => true,
      "kind" => "environment",
      "bounds" => %{"minX" => -11.3, "maxX" => 11.3, "minZ" => -9.5, "maxZ" => 10.3},
      "atmosphere" => %{"preset" => nil, "weatherMode" => "fixed", "timeMode" => "fixed"},
      "activities" => []
    }
  end

  ## Atmosphere preset table (add-atmosphere-weather-system B 1.2)

  describe "the optional atmosphere preset table" do
    test "the committed projection ships the semantic presets the JS registry froze" do
      presets = PlaceDefinitions.presets()

      assert MapSet.new(Map.keys(presets)) ==
               MapSet.new(
                 ~w(clear rain storm dry-heat diurnal-rain rain-night desert-night rooftop-cycle)
                 ++ ~w(
                   env-coastal-sunset env-coastal-storm env-coastal-midnight
                   env-rainforest-mist env-rainforest-afternoon env-rainforest-thunderstorm
                   env-alpine-aurora env-alpine-morning env-alpine-snowfall
                   env-desert-golden env-desert-sandstorm env-desert-night
                   env-redwood-firefly env-redwood-fog env-redwood-sunshafts
                   env-cloud-sunrise env-cloud-day env-cloud-storm
                 )
               )

      rain = presets["rain"]
      assert rain["weather"] == "fixed"
      assert rain["wetness"] == 1
      assert rain["intensity"] |> is_number()
      assert length(rain["wind"]) == 2
      assert rain["events"]["lightning"]["minMs"] >= 45_000
      assert rain["events"]["meteor"] == nil

      scheduled = presets["diurnal-rain"]
      assert scheduled["weather"] == "scheduled"
      assert length(scheduled["schedule"]["keyframes"]) >= 2

      # Colors/audio never reach the server projection.
      for {_id, preset} <- presets, key <- Map.keys(preset) do
        assert key not in ~w(visuals audio), "renderer-only keys stay client-side"
      end
    end

    test "a schema-1 projection without presets still loads (additive key)" do
      path = tmp_path("no-presets")
      File.write!(path, Jason.encode!(%{"schemaVersion" => 1, "entries" => []}))

      assert {:ok, []} = PlaceDefinitions.load(path)
    after
      cleanup_tmp("no-presets")
    end

    test "malformed presets are rejected whole with named errors" do
      valid = %{
        "id" => "rain",
        "weather" => "fixed",
        "intensity" => 0.6,
        "wind" => [0.2, 0.05],
        "rain" => 0.7,
        "wetness" => 1,
        "events" => nil,
        "schedule" => nil
      }

      path = tmp_path("bad-preset")
      bad = valid |> Map.put("weather", "dynamic")
      File.write!(path, Jason.encode!(%{"schemaVersion" => 1, "entries" => [], "presets" => [bad]}))

      assert {:error, {:invalid_presets, "rain", problems}} = PlaceDefinitions.load(path)
      assert is_list(problems)

      path2 = tmp_path("bad-preset-spacing")
      bad_spacing = valid |> Map.put("events", %{"lightning" => %{"minMs" => 10_000, "maxMs" => 20_000}, "meteor" => nil})
      File.write!(path2, Jason.encode!(%{"schemaVersion" => 1, "entries" => [], "presets" => [bad_spacing]}))

      assert {:error, {:invalid_presets, "rain", problems2}} = PlaceDefinitions.load(path2)
      assert Enum.any?(problems2, &String.contains?(&1, "event spacing escapes the design bounds"))

      path3 = tmp_path("bad-preset-dup")
      File.write!(path3, Jason.encode!(%{"schemaVersion" => 1, "entries" => [], "presets" => [valid, valid]}))

      assert {:error, {:invalid_presets, "rain", ["duplicate preset id"]}} = PlaceDefinitions.load(path3)
    after
      cleanup_tmp("bad-preset")
      cleanup_tmp("bad-preset-spacing")
      cleanup_tmp("bad-preset-dup")
    end
  end

  describe "activities projection and validation" do
    test "backwards compatibility: entries without activities default to []" do
      entry_without_activities = %{
        "id" => "legacy-venue",
        "public" => true,
        "kind" => "venue",
        "bounds" => %{"minX" => -11.3, "maxX" => 11.3, "minZ" => -9.5, "maxZ" => 10.3},
        "atmosphere" => %{"preset" => nil, "weatherMode" => "fixed", "timeMode" => "fixed"}
      }

      path = tmp_path("no-activities")
      File.write!(path, Jason.encode!(%{"schemaVersion" => 1, "entries" => [entry_without_activities]}))

      assert {:ok, [loaded]} = PlaceDefinitions.load(path)
      assert loaded["activities"] == []
    after
      cleanup_tmp("no-activities")
    end

    test "valid activity passes validation and is served by activities/1" do
      act = %{
        "id" => "pong-1",
        "type" => "pong",
        "rulesVersion" => 1,
        "transform" => %{"position" => [0, 0], "rotationY" => 0},
        "footprint" => %{"width" => 2, "depth" => 1.5},
        "interactionRadius" => 2.5,
        "participantAnchors" => [
          %{"slot" => "p1", "position" => [-1.5, 0], "facing" => 1.57},
          %{"slot" => "p2", "position" => [1.5, 0], "facing" => -1.57}
        ],
        "capacities" => %{"players" => 2, "spectators" => 32, "queue" => 16},
        "environmentPolicy" => "none"
      }

      entry = valid_entry("pong-place") |> Map.put("activities", [act])
      path = tmp_path("valid-activity")
      File.write!(path, Jason.encode!(%{"schemaVersion" => 1, "entries" => [entry]}))

      assert {:ok, [loaded]} = PlaceDefinitions.load(path)
      assert length(loaded["activities"]) == 1
    after
      cleanup_tmp("valid-activity")
    end

    test "invalid activity type is rejected" do
      bad_act = %{
        "id" => "bad-act",
        "type" => "unknown-game",
        "rulesVersion" => 1,
        "transform" => %{"position" => [0, 0]},
        "footprint" => %{"width" => 2, "depth" => 1.5},
        "interactionRadius" => 2.5,
        "participantAnchors" => [%{"slot" => "p1", "position" => [0, 0]}],
        "capacities" => %{"players" => 2, "spectators" => 32, "queue" => 16}
      }

      entry = valid_entry("bad-type-place") |> Map.put("activities", [bad_act])
      path = tmp_path("bad-type")
      File.write!(path, Jason.encode!(%{"schemaVersion" => 1, "entries" => [entry]}))

      assert {:error, {:invalid_entry, "bad-type-place", problems}} = PlaceDefinitions.load(path)
      assert Enum.any?(problems, &String.contains?(&1, "unknown activity type"))
    after
      cleanup_tmp("bad-type")
    end

    test "out-of-bounds activity position or anchor is rejected" do
      bad_pos = %{
        "id" => "out-act",
        "type" => "pong",
        "rulesVersion" => 1,
        "transform" => %{"position" => [50, 0]},
        "footprint" => %{"width" => 2, "depth" => 1.5},
        "interactionRadius" => 2.5,
        "participantAnchors" => [%{"slot" => "p1", "position" => [0, 0]}],
        "capacities" => %{"players" => 2, "spectators" => 32, "queue" => 16}
      }

      entry = valid_entry("out-pos-place") |> Map.put("activities", [bad_pos])
      path = tmp_path("out-pos")
      File.write!(path, Jason.encode!(%{"schemaVersion" => 1, "entries" => [entry]}))

      assert {:error, {:invalid_entry, "out-pos-place", problems}} = PlaceDefinitions.load(path)
      assert Enum.any?(problems, &String.contains?(&1, "transform position outside bounds"))
    after
      cleanup_tmp("out-pos")
    end

    test "duplicate activity id within the same place is rejected" do
      act = %{
        "id" => "dupe-act",
        "type" => "pong",
        "rulesVersion" => 1,
        "transform" => %{"position" => [0, 0]},
        "footprint" => %{"width" => 2, "depth" => 1.5},
        "interactionRadius" => 2.5,
        "participantAnchors" => [%{"slot" => "p1", "position" => [0, 0]}],
        "capacities" => %{"players" => 2, "spectators" => 32, "queue" => 16}
      }

      entry = valid_entry("dupe-act-place") |> Map.put("activities", [act, act])
      path = tmp_path("dupe-act")
      File.write!(path, Jason.encode!(%{"schemaVersion" => 1, "entries" => [entry]}))

      assert {:error, {:invalid_entry, "dupe-act-place", problems}} = PlaceDefinitions.load(path)
      assert Enum.any?(problems, &String.contains?(&1, "duplicate activity id"))
    after
      cleanup_tmp("dupe-act")
    end
  end

  defp tmp_path(name), do: Path.join(System.tmp_dir!(), "afterlight-place-projection-#{name}.json")

  defp cleanup_tmp(name) do
    _ = File.rm(tmp_path(name))
    :ok
  end
end
