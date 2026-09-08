defmodule AfterlightWeb.OriginConfig do
  @moduledoc """
  Resolves the gateway WebSocket origin allow-list from `PHX_CHECK_ORIGIN`.

  Extracted from `config/runtime.exs` (which calls `resolve/1` at boot) so
  the policy is unit-testable: a silent regression here reads to players as
  "the theater never streams" — the browser client fails its socket upgrade
  with 403 and presents as an endless reconnect (change
  `fix-theater-streaming-after-elixir-cutover`, D1).

  Resolution contract:

  * `"false"` disables origin checking entirely (documented dev escape hatch).
  * a non-empty string is a comma-separated origin list; items are trimmed,
    so `"//a, //b"` is two origins, not one origin with a leading space.
  * anything else (`nil`, `""`, non-strings) falls back to the defaults:
    the development client origins plus the `*.vercel.app` frontend wildcard.
  """

  @default_origins [
    "//localhost:5173",
    "//localhost:4173",
    "//127.0.0.1:5173",
    "//*.vercel.app"
  ]

  @doc "Origin list for the endpoint's `check_origin`, `false`, or the defaults."
  @spec resolve(term()) :: false | [String.t()]
  def resolve("false"), do: false

  def resolve(origins) when is_binary(origins) and origins != "" do
    origins
    |> String.split(",", trim: true)
    |> Enum.map(&String.trim/1)
  end

  def resolve(_unset_or_unreadable), do: default_origins()

  @doc "The development + Vercel frontend default allow-list."
  @spec default_origins() :: [String.t()]
  def default_origins, do: @default_origins
end
