defmodule Afterlight.Activities.ActivityMatch do
  @moduledoc """
  Terminal multiplayer activity match record (task 3.9, design D8; the Pong
  proof today, pool and later games after their phases).

  Aborts, forfeits and completed play are distinguished by `outcome` so
  leaderboards and stats can never fabricate played wins from walkovers.
  """

  use Ash.Resource,
    otp_app: :afterlight,
    domain: Afterlight.Activities.Domain,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer]

  postgres do
    table("activity_matches")
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

    attribute :session_id, :string do
      allow_nil?(false)
      public?(true)
    end

    attribute :match_id, :string do
      allow_nil?(false)
      public?(true)
    end

    attribute :outcome, :string do
      allow_nil?(false)
      public?(true)
    end

    attribute :winner_id, :string do
      allow_nil?(true)
      public?(true)
    end

    attribute :participants, :map do
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
        :session_id,
        :match_id,
        :outcome,
        :winner_id,
        :participants,
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
      # Only the server-side completion path (system actor) may write matches.
      authorize_if(actor_attribute_equals(:role, :system))
    end

    policy action_type(:create) do
      forbid_if(always())
    end
  end
end
