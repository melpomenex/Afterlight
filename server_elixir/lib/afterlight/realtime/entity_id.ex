defmodule Afterlight.Realtime.EntityId do
  @moduledoc """
  Stable string player/guest id → u32 entity id for the binary data plane.
  Matches `shared/realtime/entityId.js` (FNV-1a).
  """

  import Bitwise

  @fnv_offset 0x811C9DC5
  @fnv_prime 0x01000193

  @spec hash(term) :: non_neg_integer()
  def hash(player_id) when is_binary(player_id) and player_id != "" do
    player_id
    |> :binary.bin_to_list()
    |> Enum.reduce(@fnv_offset, fn byte, acc ->
      acc = bxor(acc, byte)
      band(acc * @fnv_prime, 0xFFFFFFFF)
    end)
  end

  def hash(_), do: 0
end
