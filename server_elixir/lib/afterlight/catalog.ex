defmodule Afterlight.Catalog do
  @moduledoc """
  Ash domain for the shared IPTV library and XMLTV program guide (P5).
  """

  use Ash.Domain, otp_app: :afterlight

  require Ash.Query
  import Ecto.Query

  alias Afterlight.Accounts.Actor
  alias Afterlight.Catalog.{EpgChannel, EpgGuide, EpgProgramme, Model, PlaylistChannel, PlaylistList, Snapshot}
  alias Afterlight.Catalog.XMLTV
  alias Afterlight.Repo
  alias Afterlight.World

  @guide_id "active"
  @theater_room "theater"

  resources do
    resource PlaylistList
    resource PlaylistChannel
    resource EpgGuide
    resource EpgChannel
    resource EpgProgramme
  end

  def now_ms, do: System.system_time(:millisecond)

  @doc "Metadata-only `iptv_state` snapshot."
  def snapshot, do: Snapshot.build()

  @doc "Broadcast a fresh `iptv_state` to theater occupants."
  def announce_state do
    World.broadcast_frame(@theater_room, %{"type" => "iptv_state", "iptv" => snapshot()})
    :ok
  end

  @doc "Add an uploaded playlist (text already fetched)."
  def add_playlist(opts, now_ms \\ now_ms()) when is_map(opts) do
    library = load_library()

    case Model.apply_add_playlist(library, opts, now_ms) do
      %{"error" => reason, "list" => list} when is_nil(reason) and is_map(list) ->
        list = Map.put(list, "id", mint_list_id(now_ms))

        Repo.transaction(fn ->
          case persist_new_list(list) do
            :ok -> list
            {:error, _} -> Repo.rollback(:persist_failed)
          end
        end)
        |> case do
          {:ok, list} -> {:ok, list}
          {:error, :persist_failed} -> {:error, "persist_failed"}
          {:error, reason} -> {:error, reason}
        end

      %{"error" => reason} when is_binary(reason) ->
        {:error, reason}
    end
  end

  @doc "Remove a shared list transactionally."
  def remove_list(list_id) when is_binary(list_id) do
    library = load_library()

    case Model.apply_remove_list(library, list_id) do
      %{"error" => reason} when is_binary(reason) ->
        {:error, reason}

      %{"library" => _} ->
        case Ash.get(PlaylistList, list_id, actor: system(), error?: false) do
          {:ok, list} ->
            case Ash.destroy(list, actor: system()) do
              :ok -> :ok
              {:ok, _} -> :ok
              {:error, _} -> {:error, "persist_failed"}
            end

          _ ->
            {:error, "list_not_found"}
        end
    end
  end

  @doc "Replace the active EPG guide."
  def set_epg(%{name: name, channels: channels, programmes: programmes}, now_ms \\ now_ms()) do
    normalized =
      Model.apply_set_epg(
        %{"name" => name, "channels" => channels, "programmes" => programmes},
        now_ms
      )

    Repo.transaction(fn ->
      case replace_epg(normalized["epg"], now_ms) do
        :ok -> normalized["epg"]
        {:error, _} -> Repo.rollback(:persist_failed)
      end
    end)
    |> case do
      {:ok, epg} ->
        summary = Model.catalog_snapshot(%{"lists" => [], "epg" => epg})["epg"]
        {:ok, summary}

      {:error, :persist_failed} ->
        {:error, "persist_failed"}

      {:error, reason} ->
        {:error, reason}
    end
  end

  @doc "Channels for one list in wire order."
  def list_channels(list_id) when is_binary(list_id) do
    case Ash.get(PlaylistList, list_id, actor: system(), error?: false) do
      {:ok, _} ->
        PlaylistChannel
        |> Ash.Query.filter(list_id == ^list_id)
        |> Ash.Query.sort(position: :asc)
        |> Ash.read!(actor: system(), authorize?: false)
        |> Enum.map(&channel_wire/1)

      _ ->
        nil
    end
  end

  @doc "Bounded now/next schedule lookup."
  def lookup_epg(keys, at_ms \\ now_ms()) when is_list(keys) do
    keys =
      keys
      |> Enum.filter(&(is_binary(&1) and String.trim(&1) != ""))
      |> Enum.map(&String.trim/1)
      |> Enum.take(Model.epg_lookup_max())

    resolution = channel_resolution_map()

    Enum.map(keys, fn key ->
      channel_key = resolve_channel_key(resolution, key)
      {now, next} = if channel_key, do: now_next_db(channel_key, at_ms), else: {nil, nil}
      %{"key" => key, "now" => now, "next" => next}
    end)
  end

  defp channel_wire(ch) do
    %{
      "url" => ch.url,
      "name" => ch.name,
      "group" => if(ch.group_name == "", do: nil, else: ch.group_name),
      "logo" => ch.logo,
      "tvgId" => ch.tvg_id
    }
  end

  defp load_library do
    lists =
      PlaylistList
      |> Ash.read!(actor: system(), authorize?: false)
      |> Enum.map(fn list ->
        channels =
          PlaylistChannel
          |> Ash.Query.filter(list_id == ^list.id)
          |> Ash.Query.sort(position: :asc)
          |> Ash.read!(actor: system(), authorize?: false)
          |> Enum.map(&channel_wire/1)

        %{
          "id" => list.id,
          "name" => list.name,
          "addedBy" => list.added_by,
          "addedAt" => list.added_at,
          "channels" => channels
        }
      end)

    %{"lists" => lists}
  end

  defp persist_new_list(list) do
    channels = Map.get(list, "channels", [])

    with {:ok, _} <-
           PlaylistList
           |> Ash.Changeset.for_create(
             :create,
             %{
               id: list["id"],
               name: list["name"],
               added_by: list["addedBy"],
               added_at: list["addedAt"],
               channel_count: length(channels)
             },
             actor: system()
           )
           |> Ash.create(),
         :ok <- insert_channels(list["id"], channels) do
      :ok
    else
      {:error, _} -> {:error, :persist_failed}
    end
  end

  defp insert_channels(list_id, channels) do
    Enum.with_index(channels)
    |> Enum.reduce_while(:ok, fn {ch, idx}, :ok ->
      attrs = %{
        list_id: list_id,
        position: idx,
        url: ch["url"],
        name: ch["name"] || ""
      }

      attrs =
        case ch["group"] do
          g when is_binary(g) and g != "" -> Map.put(attrs, :group_name, g)
          _ -> attrs
        end

      attrs =
        if is_binary(ch["logo"]), do: Map.put(attrs, :logo, ch["logo"]), else: attrs

      attrs =
        if is_binary(ch["tvgId"]), do: Map.put(attrs, :tvg_id, ch["tvgId"]), else: attrs

      case PlaylistChannel
           |> Ash.Changeset.for_create(:create, attrs, actor: system())
           |> Ash.create() do
        {:ok, _} -> {:cont, :ok}
        {:error, _} -> {:halt, {:error, :persist_failed}}
      end
    end)
    |> case do
      :ok -> :ok
      other -> other
    end
  end

  defp replace_epg(epg, now_ms) do
    Repo.delete_all(from(c in "epg_programmes", where: c.guide_id == ^@guide_id))
    Repo.delete_all(from(c in "epg_channels", where: c.guide_id == ^@guide_id))

    with {:ok, _} <-
           EpgGuide
           |> Ash.Changeset.for_create(
             :upsert,
             %{id: @guide_id, name: epg["name"], updated_at: epg["updatedAt"] || now_ms},
             actor: system()
           )
           |> Ash.create(),
         :ok <- insert_epg_channels(epg["channels"]),
         :ok <- insert_epg_programmes(epg["programmes"]) do
      :ok
    else
      {:error, _} -> {:error, :persist_failed}
    end
  end

  defp insert_epg_channels(channels) when is_map(channels) do
    Enum.reduce_while(channels, :ok, fn {xmltv_id, ch}, :ok ->
      names =
        case Map.get(ch, "names") do
          ns when is_list(ns) -> ns
          _ -> []
        end

      attrs = %{
        guide_id: @guide_id,
        xmltv_id: xmltv_id,
        names: names,
        icon: Map.get(ch, "icon")
      }

      case EpgChannel |> Ash.Changeset.for_create(:create, attrs, actor: system()) |> Ash.create() do
        {:ok, _} -> {:cont, :ok}
        {:error, _} -> {:halt, {:error, :persist_failed}}
      end
    end)
  end

  defp insert_epg_programmes(programmes) when is_map(programmes) do
    seen = MapSet.new()

    programmes
    |> Enum.sort_by(&elem(&1, 0))
    |> Enum.reduce_while({:ok, seen}, fn {channel_key, entries}, {:ok, seen} ->
      case insert_programme_entries(channel_key, entries, seen) do
        {:ok, seen2} -> {:cont, {:ok, seen2}}
        {:error, _} = err -> {:halt, err}
      end
    end)
    |> case do
      {:ok, _} -> :ok
      {:error, _} = err -> err
    end
  end

  defp insert_programme_entries(channel_key, entries, seen) when is_list(entries) do
    Enum.reduce_while(entries, {:ok, seen}, fn entry, {:ok, seen} ->
      case entry do
        [start_ms, stop_ms, title | rest] when is_number(start_ms) and is_number(stop_ms) ->
          dedup = {channel_key, start_ms}

          if MapSet.member?(seen, dedup) do
            {:cont, {:ok, seen}}
          else
            desc = if length(rest) > 1, do: Enum.at(rest, 1), else: Enum.at(rest, 0)
            sub_title = if length(rest) > 1, do: Enum.at(rest, 0), else: nil

            attrs = %{
              guide_id: @guide_id,
              channel_key: channel_key,
              start_ms: trunc(start_ms),
              stop_ms: trunc(stop_ms),
              title: title,
              sub_title: sub_title,
              description: if(is_binary(desc), do: desc, else: nil)
            }

            case EpgProgramme |> Ash.Changeset.for_create(:create, attrs, actor: system()) |> Ash.create() do
              {:ok, _} -> {:cont, {:ok, MapSet.put(seen, dedup)}}
              {:error, _} -> {:halt, {:error, :persist_failed}}
            end
          end

        _ ->
          {:cont, {:ok, seen}}
      end
    end)
  end

  defp channel_resolution_map do
    by_id =
      EpgChannel
      |> Ash.Query.filter(guide_id == ^@guide_id)
      |> Ash.read!(actor: system(), authorize?: false)
      |> Map.new(fn ch -> {ch.xmltv_id, ch.xmltv_id} end)

    by_name =
      EpgChannel
      |> Ash.Query.filter(guide_id == ^@guide_id)
      |> Ash.read!(actor: system(), authorize?: false)
      |> Enum.reduce(%{}, fn ch, acc ->
        Enum.reduce(ch.names || [], acc, fn name, acc2 ->
          key = XMLTV.normalize_channel_key(name)

          if key != "" and not Map.has_key?(acc2, key),
            do: Map.put(acc2, key, ch.xmltv_id),
            else: acc2
        end)
      end)

    %{by_id: by_id, by_name: by_name}
  end

  defp resolve_channel_key(%{by_id: by_id, by_name: by_name}, key) do
    cond do
      Map.has_key?(by_id, key) ->
        key

      true ->
        Map.get(by_name, XMLTV.normalize_channel_key(key))
    end
  end

  defp now_next_db(channel_key, at_ms) do
    rows =
      Repo.all(
        from p in "epg_programmes",
          where:
            p.guide_id == ^@guide_id and p.channel_key == ^channel_key and p.stop_ms > ^at_ms,
          order_by: [asc: p.start_ms],
          limit: 2,
          select: {p.start_ms, p.stop_ms, p.title, p.description}
      )

    case rows do
      [] ->
        {nil, nil}

      [{start_ms, stop_ms, title, desc}] ->
        if start_ms > at_ms do
          {nil, programme_wire(start_ms, stop_ms, title, desc)}
        else
          {programme_wire(start_ms, stop_ms, title, desc), nil}
        end

      [{start_ms, stop_ms, title, desc} | rest] ->
        if start_ms > at_ms do
          {nil, programme_wire(start_ms, stop_ms, title, desc)}
        else
          next =
            case rest do
              [{ns, ne, nt, nd} | _] -> programme_wire(ns, ne, nt, nd)
              _ -> nil
            end

          {programme_wire(start_ms, stop_ms, title, desc), next}
        end
    end
  end

  defp programme_wire(start_ms, stop_ms, title, desc) do
    %{
      "start" => start_ms,
      "stop" => stop_ms,
      "title" => title,
      "desc" => desc
    }
  end

  defp system, do: Actor.system()

  defp mint_list_id(now_ms) do
    tail = Integer.to_string(now_ms, 36) |> String.downcase()
    rand = Base.encode16(:crypto.strong_rand_bytes(3), case: :lower)
    "iptv_#{tail}_#{rand}"
  end
end
