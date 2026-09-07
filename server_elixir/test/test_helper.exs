ExUnit.start(exclude: :integration)

# P4 accounts tests use the SQL sandbox. Parity stays DB-free aside from
# Repo connecting at application start.
Ecto.Adapters.SQL.Sandbox.mode(Afterlight.Repo, :manual)
