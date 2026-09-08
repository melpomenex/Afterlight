defmodule Afterlight.Media.HarnessTest do
  use Afterlight.DataCase, async: false

  @moduletag :database

  alias Afterlight.Media.Harness

  setup do
    on_exit(fn ->
      Application.put_env(
        :afterlight,
        :conferencing,
        Keyword.put(Application.get_env(:afterlight, :conferencing, []), :enabled, false)
      )
    end)

    cfg = Application.get_env(:afterlight, :conferencing, [])
    Application.put_env(:afterlight, :conferencing, Keyword.put(cfg, :enabled, true))
    :ok
  end

  test "Task 5.2 - 5.4: measurement harness evaluates standard soak and target metrics" do
    result = Harness.run_suite(:standard, iterations: 5)

    assert result.target_results.join_p95_pass == true
    assert result.target_results.join_p95_ms < 5000
    assert result.target_results.recovery_pass == true
    assert result.target_results.recovery_ms < 10000

    assert result.final_metrics.worker_memory_bytes > 0
    assert result.final_metrics.encoder_pressure > 0
  end

  test "Task 5.3: runs TURN-only variant and evaluates targets" do
    result = Harness.run_suite(:turn_only, iterations: 5)

    assert result.target_results.join_p95_pass == true
    assert result.target_results.recovery_pass == true
  end

  test "Task 5.3: runs degraded network variant (100 ms RTT / 2% packet loss)" do
    result = Harness.run_suite(:degraded_network, iterations: 5)

    assert result.target_results.join_p95_pass == true
    assert result.target_results.recovery_pass == true
  end
end
