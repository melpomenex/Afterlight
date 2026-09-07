defmodule Afterlight.Conferencing.Error.CapacityExceeded do
  @moduledoc false
  use Splode.Error, fields: [:max_participants], class: :invalid

  def message(%{max_participants: n}) do
    "call is at capacity (max #{n} participants)"
  end
end

defmodule Afterlight.Conferencing.Error.NotMember do
  @moduledoc false
  use Splode.Error, fields: [:call_id], class: :forbidden

  def message(_), do: "not a member of this call"
end

defmodule Afterlight.Conferencing.Error.CallClosed do
  @moduledoc false
  use Splode.Error, fields: [:call_id], class: :invalid

  def message(_), do: "call is not active"
end

defmodule Afterlight.Conferencing.Error.NoWorker do
  @moduledoc false
  use Splode.Error, fields: [:call_id], class: :invalid

  def message(_), do: "call has no allocated media worker"
end

defmodule Afterlight.Conferencing.Error.Removed do
  @moduledoc false
  use Splode.Error, fields: [:call_id], class: :forbidden

  def message(_), do: "removed from this call"
end
