defmodule Afterlight.Economy.Contract do
  @moduledoc "Live contract board slot (0–2)."

  use Ash.Resource,
    otp_app: :afterlight,
    domain: Afterlight.Economy.Domain,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer]

  postgres do
    table "contracts"
    repo Afterlight.Repo
  end

  attributes do
    attribute :id, :string do
      primary_key? true
      allow_nil? false
      public? true
    end

    attribute :slot, :integer do
      allow_nil? false
      public? true
      constraints min: 0, max: 2
    end

    attribute :client, :string do
      allow_nil? false
      public? true
    end

    attribute :crop_id, :string do
      allow_nil? false
      public? true
    end

    attribute :crop_name, :string do
      allow_nil? false
      public? true
    end

    attribute :quantity, :integer do
      allow_nil? false
      public? true
    end

    attribute :min_quality, :string do
      allow_nil? false
      public? true
    end

    attribute :reward, :integer do
      allow_nil? false
      public? true
    end

    attribute :reputation, :integer do
      allow_nil? false
      public? true
    end

    attribute :xp, :integer do
      allow_nil? false
      public? true
    end

    attribute :tier, :string do
      allow_nil? true
      public? true
    end

    attribute :expires_at, :integer do
      allow_nil? false
      public? true
    end

    attribute :generated_at, :integer do
      allow_nil? false
      public? true
    end
  end

  identities do
    identity :unique_slot, [:slot]
  end

  preparations do
    prepare build(sort: [slot: :asc])
  end

  actions do
    defaults [:read]

    create :upsert do
      accept [
        :id,
        :slot,
        :client,
        :crop_id,
        :crop_name,
        :quantity,
        :min_quality,
        :reward,
        :reputation,
        :xp,
        :tier,
        :expires_at,
        :generated_at
      ]

      upsert? true
      upsert_identity :unique_slot
      upsert_fields [
        :id,
        :client,
        :crop_id,
        :crop_name,
        :quantity,
        :min_quality,
        :reward,
        :reputation,
        :xp,
        :tier,
        :expires_at,
        :generated_at
      ]
    end
  end

  policies do
    bypass actor_attribute_equals(:role, :system) do
      authorize_if always()
    end

    policy action_type(:read) do
      authorize_if always()
    end

    policy action(:upsert) do
      authorize_if actor_attribute_equals(:role, :system)
    end
  end
end
