ExUnit.start(exclude: :integration)

# P4 accounts tests use the SQL sandbox. Parity stays DB-free aside from
# Repo connecting at application start. Run `MIX_ENV=test mix ecto.migrate`
# once against afterlight_test before the accounts suite.
Ecto.Adapters.SQL.Sandbox.mode(Afterlight.Repo, :manual)
