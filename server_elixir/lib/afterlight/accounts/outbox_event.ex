defmodule Afterlight.Accounts.OutboxEvent do
  @moduledoc """
  Transactional outbox. Published at-least-once; consumers dedupe by id/revision.
  """

  use Ash.Resource,
    otp_app: :afterlight,
    domain: Afterlight.Accounts,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer]

  postgres do
    table "outbox_events"
    repo Afterlight.Repo

    custom_indexes do
      index [:id], name: "outbox_events_unpublished_idx", where: "published_at IS NULL"
    end
  end

  attributes do
    attribute :id, :integer do
      primary_key? true
      generated? true
      writable? false
      allow_nil? false
      public? true
    end

    attribute :aggregate, :string do
      allow_nil? false
      public? true
    end

    attribute :aggregate_id, :string do
      allow_nil? false
      public? true
    end

    attribute :revision, :integer do
      allow_nil? false
      public? true
    end

    attribute :event_type, :string do
      allow_nil? false
      public? true
    end

    attribute :payload, :map do
      allow_nil? false
      public? true
    end

    attribute :created_at, :integer do
      allow_nil? false
      public? true
    end

    attribute :published_at, :integer do
      allow_nil? true
      public? true
    end
  end

  actions do
    defaults [:read]

    create :enqueue do
      accept [:aggregate, :aggregate_id, :revision, :event_type, :payload, :created_at]
    end

    update :mark_published do
      accept [:published_at]
      require_atomic? false
    end
  end

  policies do
    bypass actor_attribute_equals(:role, :system) do
      authorize_if always()
    end

    policy action_type(:read) do
      authorize_if expr(aggregate_id == ^actor(:player_id))
    end

    policy action(:enqueue) do
      authorize_if expr(aggregate_id == ^actor(:player_id))
    end

    policy action(:mark_published) do
      authorize_if actor_attribute_equals(:role, :system)
    end
  end
end
