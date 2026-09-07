defmodule Afterlight.DataCase do
  @moduledoc """
  SQL sandbox case for Ash/Postgres integration tests (accounts, conferencing).
  """

  use ExUnit.CaseTemplate

  using do
    quote do
      alias Afterlight.Repo
      import Ecto
      import Ecto.Query
      import Afterlight.DataCase
    end
  end

  setup tags do
    pid = Ecto.Adapters.SQL.Sandbox.start_owner!(Afterlight.Repo, shared: not tags[:async])
    on_exit(fn -> Ecto.Adapters.SQL.Sandbox.stop_owner(pid) end)
    :ok
  end
end
