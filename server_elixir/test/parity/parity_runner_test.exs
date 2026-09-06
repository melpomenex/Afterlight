defmodule ParityRunnerTest do
  @moduledoc """
  The parity gate: every fixture file must reproduce against its reference
  module. Failure output names the fixture file and case id (P0 task 5.1).
  Runs DB-free and needs no Node runtime (P1 task 5.3).
  """

  use ExUnit.Case, async: false

  # Long-running corpus; skip nothing by default.
  @tag timeout: 120_000

  for {fixture_file, module} <- Afterlight.Parity.fixture_files() do
    test "parity: #{fixture_file}" do
      file = unquote(fixture_file)
      module = unquote(module)

      case Afterlight.Parity.run_file({file, module}) do
        {:ok, count} ->
          assert count > 0, "#{file}: no cases ran"

        {:error, failures} ->
          details =
            failures
            |> Enum.take(25)
            |> Enum.map_join("\n", fn f -> "  - #{f.id}: #{f.reason}" end)

          more =
            if length(failures) > 25 do
              "\n  ... and #{length(failures) - 25} more"
            else
              ""
            end

          flunk("#{file}: #{length(failures)} failing case(s)\n#{details}#{more}")
      end
    end
  end

  test "parity: manifest covers every fixture file" do
    manifest = Afterlight.Parity.load_fixture("manifest.json")
    files = Enum.map(manifest["files"], & &1["file"])
    expected = Enum.map(Afterlight.Parity.fixture_files(), fn {f, _} -> f end)
    assert Enum.sort(files) == Enum.sort(expected)
  end
end
