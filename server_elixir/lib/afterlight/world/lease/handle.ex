defmodule Afterlight.World.Lease.Handle do
  @moduledoc """
  In-process lease handle held by a room owner process.
  """
  defstruct [:room_key, :owner_node, :epoch, fenced: false]

  @type t :: %__MODULE__{
          room_key: String.t(),
          owner_node: String.t(),
          epoch: non_neg_integer(),
          fenced: boolean()
        }
end
