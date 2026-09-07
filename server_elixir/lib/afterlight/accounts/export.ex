defmodule Afterlight.Accounts.Export do
  @moduledoc false

  alias Afterlight.Accounts.{Actor, Normalize, Player}

  def default_game_state_path do
    Path.expand(Path.join([File.cwd!(), "..", "data", "game-state.json"]))
  end

  def players_map do
    Player
    |> Ash.read!(actor: Actor.system(), authorize?: false)
    |> Map.new(fn player -> {player.id, Normalize.to_legacy_player(player)} end)
  end

  def write!(dest, opts \\ []) do
    unless Keyword.get(opts, :freeze_ack) == true do
      raise ArgumentError, "export_players requires freeze_ack: true (P6 rehearsal freeze)"
    end

    dest = Path.expand(dest)
    payload = %{
      "version" => 1,
      "exportedAt" => System.system_time(:millisecond),
      "players" => players_map()
    }

    File.mkdir_p!(Path.dirname(dest))
    File.write!(dest, Jason.encode!(payload, pretty: true) <> "\n")
    dest
  end
end
