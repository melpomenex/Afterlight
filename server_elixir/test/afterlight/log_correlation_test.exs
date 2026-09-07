defmodule Afterlight.LogCorrelationTest do
  use ExUnit.Case, async: true

  alias Afterlight.LogCorrelation
  alias Afterlight.LogFormatter

  test "put_context sets Logger metadata for correlation fields" do
    LogCorrelation.put_context(%{request_id: "req-42", room: "theater", revision: 7, epoch: 1})

    assert Logger.metadata()[:request_id] == "req-42"
    assert Logger.metadata()[:room] == "theater"
    assert Logger.metadata()[:revision] == 7
    assert Logger.metadata()[:epoch] == 1
  end

  test "formatter renders correlation metadata on log lines" do
    line =
      LogFormatter.format(
        :info,
        "joined room",
        {{2026, 9, 7}, {12, 0, 0, 0}},
        request_id: "req-42",
        room: "theater",
        revision: 7,
        epoch: 1
      )

    assert line =~ "request_id=\"req-42\""
    assert line =~ "room=\"theater\""
    assert line =~ "revision=7"
    assert line =~ "epoch=1"
  end

  test "with_context restores prior metadata" do
    Logger.metadata(request_id: "outer")

    LogCorrelation.with_context(%{request_id: "inner", room: "market"}, fn ->
      assert Logger.metadata()[:request_id] == "inner"
      assert Logger.metadata()[:room] == "market"
    end)

    assert Logger.metadata()[:request_id] == "outer"
    refute Logger.metadata()[:room]
  end
end
