defmodule Afterlight.Restoration.MachineContribution do
  @moduledoc "Audit row for a communal mill contribution."

  use Ash.Resource,
    otp_app: :afterlight,
    domain: Afterlight.Restoration.Domain,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer]

  postgres do
    table "machine_contributions"
    repo Afterlight.Repo
  end

  attributes do
    attribute :id, :integer do
      primary_key? true
      generated? true
      writable? false
      allow_nil? false
      public? true
    end

    attribute :machine_id, :string do
      allow_nil? false
      public? true
    end

    attribute :player_id, :string do
      allow_nil? false
      public? true
    end

    attribute :material, :string do
      allow_nil? false
      public? true
    end

    attribute :applied, :integer do
      allow_nil? false
      public? true
      constraints min: 1
    end

    attribute :inserted_at, :integer do
      allow_nil? false
      default 0
      public? true
    end
  end

  actions do
    defaults [:read]

    create :record do
      accept [:machine_id, :player_id, :material, :applied, :inserted_at]
    end
  end

  policies do
    bypass actor_attribute_equals(:role, :system) do
      authorize_if always()
    end

    policy action_type(:read) do
      authorize_if always()
    end

    # Communal restoration: any authenticated actor may contribute (D12).
    policy action(:record) do
      authorize_if expr(player_id == ^actor(:player_id))
    end
  end
end
