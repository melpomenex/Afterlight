defmodule Afterlight.Activities.AvailabilityTest do
  @moduledoc """
  Canonical admission-gate registry contracts (arcade availability fix).

  The registry is the single source of truth for gated arcade games:
  session admission checks, per-game "isn't open on this server" error
  naming, and the join-time availability snapshot all read from it.
  """

  use Afterlight.DataCase, async: false

  alias Afterlight.Activities.Availability
  alias Afterlight.World.PlaceDefinitions

  describe "check/1" do
    test "gated types fail closed while their flag is off and open when on" do
      Application.put_env(:afterlight, :snowboard_enabled, false)
      Application.put_env(:afterlight, :downhill_mayhem_enabled, false)

      assert {:error, :race_unavailable} = Availability.check("snowboard-race")
      assert {:error, :race_unavailable} = Availability.check("downhill-mayhem")

      Application.put_env(:afterlight, :snowboard_enabled, true)
      Application.put_env(:afterlight, :downhill_mayhem_enabled, true)

      assert :ok = Availability.check("snowboard-race")
      assert :ok = Availability.check("downhill-mayhem")
    after
      Application.put_env(:afterlight, :snowboard_enabled, false)
      Application.put_env(:afterlight, :downhill_mayhem_enabled, false)
    end

    test "ungated activity types are always open" do
      Application.put_env(:afterlight, :snowboard_enabled, false)
      Application.put_env(:afterlight, :downhill_mayhem_enabled, false)

      assert :ok = Availability.check("pong")
      assert :ok = Availability.check("kart-royale")
      assert :ok = Availability.check(nil)
      assert :ok = Availability.check("not-a-real-type")
    after
      Application.put_env(:afterlight, :snowboard_enabled, false)
      Application.put_env(:afterlight, :downhill_mayhem_enabled, false)
    end
  end

  describe "titles" do
    test "every gated type names its actual game" do
      assert Availability.title("snowboard-race") == "Summit Run"
      assert Availability.title("downhill-mayhem") == "Downhill Mayhem"
      assert Availability.title("pong") == nil
      assert Availability.title(nil) == nil
    end
  end

  describe "closed_activities/1" do
    test "lists exactly the gated-and-closed activities of a place, titled" do
      Application.put_env(:afterlight, :snowboard_enabled, true)
      Application.put_env(:afterlight, :downhill_mayhem_enabled, false)

      rows = Availability.closed_activities(PlaceDefinitions.activities("theater"))

      assert [%{"id" => "orpheum-downhill-mayhem", "type" => "downhill-mayhem", "title" => "Downhill Mayhem"}] = rows
    after
      Application.put_env(:afterlight, :snowboard_enabled, false)
      Application.put_env(:afterlight, :downhill_mayhem_enabled, false)
    end

    test "no closed rows when every gated game is open" do
      Application.put_env(:afterlight, :snowboard_enabled, true)
      Application.put_env(:afterlight, :downhill_mayhem_enabled, true)

      assert [] = Availability.closed_activities(PlaceDefinitions.activities("theater"))
      assert [] = Availability.closed_activities([])
    after
      Application.put_env(:afterlight, :snowboard_enabled, false)
      Application.put_env(:afterlight, :downhill_mayhem_enabled, false)
    end
  end

  describe "registry consistency with the manifest projection" do
    test "every gated type is a real declared activity somewhere" do
      declared_types =
        for id <- PlaceDefinitions.ids(),
            act <- PlaceDefinitions.activities(id),
            do: act["type"]

      for type <- Availability.gated_types() do
        assert type in declared_types,
               "gated type #{inspect(type)} matches no declared activity — cabinet registry drift"
      end
    end
  end
end
