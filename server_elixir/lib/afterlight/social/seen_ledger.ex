defmodule Afterlight.Social.SeenLedger do
  @moduledoc """
  Bounded, FIFO/LRU seen-key ledger for origin-scoped echo suppression.

  Prevents reflection loops (game→IRC→game and IRC→game→IRC) across the
  bridge adapter boundary. Keys are `{origin, id}` tuples where origin is
  `:game` or `:irc` (or `"game"` / `"irc"`).
  """

  @default_cap 1000

  defstruct [
    cap: @default_cap,
    set: MapSet.new(),
    queue: :queue.new()
  ]

  @doc "Creates a new seen-key ledger with the specified maximum capacity (default 1000)."
  def new(cap \\ @default_cap) when is_integer(cap) and cap > 0 do
    %__MODULE__{cap: cap}
  end

  @doc "Returns true if the key is already in the ledger."
  def seen?(%__MODULE__{set: set}, key) do
    MapSet.member?(set, normalize_key(key))
  end

  @doc """
  Records a key in the ledger.
  If already seen, returns `{:seen, ledger}`.
  If unseen, returns `{:new, updated_ledger}` with capacity bounds enforced.
  """
  def record(%__MODULE__{cap: cap, set: set, queue: q} = ledger, key) do
    norm_key = normalize_key(key)

    if MapSet.member?(set, norm_key) do
      {:seen, ledger}
    else
      set = MapSet.put(set, norm_key)
      q = :queue.in(norm_key, q)

      {set, q} =
        if MapSet.size(set) > cap do
          {{:value, oldest}, q_trimmed} = :queue.out(q)
          {MapSet.delete(set, oldest), q_trimmed}
        else
          {set, q}
        end

      {:new, %{ledger | set: set, queue: q}}
    end
  end

  @doc "Returns the number of entries currently retained."
  def size(%__MODULE__{set: set}), do: MapSet.size(set)

  @doc "Returns the maximum capacity."
  def cap(%__MODULE__{cap: cap}), do: cap

  defp normalize_key({origin, id}) do
    {to_origin_atom(origin), to_string(id)}
  end

  defp normalize_key(other), do: other

  defp to_origin_atom(:game), do: :game
  defp to_origin_atom("game"), do: :game
  defp to_origin_atom(:irc), do: :irc
  defp to_origin_atom("irc"), do: :irc
  defp to_origin_atom(other), do: other
end
