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
  `:phoenix`. In P2 no `:phoenix` rows existed; P3
  (`add-world-room-runtime`) adds the world rows — `join_room`, `movement`,
  `emote` — which route to `Afterlight.World` when set to `:phoenix`
  (default `:node` keeps the runtime dormant; flip per environment, rollback
  is the same edit in reverse). A `:phoenix` row must have a live handler:
  unlike P2, `disposition/1` now reports the configured owner verbatim, so
  flipping a row without a handler WOULD black-hole that traffic — the P3
  world handler is landed before the flip, and the rows default to `:node`.
  """

  alias Afterlight.Gateway

  @typedoc "Message owner: transport-terminated pong, relayed to Node, or world runtime."
  @type disposition :: :terminate_pong | :node | :phoenix

  @typedoc """
  Result of `dispatch/2`: synthesize a `pong` echoing `t`, hand the frame
  to the world or chat runtime, or relay the flat frame (string-keyed, with
  `"type"` re-attached) upstream.
  """
  @type dispatch ::
          {:pong, t :: term}
          | {:world, type :: String.t(), payload :: map}
          | {:chat, type :: String.t(), payload :: map}
          | {:relay, frame :: %{binary() => term}}

  @chat_types ~w(chat_send)

  @doc """
  Disposition for a client message type: the configured owner, verbatim.
  `:terminate_pong` means the gateway answers `pong` itself; `:node` means
  relay 1:1 upstream; `:phoenix` means the gateway domain handler answers
  it (P3: the world runtime; P7: the social chat relay). Unlike P2 there is NO safety clamp — a
  `:phoenix` row for a type without a live handler black-holes that
  traffic, which is why the P3 world handler landed before the flip and
  the world rows default to `:node`. Unknown types default to `:node`
  (Node ignores unknown types), and a garbage row value is read as `:node`
  rather than crashing dispatch.
  """
  @spec disposition(term) :: disposition()
  def disposition(type) when is_binary(type) do
    case routing_table() |> Map.get(type, :node) do
      disposition when disposition in [:terminate_pong, :phoenix, :node] -> disposition
      _other -> :node
    end
  end

  def disposition(_other), do: :node

  @doc """
  Single source of truth for the P3 world flip (design D6): the world
  domain's `join_room` routing row. `:phoenix` means the world runtime
  owns presence — the gateway suppresses Node-emitted `presence_*` frames
  and world-owned client messages are not relayed. Suppression and the
  flip are keyed on the SAME row so a rollback flip-flop can never leave
  one enabled without the other.
  """
  @spec world_owner() :: disposition()
  def world_owner do
    routing_table() |> Map.get("join_room", :node)
  end

  @doc "True while the world domain is routed to the runtime."
  @spec world_phx?() :: boolean
  def world_phx?, do: world_owner() == :phoenix

  @doc """
  Single source of truth for the P7 chat flip (design D1/D6): the chat
  domain's `chat_send` routing row. `:phoenix` means Afterlight.Social
  owns the relay — the gateway suppresses Node-emitted chat frames
  (`chat_message`, `chat_dm`, `chat_history`, `chat_presence`, `chat_error`)
  and `chat_send` is handled by Phoenix.
  """
  @spec chat_owner() :: disposition()
  def chat_owner do
    routing_table() |> Map.get("chat_send", :node)
  end

  @doc "True while the chat domain is routed to Phoenix."
  @spec chat_phx?() :: boolean
  def chat_phx?, do: chat_owner() == :phoenix

  @doc """
  Pure dispatch for a client push: `{:pong, t}` for transport-terminated
  pings, `{:chat, type, payload}` for chat-relay-owned messages,
  `{:world, type, payload}` for world-runtime-owned messages, or
  `{:relay, frame}` with the flat Node frame — string-keyed payload plus
  `"type"` restored.
  """
  @spec dispatch(term, term) :: dispatch()
  def dispatch(type, payload) when is_binary(type) do
    case disposition(type) do
      :terminate_pong -> {:pong, payload_key(payload, "t")}
      :phoenix when type in @chat_types -> {:chat, type, payload || %{}}
      :phoenix -> {:world, type, payload || %{}}
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
