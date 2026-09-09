defmodule Afterlight.Activities.WinnerStays do
  @moduledoc """
  Pure winner-stays / FIFO rotation for pool, air hockey, and foosball.
  Ties, aborts, and both-player departure invent no winner. A series winner
  keeps a slot only when still present and willing.
  """

  @table_types ~w(pool air-hockey foosball)
  @no_winner_reasons ~w(aborted tie draw both_left)

  @spec table_game?(term) :: boolean
  def table_game?(type) when type in @table_types, do: true
  def table_game?(_), do: false

  @spec winner_id(map() | nil) :: String.t() | nil
  def winner_id(outcome) when is_map(outcome) do
    reason = to_string(Map.get(outcome, "reason") || Map.get(outcome, :reason) || "")
    winner = Map.get(outcome, "winner") || Map.get(outcome, :winner)

    cond do
      reason in @no_winner_reasons -> nil
      is_binary(winner) and winner != "" -> winner
      true -> nil
    end
  end

  def winner_id(_), do: nil

  @doc """
  Plan which seated slots to keep or vacate after a series ends.

  Options:
    * `:winner_stays?` opt-in flag configured before the series
    * `:winner_present?` / `:winner_willing?`
    * `:queue_length`
  """
  def plan(outcome, seated_slots, opts \\ []) do
    stays? = Keyword.get(opts, :winner_stays?, false)
    present? = Keyword.get(opts, :winner_present?, false)
    willing? = Keyword.get(opts, :winner_willing?, false)
    queue_len = Keyword.get(opts, :queue_length, 0)
    winner = winner_id(outcome)

    slots =
      seated_slots
      |> Enum.map(fn
        {slot, player} when is_map(player) -> {slot, player[:player_id] || player["playerId"]}
        {slot, id} -> {slot, id}
      end)

    cond do
      is_nil(winner) or not stays? or not present? or not willing? ->
        %{
          invent_winner?: false,
          keep_slots: [],
          vacate_slots: Enum.map(slots, &elem(&1, 0)),
          offer_both?: true,
          waiting?: queue_len == 0
        }

      true ->
        keep =
          slots
          |> Enum.filter(fn {_slot, id} -> id == winner end)
          |> Enum.map(&elem(&1, 0))

        vacate =
          slots
          |> Enum.reject(fn {slot, _} -> slot in keep end)
          |> Enum.map(&elem(&1, 0))

        %{
          invent_winner?: false,
          keep_slots: keep,
          vacate_slots: vacate,
          offer_both?: keep == [],
          waiting?: vacate != [] and queue_len == 0
        }
    end
  end

  @doc "Bounded public counts. Categories stay separate; they are never summed."
  def public_summary(state) when is_map(state) do
    players = Map.get(state, :players) || %{}
    spectators = Map.get(state, :spectators) || %{}
    queue = Map.get(state, :queue) || []
    defn = Map.get(state, :activity_def) || %{}

    %{
      "id" => Map.get(state, :activity_id),
      "type" => Map.get(defn, "type"),
      "playing" => map_size(players),
      "watching" => map_size(spectators),
      "queued" => length(queue),
      "status" => to_string(Map.get(state, :status)),
      "observedAt" => System.system_time(:millisecond)
    }
  end

  def queue_with_positions(queue) when is_list(queue) do
    queue
    |> Enum.with_index(1)
    |> Enum.map(fn {entry, pos} ->
      id = if is_map(entry), do: entry[:player_id] || entry["playerId"], else: entry
      %{"playerId" => id, "position" => pos}
    end)
  end

  def next_player(offers, queue) do
    offer =
      cond do
        is_map(offers) and map_size(offers) > 0 ->
          offers |> Map.values() |> List.first()

        is_list(offers) and offers != [] ->
          hd(offers)

        true ->
          nil
      end

    cond do
      is_map(offer) -> offer[:player_id] || offer["playerId"]
      queue != [] ->
        q = hd(queue)
        if is_map(q), do: q[:player_id] || q["playerId"], else: q

      true ->
        nil
    end
  end
end
