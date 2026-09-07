defmodule Afterlight.Catalog.Export do
  @moduledoc false

  alias Afterlight.Repo

  import Ecto.Query

  @guide_id "active"

  def write_iptv!(dest, opts \\ []) do
    unless Keyword.get(opts, :freeze_ack) == true do
      raise ArgumentError, "export_catalog requires freeze_ack: true (write freeze)"
    end

    dest = Path.expand(dest)

    lists =
      Repo.all(from(l in "playlist_lists", order_by: [asc: l.added_at]))

    payload_lists =
      Enum.map(lists, fn list ->
        channels =
          Repo.all(
            from(c in "playlist_channels",
              where: c.list_id == ^list.id,
              order_by: [asc: c.position]
            )
          )
          |> Enum.map(fn ch ->
            %{
              "url" => ch.url,
              "name" => ch.name,
              "group" => if(ch.group_name == "", do: nil, else: ch.group_name),
              "logo" => ch.logo,
              "tvgId" => ch.tvg_id
            }
          end)

        %{
          "id" => list.id,
          "name" => list.name,
          "addedBy" => list.added_by,
          "addedAt" => list.added_at,
          "channels" => channels
        }
      end)

    payload = %{"lists" => payload_lists}
    File.mkdir_p!(Path.dirname(dest))
    File.write!(dest, Jason.encode!(payload) <> "\n")
    dest
  end

  def write_epg!(dest, opts \\ []) do
    unless Keyword.get(opts, :freeze_ack) == true do
      raise ArgumentError, "export_catalog requires freeze_ack: true (write freeze)"
    end

    dest = Path.expand(dest)

    guide =
      Repo.one(from(g in "epg_guides", where: g.id == ^@guide_id, limit: 1))

    if is_nil(guide) do
      payload = %{"name" => nil, "updatedAt" => nil, "channels" => %{}, "programmes" => %{}}
      File.mkdir_p!(Path.dirname(dest))
      File.write!(dest, Jason.encode!(payload) <> "\n")
      dest
    else
      channels =
        Repo.all(from(c in "epg_channels", where: c.guide_id == ^@guide_id))
        |> Map.new(fn ch ->
          {ch.xmltv_id, %{"names" => ch.names, "icon" => ch.icon}}
        end)

      programmes =
        Repo.all(
          from(p in "epg_programmes",
            where: p.guide_id == ^@guide_id,
            order_by: [asc: p.channel_key, asc: p.start_ms]
          )
        )
        |> Enum.group_by(& &1.channel_key)
        |> Map.new(fn {channel_key, rows} ->
          entries =
            Enum.map(rows, fn row ->
              base = [row.start_ms, row.stop_ms, row.title]
              if row.description, do: base ++ [row.description], else: base
            end)

          {channel_key, entries}
        end)

      payload = %{
        "name" => guide.name,
        "updatedAt" => guide.updated_at,
        "channels" => channels,
        "programmes" => programmes
      }

      File.mkdir_p!(Path.dirname(dest))
      File.write!(dest, Jason.encode!(payload) <> "\n")
      dest
    end
  end
end
