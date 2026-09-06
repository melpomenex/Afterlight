defmodule Afterlight.Repo do
  # AshPostgres repo, modeled on the serviceradar_core repo shape.
  # No resources exist yet (P1); the durable model arrives with P4–P6.
  use AshPostgres.Repo, otp_app: :afterlight

  def installed_extensions do
    ["uuid-ossp", "citext", "ash-functions"]
  end

  def min_pg_version do
    %Version{major: 15, minor: 0, patch: 0}
  end
end
