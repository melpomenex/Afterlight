defmodule Afterlight.Activities.ArcadeRun do
  @moduledoc """
  Terminal single-player arcade run record (task 3.9, design D8).

  One row per completed/aborted run, keyed by an idempotent `completion_key`
  derived server-side from {game, rules_version, session, match, player,
  outcome, ended_at}. `player_id` is the verified signed identity supplied by
  the session (design D3/D8) — never a client-submitted field.
  """

  use Ash.Resource,
    otp_app: :afterlight,
    domain: Afterlight.Activities.Domain,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer]

  postgres do
    table("activity_arcade_runs")
    repo(Afterlight.Repo)
  end

  attributes do
    attribute :completion_key, :string do
      primary_key?(true)
      allow_nil?(false)
      public?(true)
    end

    attribute :game, :string do
      allow_nil?(false)
      public?(true)
    end

    attribute :rules_version, :integer do
      allow_nil?(false)
      public?(true)
    end

    attribute :player_id, :string do
      allow_nil?(false)
      public?(true)
    end

    attribute :session_id, :string do
      allow_nil?(false)
      public?(true)
    end

    attribute :match_id, :string do
      allow_nil?(false)
      public?(true)
    end

    attribute :score, :integer do
      allow_nil?(false)
      public?(true)
    end

    attribute :outcome, :string do
      allow_nil?(false)
      public?(true)
    end

    attribute :stats, :map do
      allow_nil?(false)
      default(%{})
      public?(true)
    end

    attribute :ended_at, :integer do
      allow_nil?(false)
      public?(true)
    end

    attribute :recorded_at, :integer do
      allow_nil?(false)
      public?(true)
    end
  end

  identities do
    identity(:unique_completion, [:completion_key])
  end

  actions do
    defaults([:read])

    create :record do
      accept([
        :completion_key,
        :game,
        :rules_version,
        :player_id,
        :session_id,
        :match_id,
        :score,
        :outcome,
        :stats,
        :ended_at,
        :recorded_at
      ])

      upsert?(true)
      upsert_identity(:unique_completion)
      upsert_fields([:recorded_at])
    end
  end

  policies do
    bypass actor_attribute_equals(:role, :system) do
      authorize_if(always())
    end

    policy action_type(:read) do
      authorize_if(always())
    end

    policy action(:record) do
      # Only the server-side completion path (system actor) may write runs.
      authorize_if(actor_attribute_equals(:role, :system))
    end

    policy action_type(:create) do
      forbid_if(always())
    end
  end
end
