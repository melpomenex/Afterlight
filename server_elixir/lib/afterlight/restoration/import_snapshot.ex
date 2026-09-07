defmodule Afterlight.Restoration.ImportSnapshot do
  @moduledoc "Recorded economy-group import snapshot hash (cutover ceremony)."

  use Ash.Resource,
    otp_app: :afterlight,
    domain: Afterlight.Restoration.Domain,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer]

  postgres do
    table "import_snapshots"
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

    attribute :snapshot_sha256, :string do
      allow_nil? false
      public? true
    end

    attribute :imported_at, :integer do
      allow_nil? false
      public? true
    end

    attribute :report, :map do
      allow_nil? false
      default %{}
      public? true
    end
  end

  identities do
    identity :unique_hash, [:snapshot_sha256]
  end

  actions do
    defaults [:read]

    create :record do
      accept [:snapshot_sha256, :imported_at, :report]
    end
  end

  policies do
    bypass actor_attribute_equals(:role, :system) do
      authorize_if always()
    end

    policy action_type(:read) do
      authorize_if actor_attribute_equals(:role, :system)
    end

    policy action(:record) do
      authorize_if actor_attribute_equals(:role, :system)
    end
  end
end
