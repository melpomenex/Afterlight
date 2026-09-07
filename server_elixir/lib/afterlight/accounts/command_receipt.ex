defmodule Afterlight.Accounts.CommandReceipt do
  @moduledoc """
  Durable command receipt keyed by `(actor, request_id)`. Shared P5/P6 infra.
  """

  use Ash.Resource,
    otp_app: :afterlight,
    domain: Afterlight.Accounts,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer]

  postgres do
    table "command_receipts"
    repo Afterlight.Repo
  end

  attributes do
    attribute :actor, :string do
      primary_key? true
      allow_nil? false
      public? true
    end

    attribute :request_id, :string do
      primary_key? true
      allow_nil? false
      public? true
    end

    attribute :payload_hash, :string do
      allow_nil? false
      public? true
    end

    attribute :outcome, :map do
      allow_nil? false
      public? true
    end

    attribute :created_at, :integer do
      allow_nil? false
      public? true
    end
  end

  actions do
    defaults [:read]

    create :record do
      accept [:actor, :request_id, :payload_hash, :outcome, :created_at]
    end
  end

  policies do
    bypass actor_attribute_equals(:role, :system) do
      authorize_if always()
    end

    policy action_type(:read) do
      authorize_if expr(actor == ^actor(:player_id))
    end

    policy action(:record) do
      authorize_if expr(actor == ^actor(:player_id))
    end
  end
end
