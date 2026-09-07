defmodule Afterlight.Catalog.Gateway do
  @moduledoc """
  Gateway handlers for theater catalog control messages.
  """

  alias Afterlight.Catalog
  alias Afterlight.Catalog.Errors

  @theater_room "theater"

  @spec handle(String.t(), map(), map()) :: {:ok, map()} | {:error, String.t()}
  def handle(type, payload, ctx) when is_binary(type) and is_map(payload) and is_map(ctx) do
    if in_theater?(ctx) do
      do_handle(type, payload)
    else
      {:error, "You need to be inside The Orpheum to browse the channel library."}
    end
  end

  defp do_handle("iptv_list_get", payload) do
    list_id = to_string(payload["listId"] || "")
    channels = Catalog.list_channels(list_id) || []
    {:ok, %{"type" => "iptv_list", "listId" => list_id, "channels" => channels}}
  end

  defp do_handle("iptv_list_remove", payload) do
    list_id = to_string(payload["listId"] || "")

    case Catalog.remove_list(list_id) do
      :ok ->
        Catalog.announce_state()
        {:ok, :silent}

      {:error, reason} ->
        {:error, Errors.text(reason)}
    end
  end

  defp do_handle("epg_lookup", payload) do
    keys = if is_list(payload["keys"]), do: payload["keys"], else: []
    entries = Catalog.lookup_epg(keys)
    {:ok, %{"type" => "epg_schedule", "entries" => entries}}
  end

  defp do_handle(_type, _payload), do: {:error, "unrouted"}

  defp in_theater?(%{world_room: %{wire_id: @theater_room}}), do: true
  defp in_theater?(%{"world_room" => %{wire_id: @theater_room}}), do: true
  defp in_theater?(_), do: false
end
