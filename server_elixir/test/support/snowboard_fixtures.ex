defmodule Afterlight.Test.SnowboardFixtures do
  @moduledoc """
  Loader for the frozen Summit Run contract fixtures (task 1.2 of
  `add-multiplayer-snowboard-arcade`).

  The files under `<repo>/tests/fixtures/snowboard/` are authored once and
  shared with the Node test suite; the Elixir backend lane must reproduce
  every behavior they describe. Fixtures are read from disk (not compiled in)
  so the two runtimes literally parse the same bytes.

  All later lanes depend on this contract: changing a fixture means changing
  the JS port, this loader's consumers, and the golden fixtures together.
  """

  @fixture_dir Path.expand("../../../tests/fixtures/snowboard", __DIR__)

  @doc "Absolute directory holding the shared fixtures."
  def fixture_dir, do: @fixture_dir

  @doc "Reads and parses one fixture file by relative name, e.g. \"contract.json\"."
  def load(name) do
    path = Path.join(@fixture_dir, name)

    case File.read(path) do
      {:ok, body} -> Jason.decode!(body)
      {:error, reason} -> raise "Cannot read snowboard fixture #{inspect(path)}: #{inspect(reason)}"
    end
  end

  @doc "The frozen contract constants (identity, timing, simulation, rates, ...)."
  def contract, do: load("contract.json")

  @doc "The canonical course document format contract."
  def course_format, do: load("course-format.json")

  @doc "Wire role normalization and lease alias rules."
  def role_normalization, do: load("role-normalization.json")

  @doc "All lifecycle scenarios from every lifecycle/*.json, flattened."
  def lifecycle_scenarios do
    for file <- lifecycle_files(), scenario <- load(Path.join("lifecycle", file))["scenarios"] do
      scenario
    end
  end

  @doc "One lifecycle scenario by id, raising when unknown."
  def lifecycle_scenario(id) do
    case Enum.find(lifecycle_scenarios(), &(&1["id"] == id)) do
      nil -> raise "Unknown snowboard lifecycle scenario #{inspect(id)}"
      scenario -> scenario
    end
  end

  @doc "All wire message fixtures from wire/*.json, keyed by file base name."
  def wire_fixtures do
    Map.new(wire_files(), fn file -> {Path.rootname(file), load(Path.join("wire", file))} end)
  end

  defp lifecycle_files, do: sorted_dir("lifecycle")
  defp wire_files, do: sorted_dir("wire")

  defp sorted_dir(subdir) do
    @fixture_dir
    |> Path.join(subdir)
    |> File.ls!()
    |> Enum.filter(&String.ends_with?(&1, ".json"))
    |> Enum.sort()
  end
end
