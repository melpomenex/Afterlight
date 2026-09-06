defmodule Afterlight.Gateway.Router do
  @moduledoc """
  Config-owned disposition table: who answers each client message type.

  ## The P2 table (design D4 — "gateway terminates transport + identity +
  meta; everything else is relayed 1:1 to Node")

  | Message / event            | P2 disposition                                      |
  |----------------------------|-----------------------------------------------------|
  | socket connect, token verify, connect rate limit, channel join authorization | terminated at the gateway (UserSocket / GameChannel, not routable messages) |
  | `ping` → `pong`            | `:terminate_pong` — synthesized at the gateway, `{t}` echoed, never relayed |
  | every other game message (`hello`, `set_nickname`, `join_room`, `movement`, `emote`, `chat_send`, gardens, economy, restoration, theater, catalog, torrents, …) | `:node` — relayed verbatim over the session's authenticated upstream shadow connection |
  | unknown message types      | `:node` (default) — Node ignores unknown types, so today's forward-compat behavior is preserved |

  The table lives in config under `config :afterlight, :gateway, routing: %{
  "ping" => :terminate_pong}`. Values are `:terminate_pong`, `:node` or
  `:phoenix`. In P2 no `:phoenix` rows exist: P3+ (`add-world-room-runtime`
  and later) flips entries from `:node` to `:phoenix` as domains migrate.
  Until a Phoenix handler exists for an owner, `disposition/1` reports
  `:node` for it — i.e. P2 treats any non-`:terminate_pong` owner as
  "relay to Node", which is bit-preserving by construction.
  """

  alias Afterlight.Gateway

  @typedoc "Message owner: transport-terminated pong, or relayed to Node."
  @type disposition :: :terminate_pong | :node

  @typedoc """
  Result of `dispatch/2`: synthesize a `pong` echoing `t`, or relay the
  flat frame (string-keyed, with `"type"` re-attached) upstream.
  """
  @type dispatch :: {:pong, t :: term} | {:relay, frame :: %{binary() => term}}

  @doc """
  Disposition for a client message type. `:terminate_pong` means the
  gateway answers `pong` itself; `:node` means relay 1:1 upstream.
  Unknown types default to `:node` (Node ignores unknown types).
  """
  @spec disposition(term) :: disposition()
  def disposition(type) when is_binary(type) do
    case routing_table() |> Map.get(type, :node) do
      # P2 has no Phoenix handlers yet: any :phoenix row still relays to
      # Node (see @moduledoc). Flipping a row without a handler must never
      # black-hole game traffic.
      :terminate_pong -> :terminate_pong
      _owner -> :node
    end
  end

  def disposition(_other), do: :node

  @doc """
  Pure dispatch for a client push: `{:pong, t}` for transport-terminated
  pings (the channel pushes `pong` with the echoed `t`), or
  `{:relay, frame}` with the flat Node frame — string-keyed payload plus
  `"type"` restored.
  """
  @spec dispatch(term, term) :: dispatch()
  def dispatch(type, payload) when is_binary(type) do
    case disposition(type) do
      :terminate_pong -> {:pong, payload_key(payload, "t")}
      :node -> {:relay, to_frame(type, payload)}
    end
  end

  def dispatch(_type, _payload), do: {:relay, %{}}

  # Client pushes may arrive with string or atom keys (JSON gives strings;
  # tests and internal callers give atoms). Node frames are string-keyed
  # JSON objects, so normalize shallowly-recursive to strings.
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
