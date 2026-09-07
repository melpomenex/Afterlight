defmodule Afterlight.Policy do
  @moduledoc """
  Shared Ash policy fragments for actor-scoped P6 resources.

  Authorization derives from the server-verified session actor only; client-
  supplied player ids are correlation data, never authorization (design D12).
  """

  @doc false
  def authenticated?(actor) do
    actor.role in [:session, :connecting]
  end
end
