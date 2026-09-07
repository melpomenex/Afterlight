defmodule Afterlight.World.RoomKey do
  @moduledoc """
  Canonical `{region, district_id, instance_id}` encoding for `room_leases`.

  Wire room ids map through `Afterlight.World.Rooms`; region defaults to
  `"default"` until multi-region affinity lands.
  """

  alias Afterlight.World.Rooms

  @default_region "default"

  @type t :: %{
          required(:region) => String.t(),
          required(:district_id) => String.t(),
          required(:instance_id) => String.t(),
          required(:room_key) => String.t()
        }

  @doc "Build a lease key from a resolved room map."
  @spec from_room(map()) :: t()
  def from_room(%{district: district, instance: instance}) do
    from_parts(@default_region, district, instance)
  end

  @doc "Build a lease key from wire id."
  @spec from_wire(String.t()) :: {:ok, t()} | :error
  def from_wire(wire_id) do
    case Rooms.resolve(wire_id) do
      {:ok, room} -> {:ok, from_room(room)}
      :error -> :error
    end
  end

  @doc "Build a lease key from explicit parts."
  @spec from_parts(String.t(), String.t(), String.t()) :: t()
  def from_parts(region, district_id, instance_id) do
    room_key = "#{region}:#{district_id}:#{instance_id}"

    %{
      region: region,
      district_id: district_id,
      instance_id: instance_id,
      room_key: room_key
    }
  end
end
