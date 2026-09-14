defmodule Afterlight.Activities.Availability do
  @moduledoc """
  Canonical registry of admission-gated activity types — the arcade games
  whose sessions stay closed until an operator opts in through the runtime
  environment.

  This module is the single source of truth for three consumers that were
  previously wired by hand and drifted apart:

    - `Activities.start_session/6` admission checks (no per-game clauses in
      the activities context),
    - per-game "isn't open on this server" error naming in `GameChannel`
      (a closed Downhill Mayhem cabinet used to report itself as Summit Run),
    - the join-time `activity_availability` snapshot clients use to present
      closed cabinets as coming soon instead of advertising a cabinet the
      server is guaranteed to reject.

  Adding a gated game means adding one entry here (type, display title,
  enabled?/0 predicate). Nothing else changes: the manifest and projection
  stay static build data, and openness remains a server-authoritative
  runtime decision — the client snapshot is presentation, never permission.
  """

  alias Afterlight.Activities.{DownhillMayhem, Snowboard}

  @typedoc "A gated game descriptor: activity type, display title, enable predicate."
  @type entry :: %{type: String.t(), title: String.t(), enabled?: (-> boolean())}

  @gated [
    %{type: "snowboard-race", title: "Summit Run", enabled?: &Snowboard.enabled?/0},
    %{type: "downhill-mayhem", title: "Downhill Mayhem", enabled?: &DownhillMayhem.enabled?/0}
  ]

  @gated_by_type Map.new(@gated, &{&1.type, &1})

  @doc "All gated game descriptors, in registry order."
  @spec gated() :: [entry()]
  def gated, do: @gated

  @doc "The gated activity type strings."
  @spec gated_types() :: [String.t()]
  def gated_types, do: Enum.map(@gated, & &1.type)

  @doc """
  Admission check for one activity type: `:ok` when sessions may start,
  `{:error, :race_unavailable}` when the game is gated and closed.
  Ungated types are always `:ok`.
  """
  @spec check(String.t() | nil) :: :ok | {:error, :race_unavailable}
  def check(type) when is_binary(type) do
    case Map.get(@gated_by_type, type) do
      %{enabled?: enabled?} ->
        if enabled?.(), do: :ok, else: {:error, :race_unavailable}

      nil ->
        :ok
    end
  end

  def check(_other), do: :ok

  @doc "Display title for a gated type, or nil for ungated types."
  @spec title(String.t() | nil) :: String.t() | nil
  def title(type) when is_binary(type), do: @gated_by_type[type][:title]
  def title(_other), do: nil

  @doc """
  Closed-availability rows for one place's declared activities:
  `%{id, type, title}` per gated-and-closed activity. Open and ungated
  activities never appear — clients render those as playable.
  """
  @spec closed_activities([map()]) :: [map()]
  def closed_activities(activities) when is_list(activities) do
    for act <- activities,
        %{"id" => id, "type" => type} <- [act],
        is_binary(id),
        {:error, :race_unavailable} <- [check(type)] do
      %{"id" => id, "type" => type, "title" => act["title"] || title(type) || id}
    end
  end
end
