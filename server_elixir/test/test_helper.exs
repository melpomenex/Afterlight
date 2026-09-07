ExUnit.start(exclude: [:integration, :database])

# P4 accounts + P8 conferencing tests use the SQL sandbox. Parity stays
# DB-free aside from Repo connecting at application start. Run
# `MIX_ENV=test mix ecto.migrate` once against afterlight_test before the
# database suites.
Ecto.Adapters.SQL.Sandbox.mode(Afterlight.Repo, :manual)
