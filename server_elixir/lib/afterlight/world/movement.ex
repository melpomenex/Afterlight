defmodule Afterlight.World.Movement do
  @moduledoc """
  Pure movement validation (task 3.1) — fixture-testable, no process state.

  Semantics (Node baseline `server/world.js updateMovement` plus the P3
  deliberate tightening #1):

    * finite `x`/`z`/`rotY` — non-finite or absent values drop the whole
      update exactly as `Number.isFinite` does in Node;
    * THEN the pose is clamped into the walkable bounds
      `-11.3 < x < 11.3`, `-9.5 < z < 10.3` (deliberate tightening #1,
      protocol-catalog §6). Legitimate clients already enforce the same
      bounds client-side, so the clamp is invisible to them; modified
      clients can no longer stand outside the map. Out-of-bounds input is
      clamped, not rejected.
    * `walking`/`sitting`/`airborne` stay permissively relayed with
      JS-truthiness coercion (`!!`) — no seat-context or state-transition
      validation in this phase (explicitly deferred).
    * arrival time is stamped by the RoomServer on receipt for tick
      bookkeeping and telemetry; it is never added to the wire.
  """

  @x_min -11.3
  @x_max 11.3
  @z_min -9.5
  @z_max 10.3

  @type pose :: %{
          required(:x) => float | integer,
          required(:z) => float | integer,
          required(:rot_y) => float | integer,
          required(:walking) => boolean,
          required(:sitting) => boolean,
          required(:airborne) => boolean
        }

  @spec validate(term) :: {:ok, pose()} | :invalid
  def validate(payload)

  def validate(%{} = payload) do
    with {:ok, x} <- finite(payload["x"]),
         {:ok, z} <- finite(payload["z"]),
         {:ok, rot_y} <- finite(payload["rotY"]) do
      {:ok,
       %{
         x: clamp(x, @x_min, @x_max),
         z: clamp(z, @z_min, @z_max),
         rot_y: rot_y,
         walking: truthy(payload["walking"]),
         sitting: truthy(payload["sitting"]),
         airborne: truthy(payload["airborne"])
       }}
    else
      _non_finite -> :invalid
    end
  end

  def validate(_other), do: :invalid

  @doc "The walkable bounds (deliberate tightening #1), inclusive at the edges."
  @spec bounds :: %{x_min: float, x_max: float, z_min: float, z_max: float}
  def bounds, do: %{x_min: @x_min, x_max: @x_max, z_min: @z_min, z_max: @z_max}

  @doc "The clamp, exposed for tests and docs: bounds are inclusive."
  def clamp(value, min, max)
  def clamp(value, min, _max) when value < min, do: min
  def clamp(value, _min, max) when value > max, do: max
  def clamp(value, _min, _max), do: value

  @doc """
  Newest-pose-per-actor store (design D3b): a validated write overwrites
  the actor's previous pose in place, so between two flush ticks only the
  NEWEST pose per actor survives — intermediate positions never exist
  anywhere and room state stays O(actors) regardless of burst rate.
  """
  @spec coalesce(%{term => pose()}, term, pose()) :: %{term => pose()}
  def coalesce(poses, actor_id, pose) when is_map(poses), do: Map.put(poses, actor_id, pose)

  # JS Number.isFinite: numbers only — booleans, strings and null are not
  # finite. OTP 27 can also hold non-finite float TERMS (`:nan`, `:inf`,
  # `:neg_infinity`); reject those explicitly so the check stays exact
  # whatever the runtime produces.
  defp finite(value) when is_integer(value), do: {:ok, value}

  defp finite(value) when is_float(value) do
    if value == value and value != :inf and value != :neg_infinity do
      {:ok, value}
    else
      :error
    end
  end

  defp finite(_other), do: :error

  # JS-truthiness `!!` coercion for the relayed flags. JS falsy values
  # expressible as BEAM terms: null→nil, false, 0 (integer), 0.0/-0.0,
  # "" and NaN. Everything else — including empty lists/objects, which JS
  # keeps truthy — coerces to true.
  defp truthy(nil), do: false
  defp truthy(false), do: false
  defp truthy(:nan), do: false
  # A float NaN is the only value unequal to itself (OTP 28+ can hold
  # such terms; this runtime raises on the arithmetic that makes them).
  defp truthy(value) when is_float(value) and value != value, do: false
  defp truthy(value) when value == 0, do: false
  defp truthy(""), do: false
  defp truthy(_other), do: true
end
