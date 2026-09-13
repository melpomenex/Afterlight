defmodule Afterlight.Gateway.Router do
  @moduledoc """
  Config-owned disposition table: who answers each client message type.

  Post-P11: unknown types default to `:unrouted` (loud failure). Only
  enumerated `@node_relay_types` fall back to transitional Node relay;
  flipped rows route to Phoenix handlers (`:phoenix`) or the specialty
  adapter (`:specialty`).
  """

  alias Afterlight.Gateway

  @typedoc "Message owner: transport-terminated pong, relayed to Node, domain runtime, specialty, or unrouted."
  @type disposition :: :terminate_pong | :node | :phoenix | :specialty | :unrouted

  @typedoc """
  Result of `dispatch/2`: synthesize a `pong` echoing `t`, hand the frame
  to a domain handler, relay the flat frame upstream, or fail loudly.
  """
  @type dispatch ::
          {:pong, t :: term}
          | {:hello, payload :: map}
          | {:world, type :: String.t(), payload :: map}
          | {:chat, type :: String.t(), payload :: map}
          | {:catalog, type :: String.t(), payload :: map}
          | {:theater, type :: String.t(), payload :: map}
          | {:activity, type :: String.t(), payload :: map}
          | {:specialty, type :: String.t(), payload :: map}
          | {:relay, frame :: %{binary() => term}}
          | {:unrouted, type :: String.t()}

  @specialty_types ~w(torrent_resolve)

  @world_types ~w(join_room movement emote place_directory_get atmosphere_get atmosphere_set)
  @chat_types ~w(chat_send)
  @catalog_types ~w(iptv_list_get iptv_list_remove epg_lookup)
  @theater_types ~w(theater_queue theater_control theater_channel theater_playlist_resolve)
  @activity_types ~w(
    activity_join activity_leave activity_ready activity_input activity_resnapshot activity_config
    activity_challenge activity_challenge_respond activity_challenge_mute activity_challenge_block
    tournament_enroll tournament_withdraw tournament_checkin tournament_get
  )

  @node_relay_types ~w(
    hello set_nickname set_avatar
    join_room movement emote chat_send
    theater_queue theater_control theater_channel theater_playlist_resolve
    iptv_list_get iptv_list_remove epg_lookup
  )

  @doc """
  Disposition for a client message type: the configured owner, verbatim.
  Unknown types and non-binary input are `:unrouted`. Enumerated transitional
  relay types default to `:node`; `ping` terminates at the gateway;
  `torrent_resolve` routes to the specialty adapter.
  """
  @spec disposition(term) :: disposition()
  def disposition(type) when is_binary(type) do
    table = routing_table()

    case Map.get(table, type, default_disposition(type)) do
      disposition when disposition in [:terminate_pong, :phoenix, :node, :specialty, :unrouted] ->
        disposition

      _other ->
        default_disposition(type)
    end
  end

  def disposition(_other), do: :unrouted

  defp default_disposition("ping"), do: :terminate_pong
  defp default_disposition(type) when type in @specialty_types, do: :specialty

  # Places directory (add-social-place-framework task 3.3) and room
  # atmosphere (add-atmosphere-weather-system task 2.1): Phoenix-only
  # world-domain reads that ride the world flip. Deliberately NOT in
  # @node_relay_types — when the world row rolls back to Node, these are
  # simply unrouted; no Node path ever owns these messages.
  defp default_disposition("place_directory_get"), do: if(world_phx?(), do: :phoenix, else: :unrouted)

  defp default_disposition("atmosphere_get"), do: if(world_phx?(), do: :phoenix, else: :unrouted)

  # Environment selection writes the same room-authoritative atmosphere state;
  # Phoenix-only like the read, never a Node relay type.
  defp default_disposition("atmosphere_set"), do: if(world_phx?(), do: :phoenix, else: :unrouted)

  defp default_disposition(type) when type in @activity_types,
    do: if(world_phx?(), do: :phoenix, else: :unrouted)

  defp default_disposition(type) when type in @node_relay_types, do: :node
  defp default_disposition(_type), do: :unrouted

  @doc "Types still relayed to the Node sidecar when not flipped to Phoenix."
  @spec node_relay_types() :: [String.t()]
  def node_relay_types, do: @node_relay_types

  @doc "Activity types owned by Phoenix world runtime."
  @spec activity_types() :: [String.t()]
  def activity_types, do: @activity_types

  @doc "Types handled by the P7 specialty adapters instead of raw Node relay."
  @spec specialty_types() :: [String.t()]
  def specialty_types, do: @specialty_types

  @doc "Single source of truth for the P3 world flip: the `join_room` routing row."
  @spec world_owner() :: disposition()
  def world_owner do
    routing_table() |> Map.get("join_room", :node)
  end

  @spec world_phx?() :: boolean
  def world_phx?, do: world_owner() == :phoenix

  @doc "Single source of truth for the P7 chat flip: the `chat_send` routing row."
  @spec chat_owner() :: disposition()
  def chat_owner do
    routing_table() |> Map.get("chat_send", :node)
  end

  @spec chat_phx?() :: boolean
  def chat_phx?, do: chat_owner() == :phoenix

  @doc "Single source of truth for the P5 catalog flip: the `iptv_list_get` routing row."
  @spec catalog_owner() :: disposition()
  def catalog_owner do
    routing_table() |> Map.get("iptv_list_get", :node)
  end

  @spec catalog_phx?() :: boolean
  def catalog_phx?, do: catalog_owner() == :phoenix

  @doc "Single source of truth for the P5 theater flip: the `theater_queue` routing row."
  @spec theater_owner() :: disposition()
  def theater_owner do
    routing_table() |> Map.get("theater_queue", :node)
  end

  @spec theater_phx?() :: boolean
  def theater_phx?, do: theater_owner() == :phoenix

  @doc "Single source of truth for the hello/welcome flip: the `hello` routing row."
  @spec hello_owner() :: disposition()
  def hello_owner do
    routing_table() |> Map.get("hello", :node)
  end

  @spec hello_phx?() :: boolean
  def hello_phx?, do: hello_owner() == :phoenix

  @spec dispatch(term, term) :: dispatch()
  def dispatch(type, payload) when is_binary(type) do
    case disposition(type) do
      :terminate_pong ->
        {:pong, payload_key(payload, "t")}

      :phoenix when type == "hello" ->
        {:hello, payload || %{}}

      :phoenix when type in @chat_types ->
        {:chat, type, payload || %{}}

      :phoenix when type in @catalog_types ->
        {:catalog, type, payload || %{}}

      :phoenix when type in @theater_types ->
        {:theater, type, payload || %{}}

      :phoenix when type in @activity_types ->
        {:activity, type, payload || %{}}

      :phoenix when type in @world_types ->
        {:world, type, payload || %{}}

      :phoenix ->
        {:world, type, payload || %{}}

      :specialty ->
        {:specialty, type, payload || %{}}

      :node ->
        {:relay, to_frame(type, payload)}

      :unrouted ->
        {:unrouted, type}
    end
  end

  def dispatch(_type, _payload), do: {:unrouted, ""}

  defp to_frame(type, payload) when is_map(payload) do
    payload |> stringify() |> Map.put("type", type)
  end

  defp to_frame(type, _payload), do: %{"type" => type}

  defp stringify(payload) when is_map(payload) do
    Map.new(payload, fn
      {k, v} when is_map(v) -> {to_string(k), stringify(v)}
      {k, v} when is_list(v) -> {to_string(k), stringify_list(v)}
      {k, v} -> {to_string(k), v}
    end)
  end

  defp stringify(other), do: other

  defp stringify_list(list), do: Enum.map(list, &stringify/1)

  defp payload_key(payload, key) when is_map(payload) do
    cond do
      is_map_key(payload, key) -> Map.get(payload, key)
      is_map_key(payload, safe_atom(key)) -> Map.get(payload, safe_atom(key))
      true -> nil
    end
  end

  defp payload_key(_payload, _key), do: nil

  defp safe_atom(key) do
    String.to_existing_atom(key)
  rescue
    ArgumentError -> nil
  end

  defp routing_table, do: Gateway.config(:routing, %{"ping" => :terminate_pong})
end
