defmodule Afterlight.Specialty.IrcBridge do
  @moduledoc """
  Authenticated HTTP adapter client between `Afterlight.Social.Bridge`
  and the Node IRC sidecar (`server/ircAdapter.js`).

  Outbound game events POST to `/api/irc/adapter/event` on the sidecar.
  Inbound IRC events arrive at `/internal/irc/adapter/event` on Phoenix
  and are forwarded to `Bridge.handle_irc_event/2`.

  Sidecar health is probed periodically; failures mark the bridge down
  so game chat degrades to local-only relay without surfacing errors.
  """

  use GenServer
  require Logger

  alias Afterlight.Gateway
  alias Afterlight.Social.Bridge

  @default_health_ms 5_000
  @default_timeout_ms 3_000

  defstruct [
    :sidecar_url,
    :callback_url,
    :boundary_secret,
    health_interval_ms: @default_health_ms,
    request_timeout_ms: @default_timeout_ms,
    status: :down,
    health_ref: nil
  ]

  # --- Client API -------------------------------------------------------------

  def start_link(opts \\ []) do
    name = Keyword.get(opts, :name, __MODULE__)
    GenServer.start_link(__MODULE__, opts, name: name)
  end

  @doc "Adapter entry point used by `Afterlight.Social.Bridge`."
  def send_event(payload) when is_map(payload) do
    GenServer.cast(__MODULE__, {:send_event, payload})
    :ok
  end

  @doc "Delivers an inbound event from the Node sidecar (HTTP controller)."
  def receive_event(event) when is_map(event) do
    GenServer.cast(__MODULE__, {:receive_event, event})
    :ok
  end

  @doc "Returns `:up` or `:down` for the sidecar connection."
  def status do
    GenServer.call(__MODULE__, :status)
  end

  # --- Server -----------------------------------------------------------------

  @impl true
  def init(opts) do
    enabled = Keyword.get(opts, :enabled, irc_adapter_config(:enabled, false))

    if enabled do
      state = %__MODULE__{
        sidecar_url: sidecar_url(opts),
        callback_url: callback_url(opts),
        boundary_secret: boundary_secret(opts),
        health_interval_ms: Keyword.get(opts, :health_interval_ms, irc_adapter_config(:health_interval_ms, @default_health_ms)),
        request_timeout_ms: Keyword.get(opts, :request_timeout_ms, irc_adapter_config(:request_timeout_ms, @default_timeout_ms))
      }

      Bridge.set_adapter(Bridge, __MODULE__)
      # schedule_health/1 already defers the first probe by one interval;
      # probing immediately crashed at boot when Finch's registry did not
      # exist yet (domain supervisors start ahead of it).
      health_ref = schedule_health(state.health_interval_ms)
      {:ok, %{state | health_ref: health_ref}}
    else
      :ignore
    end
  end

  @impl true
  def handle_cast({:send_event, payload}, state) do
    state =
      if state.status == :up do
        post_event(state, payload)
      else
        state
      end

    {:noreply, state}
  end

  @impl true
  def handle_cast({:receive_event, event}, state) do
    _ = Bridge.handle_irc_event(Bridge, event)
    {:noreply, state}
  end

  @impl true
  def handle_call(:status, _from, state) do
    {:reply, state.status, state}
  end

  @impl true
  def handle_info(:health_check, state) do
    state = probe_health(state)
    health_ref = schedule_health(state.health_interval_ms)
    {:noreply, %{state | health_ref: health_ref}}
  end

  def handle_info(_msg, state), do: {:noreply, state}

  # --- HTTP -------------------------------------------------------------------

  defp post_event(state, payload) do
    url = String.trim_trailing(state.sidecar_url, "/") <> "/api/irc/adapter/event"

    req =
      Finch.build(:post, url, json_headers(state), Jason.encode!(%{event: payload}))

    case Finch.request(req, Afterlight.Finch, receive_timeout: state.request_timeout_ms) do
      {:ok, %Finch.Response{status: status}} when status in 200..299 ->
        state

      {:ok, %Finch.Response{status: status}} ->
        Logger.debug("irc adapter post rejected status=#{status}")
        mark_down(state)

      {:error, reason} ->
        Logger.debug("irc adapter post failed reason=#{inspect(reason)}")
        mark_down(state)
    end
  end

  defp probe_health(%{sidecar_url: url} = state) do
    health_url = String.trim_trailing(url, "/") <> "/api/irc/adapter/health"

    req = Finch.build(:get, health_url, boundary_headers(state))

    case Finch.request(req, Afterlight.Finch, receive_timeout: state.request_timeout_ms) do
      {:ok, %Finch.Response{status: 200, body: body}} ->
        case Jason.decode(body) do
          {:ok, %{"ok" => true}} -> mark_up(state)
          _ -> mark_down(state)
        end

      _ ->
        mark_down(state)
    end
  end

  defp mark_up(%{status: :up} = state), do: state

  defp mark_up(state) do
    Bridge.set_sidecar_status(Bridge, :up)
    %{state | status: :up}
  end

  defp mark_down(%{status: :down} = state), do: state

  defp mark_down(state) do
    Bridge.set_sidecar_status(Bridge, :down)
    %{state | status: :down}
  end

  defp json_headers(state) do
    [{"content-type", "application/json"} | boundary_headers(state)]
  end

  defp boundary_headers(%{boundary_secret: secret}) when is_binary(secret) do
    [{"x-afterlight-boundary", secret}]
  end

  defp boundary_headers(_state), do: []

  defp schedule_health(ms) do
    Process.send_after(self(), :health_check, ms)
  end

  defp sidecar_url(opts) do
    Keyword.get(opts, :sidecar_url) ||
      irc_adapter_config(:sidecar_url) ||
      Gateway.config(:proxy_target, "http://127.0.0.1:3001")
  end

  defp callback_url(opts) do
    Keyword.get(opts, :callback_url) ||
      irc_adapter_config(:callback_url) ||
      default_callback_url()
  end

  defp boundary_secret(opts) do
    Keyword.get(opts, :boundary_secret) ||
      irc_adapter_config(:boundary_secret) ||
      Gateway.config(:boundary_secret)
  end

  defp irc_adapter_config(key, default \\ nil) do
    Application.get_env(:afterlight, :irc_adapter, [])
    |> Keyword.get(key, default)
  end

  defp default_callback_url do
    port =
      Application.get_env(:afterlight, AfterlightWeb.Endpoint, [])
      |> keyword_get_in([:http, :port]) || 4000

    "http://127.0.0.1:#{port}/internal/irc/adapter/event"
  end

  defp keyword_get_in(list, keys) when is_list(list) do
    Enum.reduce(keys, list, fn
      key, acc when is_list(acc) -> Keyword.get(acc, key)
      _key, _acc -> nil
    end)
  end
end
