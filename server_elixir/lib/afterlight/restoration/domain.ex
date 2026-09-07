defmodule Afterlight.Restoration.Domain do
  @moduledoc "Ash domain for gather nodes, machines, and import snapshots."

  use Ash.Domain, otp_app: :afterlight

  resources do
    resource Afterlight.Restoration.GatherNode
    resource Afterlight.Restoration.Machine
    resource Afterlight.Restoration.MachineMaterial
    resource Afterlight.Restoration.MachineContribution
    resource Afterlight.Restoration.ImportSnapshot
  end
end
