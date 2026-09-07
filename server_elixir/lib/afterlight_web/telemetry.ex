defmodule AfterlightWeb.Telemetry do
  @moduledoc false
  # Deprecated: use Afterlight.Telemetry (P10). Kept so stale references compile.
  defdelegate metrics(), to: Afterlight.Telemetry
end
