defmodule Afterlight.World.Emotes do
  @moduledoc """
  Emote allow-list (task 4.1) — the exact six ids of `shared/emotes.js`
  (`EMOTES`). Parity is pinned by the `world.json` fixture corpus
  (`isEmote` table) and the ids are re-checked against the JS module by
  `tests/parity-fixtures.test.js`'s determinism gate.

  The 500 ms per-session cooldown lives in the RoomServer (keyed to the
  transport connection ref, not the roster entry — a reconnect may emote
  immediately, matching Node's session-held `lastEmoteAt`).
  """

  @ids ~w(wave dance cheer heart bow shrug)

  @spec ids() :: [String.t(), ...]
  def ids, do: @ids

  @spec valid?(term) :: boolean
  def valid?(id) when id in @ids, do: true
  def valid?(_other), do: false

  @doc "The cooldown window in ms, mirroring `server/index.js` (< 500)."
  @spec cooldown_ms() :: 500
  def cooldown_ms, do: 500
end
