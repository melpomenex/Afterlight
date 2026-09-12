defmodule Afterlight.Parity.Reference.World do
  @moduledoc """
  Parity reference for `shared/worldModel.js` (movement sanitation) and
  `shared/emotes.js` (allow-list) — fixture file `world.json`.
  TEST-SIDE PARITY REFERENCE — never authority.

  ## JS-fidelity decisions

  * **`sanitizeMovement` is the Node baseline and has NO clamp.** The P3
    production runtime (`Afterlight.World.Movement`) adds the documented
    deliberate tightening #1 (bounds clamp) ON TOP of these semantics —
    the clamp is spec-tested in `Afterlight.World.MovementTest`, not
    reproduced here. This reference mirrors `server/world.js
    updateMovement` exactly: `Number.isFinite` over `x`/`z`/`rotY`
    (JSON `NaN`/`Infinity` record as `null`, which is not a number →
    `null` result), `!!` flag coercion (undefined flags are dropped by
    JSON and coerce false), non-object pose → `null`.
  * **`isEmote` is exact string equality** against the six shared ids —
    `"WAVE"` (case), `3` (number), `""` and missing args all fail.
  * **`EMOTES`/`EMOTE_DURATION` are verbatim tables** from
    `shared/emotes.js`; `tests/parity-fixtures.test.js` re-exports the
    corpus from the real JS module, so drift fails the determinism gate.
  * **`joinRosterEntry`/`flushEntry` are literal ports of the presence
    payload builders in `server/world.js`** (`joinRoom`'s
    `existingPlayers.push` and `tickMovementBroadcast`'s `updates.push`).
    They pin the wire-observed shape asymmetry: the join-roster entry
    carries `nickname` and no `airborne`; the flush entry carries
    `airborne` and no `nickname`. `walking` is relayed RAW in both Node
    builders (only `sitting`/`airborne` get `!!` — sessions always hold
    sanitized booleans, but the ports mirror the code, not the intent).
    `Afterlight.World.Frames` renders these exact field sets; the
    field-for-field pin lives in `test/parity/world_frames_test.exs`.
  """

  @behaviour Afterlight.Parity.Reference

  @emotes [
    %{"id" => "wave", "label" => "Hello there", "icon" => "👋", "hint" => "A little warmth goes a long way"},
    %{"id" => "dance", "label" => "Rust shuffle", "icon" => "♫", "hint" => "Still got some rhythm in these gears"},
    %{"id" => "cheer", "label" => "We did it!", "icon" => "✦", "hint" => "Small repairs. Big celebrations."},
    %{"id" => "heart", "label" => "Much love", "icon" => "♡", "hint" => "For your favorite fellow wanderer"},
    %{"id" => "bow", "label" => "After you", "icon" => "❧", "hint" => "A gracious little thank-you"},
    %{"id" => "shrug", "label" => "Who knows?", "icon" => "¯\\_(ツ)_/¯", "hint" => "Some mysteries can wait"}
  ]

  @emote_ids Enum.map(@emotes, & &1["id"])

  @impl true
  def run_case_fn("sanitizeMovement", [pose], _now_ms), do: sanitize_movement(pose)

  def run_case_fn("isEmote", [id], _now_ms), do: id in @emote_ids

  def run_case_fn("emotesTable", [], _now_ms), do: @emotes
  def run_case_fn("emoteDuration", [], _now_ms), do: 3.2

  def run_case_fn("joinRosterEntry", [session], _now_ms), do: join_roster_entry(session)
  def run_case_fn("flushEntry", [session], _now_ms), do: flush_entry(session)

  def run_case_fn(_other, _args, _now_ms), do: nil

  # server/world.js joinRoom — the roster sent to the JOINER carries the
  # nickname and no airborne flag.
  defp join_roster_entry(%{"player" => player} = session) do
    %{
      "id" => player["id"],
      "nickname" => player["nickname"],
      "x" => session["x"],
      "z" => session["z"],
      "rotY" => session["rotY"],
      "walking" => session["walking"],
      "sitting" => truthy(session["sitting"])
    }
  end

  # server/world.js tickMovementBroadcast — the 10 Hz flush entry carries
  # airborne and no nickname.
  defp flush_entry(%{"player" => player} = session) do
    %{
      "id" => player["id"],
      "x" => session["x"],
      "z" => session["z"],
      "rotY" => session["rotY"],
      "walking" => session["walking"],
      "sitting" => truthy(session["sitting"]),
      "airborne" => truthy(session["airborne"])
    }
  end

  # JS: `!pose || typeof pose !== 'object'` → null; non-finite x/z/rotY →
  # null; otherwise the pose with `!!`-coerced flags.
  defp sanitize_movement(pose) when is_map(pose) do
    with {:ok, x} <- finite(pose["x"]),
         {:ok, z} <- finite(pose["z"]),
         {:ok, rot_y} <- finite(pose["rotY"]) do
      %{
        "x" => x,
        "z" => z,
        "rotY" => rot_y,
        "walking" => truthy(pose["walking"]),
        "sitting" => truthy(pose["sitting"]),
        "airborne" => truthy(pose["airborne"])
      }
    else
      _non_finite -> nil
    end
  end

  defp sanitize_movement(_other), do: nil

  # JS Number.isFinite: numbers only.
  defp finite(value) when is_integer(value) or is_float(value), do: {:ok, value}
  defp finite(_other), do: :error

  # JS-truthiness `!!`.
  defp truthy(nil), do: false
  defp truthy(false), do: false
  defp truthy(0), do: false
  defp truthy(""), do: false
  defp truthy(_other), do: true
end
