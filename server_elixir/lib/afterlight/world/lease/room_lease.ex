defmodule Afterlight.World.Lease.RoomLease do
  @moduledoc false
  use Ecto.Schema

  @primary_key {:room_key, :string, autogenerate: false}
  schema "room_leases" do
    field :region, :string, default: "default"
    field :district_id, :string
    field :instance_id, :string
    field :owner_node, :string
    field :epoch, :integer
    field :expires_at, :utc_datetime_usec
    field :renewed_at, :utc_datetime_usec

    timestamps(type: :utc_datetime_usec)
  end
end
