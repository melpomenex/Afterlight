defmodule Afterlight.World.Gate do
  @moduledoc """
  P10 measured gate: refuse boot when multi-node room owners are enabled
  without a recorded evidence artifact (design measured precondition).
  """

  alias Afterlight.World

  @doc "Called at application start."
  @spec verify!() :: :ok
  def verify! do
    enabled = World.config(:multi_node_enabled, false)
    evidence = World.config(:multi_node_evidence_ref)

    cond do
      not enabled ->
        :ok

      is_binary(evidence) and not is_nil(evidence_path(evidence)) ->
        :ok

      true ->
        raise """
        AFTERLIGHT_MULTI_NODE_ROOMS is enabled but no P10 evidence artifact is recorded.
        Set AFTERLIGHT_MULTI_NODE_EVIDENCE to a repo-relative path (e.g. docs/benchmarks/p10-multi-node-gate.md)
        with an explicit justify decision before running a second room node.
        """
    end
  end

  defp evidence_path(ref) do
    roots = [
      File.cwd!(),
      Path.expand("..", File.cwd!()),
      Path.expand("../../../..", __DIR__)
    ]

    Enum.find_value(roots, fn root ->
      path = Path.join(root, ref)
      if File.exists?(path), do: path
    end)
  end
end
