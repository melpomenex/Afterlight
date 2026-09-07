defmodule Afterlight.Specialty.TorrentRules do
  @moduledoc """
  Production torrent rule port used by the resolve proxy (parity-backed).

  `parse_magnet/1` semantics are pinned by
  `tests/fixtures/parity/torrent-model.json` via
  `Afterlight.Specialty.TorrentModel`.
  """

  @resolve_cooldown_ms 10_000
  @theater_wire_id "theater"

  @error_text %{
    "engine_unavailable" => "The projector\u2019s torrent engine is unavailable right now.",
    "invalid_magnet" => "That does not look like a magnet link (magnet:?xt=urn:btih:\u2026).",
    "resolve_timeout" => "The swarm never answered in time. Check the torrent has seeders and try again.",
    "resolve_failed" => "The torrent could not be resolved. It may have no seeders.",
    "resolve_in_flight" => "Hold on \u2014 one torrent is still being looked up.",
    "resolve_cooldown" => "Give the projector a breath \u2014 try that magnet again in a moment.",
    "wrong_room" => "You need to be inside The Orpheum to reach the torrent reel."
  }

  def resolve_cooldown_ms, do: @resolve_cooldown_ms
  def theater_wire_id, do: @theater_wire_id

  def parse_magnet(raw), do: Afterlight.Specialty.TorrentModel.parse_magnet(raw)

  def error_text(reason) when is_atom(reason), do: error_text(to_string(reason))

  def error_text(reason) when is_binary(reason) do
    Map.get(@error_text, reason, "The torrent reel jams; try that magnet again.")
  end
end
