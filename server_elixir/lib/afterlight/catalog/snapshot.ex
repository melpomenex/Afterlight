defmodule Afterlight.Catalog.Snapshot do
  @moduledoc """
  Metadata-only `iptv_state` snapshot builder (design D4).
  """

  alias Afterlight.Catalog.PlaylistList

  @guide_id "active"

  @doc "Build the wire snapshot `{lists, epg}` from PostgreSQL rows."
  @spec build() :: map()
  def build do
    lists =
      PlaylistList
      |> Ash.read!(actor: system(), authorize?: false)
      |> Enum.map(fn list ->
        %{
          "id" => list.id,
          "name" => list.name,
          "addedBy" => list.added_by,
          "channelCount" => list.channel_count
        }
      end)

    epg =
      case Ash.get(Afterlight.Catalog.EpgGuide, @guide_id, actor: system(), error?: false) do
        {:ok, %Afterlight.Catalog.EpgGuide{} = guide} -> epg_summary(guide)
        _ -> nil
      end

    %{"lists" => lists, "epg" => epg}
  end

  defp epg_summary(guide) do
    import Ecto.Query

    counts =
      Afterlight.Repo.one(
        from p in "epg_programmes",
          where: p.guide_id == ^@guide_id,
          select: %{
            channels: fragment("COUNT(DISTINCT ?)", p.channel_key),
            programmes: count(p.id)
          }
      ) || %{channels: 0, programmes: 0}

    %{
      "name" => guide.name,
      "updatedAt" => guide.updated_at,
      "channels" => counts.channels || 0,
      "programmes" => counts.programmes || 0
    }
  end

  defp system, do: Afterlight.Accounts.Actor.system()
end
