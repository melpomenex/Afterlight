defmodule Afterlight.Gateway.LegacyConfig do
  @moduledoc """
  Deprecation warnings for legacy Node-only and dual-run selectors (P11 task 5.1).

  Timeline: warnings from 2026-09-07; removal target **2026-12-01** (next major
  stack release). Replacements are the Phoenix gateway topology documented in
  README.md — `npm run dev:stack`, no `VITE_TRANSPORT=node` dual-run.
  """

  require Logger

  @removal "2026-12-01"

  @legacy_vars [
    {"VITE_TRANSPORT", "node", "VITE_TRANSPORT=phoenix (or npm run dev:phoenix) with Phoenix on :4000"},
    {"AFTERLIGHT_WORLD_OWNER", "node", "AFTERLIGHT_WORLD_OWNER=phoenix (default in dev.exs)"},
    {"AFTERLIGHT_CHAT_OWNER", "node", "AFTERLIGHT_CHAT_OWNER=phoenix (default in dev.exs)"},
    {"NODE_CHAT_RELAY", "0", "Afterlight.Social chat relay — remove; use Phoenix gateway"},
    {"CHAT_RELAY_DISABLED", "1", "Afterlight.Social chat relay — remove; use Phoenix gateway"}
  ]

  @doc "Emit one warning per legacy env var present at boot."
  @spec warn() :: :ok
  def warn do
    for {name, bad_value, replacement} <- @legacy_vars do
      case System.get_env(name) do
        ^bad_value ->
          Logger.warning(
            "deprecated env #{name}=#{bad_value} — use #{replacement}; removal #{@removal}"
          )

        _ ->
          :ok
      end
    end

    if System.get_env("PORT") == "3001" and System.get_env("PHX_SERVER") != "true" do
      Logger.warning(
        "deprecated topology: Node :3001 as sole game server — use npm run dev:stack (Phoenix :4000 + sidecar :3001); removal #{@removal}"
      )
    end

    :ok
  end
end
