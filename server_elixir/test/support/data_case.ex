defmodule Afterlight.DataCase do
  @moduledoc """
  SQL sandbox case for conferencing (and later) Ash/Postgres tests.
  Tagged `:database` and excluded from the default `mix test` run.
  """

  use ExUnit.CaseTemplate

  using do
    quote do
      alias Afterlight.Repo
      import Afterlight.DataCase
    end
  end

  setup tags do
    pid = Ecto.Adapters.SQL.Sandbox.start_owner!(Afterlight.Repo, shared: not tags[:async])
    on_exit(fn -> Ecto.Adapters.SQL.Sandbox.stop_owner(pid) end)
    :ok
  end
end
