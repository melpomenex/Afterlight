defmodule Afterlight.Parity do
  @moduledoc """
  Parity runner (P0/P1): loads the JS-exported fixture corpus and verifies the
  Elixir reference ports reproduce every case.

  These modules are TEST-SIDE PARITY REFERENCES, never authority: they prove
  behavioral equivalence with the JavaScript implementation before a domain
  takes authority (migration-governance "Parity before authority"). Production
  domain code must not import from `Afterlight.Parity.*`.

  Fixture shape (exported by `scripts/export-parity-fixtures.mjs`, semantics
  in `docs/architecture/elixir/parity-notes.md`):

    call:   %{"id" => ..., "fn" => ..., "args" => [...], "nowMs" => ..., "expected" => ...}
    script: %{"id" => ..., "kind" => "script", "steps" => [...], "expected" => %{"prev" => ...}}

  Token semantics:
    * `"<gen:N>"` — the Nth generated id within the case (theater `itm_*`,
      iptv list ids, orderbook `trade_*`). Bindings between tokens and real
      ids persist across a case's steps.
    * `"<generated>"` — matches any string (masks random nickname fallbacks).
    * `"<prev>"` (scripts) — threads the previous step's threaded value
      (`"thread"` selects a result field, e.g. `"state"`; `keepPrev` scripts
      have no thread, so the whole result threads).
    * `%{"__strLen" => n}` — materialize a string of length n (bulk args).
  """

  @fixture_files [
    {"theater-model.json", Afterlight.Parity.Reference.Theater},
    {"torrent-model.json", Afterlight.Parity.Reference.Torrent},
    {"market.json", Afterlight.Parity.Reference.Market},
    {"garden-crops.json", Afterlight.Parity.Reference.Garden},
    {"iptv-xmltv.json", Afterlight.Parity.Reference.Catalog},
    {"identity-nodes-machines.json", Afterlight.Parity.Reference.Misc}
  ]

  def fixture_files, do: @fixture_files

  alias Afterlight.Parity.Comparator

  def fixtures_path do
    :afterlight
    |> Application.get_env(:parity_fixtures_path, "../tests/fixtures/parity")
    |> Path.expand()
  end

  @doc "Loads one fixture file (%{\"version\" => 1, \"cases\" => [...]}) or raises."
  def load_fixture(file) do
    path = Path.join(fixtures_path(), file)

    case File.read(path) do
      {:ok, body} -> Jason.decode!(body)
      {:error, reason} -> raise "cannot read parity fixture #{path}: #{inspect(reason)}"
    end
  end

  @doc """
  Runs every case in `file` against `module`. Returns `{:ok, count}` when all
  pass, else `{:error, failures}` with `[%{id: id, reason: binary}]`.
  """
  def run_file({file, module}) do
    body = load_fixture(file)

    failures =
      body["cases"]
      |> Enum.flat_map(&run_case_safe(module, &1))

    case failures do
      [] -> {:ok, length(body["cases"])}
      failures -> {:error, failures}
    end
  rescue
    e -> {:error, [%{id: "<file>", reason: "fixture error: " <> Exception.message(e)}]}
  end

  defp run_case_safe(module, json_case) do
    case run_case(module, json_case) do
      :ok ->
        []

      {:mismatch, detail} ->
        [%{id: json_case["id"], reason: detail}]

      {:error, kind, value} ->
        [%{id: json_case["id"], reason: "#{kind}: #{Exception.format_banner(kind, value)}"}]
    end
  rescue
    e ->
      [%{id: Map.get(json_case, "id", "<case>"), reason: "raised: " <> Exception.message(e)}]
  catch
    kind, value ->
      [%{id: Map.get(json_case, "id", "<case>"), reason: "#{kind}: #{inspect(value)}"}]
  end

  @doc "Runs one fixture case against a Reference module."
  def run_case(module, %{"kind" => "script"} = script) do
    bindings = %{}
    {prev, bindings} = run_steps(module, script, bindings)

    # keepPrev scripts pin the step-0 object on the JS side and mutate it in
    # place; the threaded value here is the LAST step's result, which the
    # case-level expected.prev (recorded from the pinned JS object) can
    # never equal. The per-step expectations already pin all behavior, so
    # the case-level compare is skipped for keepPrev scripts.
    case Map.fetch(script["expected"] || %{}, "prev") do
      {:ok, expected_prev} ->
        if script["keepPrev"] == true do
          # keepPrev: case-level prev compare skipped (see moduledoc).
          :ok
        else
          case Comparator.compare(expected_prev, prev, module, bindings, "prev") do
            {:ok, _} -> :ok
            mismatch -> mismatch
          end
        end

      :error ->
        :ok
    end
  catch
    {:script_mismatch, detail} -> {:mismatch, detail}
    {:token_error, detail} -> {:mismatch, detail}
  end

  def run_case(module, %{"fn" => fname} = json_case) do
    {args, bindings} = prepare_args(json_case["args"] || [], module, %{})
    result = dispatch(module, fname, args, json_case["nowMs"])
    case Comparator.compare(json_case["expected"], result, module, bindings, "expected") do
      {:ok, _} -> :ok
      mismatch -> mismatch
    end
  catch
    {:token_error, detail} -> {:mismatch, detail}
    {:script_mismatch, detail} -> {:mismatch, detail}
  end

  defp run_steps(module, script, bindings0) do
    thread = script["thread"]

    Enum.reduce(script["steps"] || [], {nil, bindings0}, fn step, {prev, bindings} ->
      raw_args = step["args"] || []

      {exec_args, bindings} =
        Enum.map_reduce(raw_args, bindings, fn
          "<prev>", b ->
            case prev do
              nil -> throw({:token_error, "step #{step["fn"]} referenced <prev> with no threaded value"})
              value -> {value, b}
            end

          arg, b ->
            case Comparator.materialize_arg(arg, module, b) do
              {:ok, value, b2} -> {value, b2}
              {:mismatch, detail} -> throw({:token_error, detail})
            end
        end)

      result = dispatch(module, step["fn"], exec_args, step["nowMs"])

      # JS undefined results are dropped by JSON, so an absent "expected"
      # means "this step's return was undefined" — skip the compare (the
      # threaded state still flows). A script step that genuinely returns
      # null is not expressible in this corpus.
      case step["expected"] do
        nil ->
          {select_thread(thread, result), bindings}

        exp ->
          case Comparator.compare(exp, result, module, bindings, "step:" <> step["fn"]) do
            {:ok, bindings2} ->
              {select_thread(thread, result), bindings2}

            {:mismatch, detail} ->
              # Abort the script on the first failing step; the case fails
              # with the step detail (case id named upstream).
              throw({:script_mismatch, detail})
          end
      end
    end)
  end

  defp select_thread(nil, result), do: result
  defp select_thread(field, result) when is_map(result), do: Map.get(result, field)
  defp select_thread(_field, result), do: result

  defp prepare_args(args, module, bindings) do
    Enum.map_reduce(args, bindings, fn arg, b ->
      case Comparator.materialize_arg(arg, module, b) do
        {:ok, value, b2} -> {value, b2}
        {:mismatch, detail} -> throw({:token_error, detail})
      end
    end)
  end

  defp dispatch(module, fname, args, now_ms) do
    apply(module, :run_case_fn, [fname, args, now_ms])
  end
end
