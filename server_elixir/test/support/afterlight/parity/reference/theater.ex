defmodule Afterlight.Parity.Reference.Theater do
  @moduledoc """
  Parity reference for shared/theaterModel.js.

  Delegates directly to the production `Afterlight.Theater.Reducer` module.
  Semantics are pinned by tests/fixtures/parity/theater-model.json.
  """

  @behaviour Afterlight.Parity.Reference

  alias Afterlight.Theater.Reducer

  # -- dispatch ---------------------------------------------------------------

  def run_case_fn("classifySource", [url], _now), do: Reducer.classify_source(url)

  def run_case_fn("applyTheaterAction", [state, action], now_ms),
    do: Reducer.apply_action(state, action, nil, now_ms)

  def run_case_fn("applyTheaterAction", [state, action, actor], now_ms),
    do: Reducer.apply_action(state, action, actor, now_ms)

  def run_case_fn("effectivePositionSec", [state, now_ms], _now),
    do: Reducer.effective_position_sec(state, now_ms)

  def run_case_fn("parseM3U", [text], _now), do: Reducer.parse_m3u(text)

  def run_case_fn("normalizeTheaterState", [raw], now_ms),
    do: Reducer.normalize_state(raw, now_ms)

  def run_case_fn("createTheaterState", [], _now), do: Reducer.create_state()

  def run_case_fn("newItemId", [now_ms], _now), do: Reducer.new_item_id(now_ms)
  def run_case_fn("newItemId", [], now_ms), do: Reducer.new_item_id(now_ms)

  # -- public delegates -------------------------------------------------------

  defdelegate classify_source(raw_url), to: Reducer
  defdelegate classify_internal(raw_url), to: Reducer
  defdelegate apply_action(prev, action, actor, now_ms), to: Reducer
  defdelegate effective_position_sec(now, now_ms), to: Reducer
  defdelegate normalize_state(raw, now_ms), to: Reducer
  defdelegate new_item_id(now_ms), to: Reducer
  defdelegate new_item_id(now_ms, seq), to: Reducer
  defdelegate parse_m3u(text), to: Reducer
  defdelegate create_state, to: Reducer
end
