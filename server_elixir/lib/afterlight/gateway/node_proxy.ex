defmodule Afterlight.Gateway.NodeProxy do
  @moduledoc """
  One authenticated upstream Node WebSocket ("shadow" connection) per
  gateway session (design D4/D5, tasks 3.1/3.4).

  Relay contract (1:1, in order):

    * client → upstream: the channel hands over a flat frame
      `%{"type" => t, ...fields}` (string-keyed); it is serialized with
      Jason and sent as a WebSocket text frame, preserving order.
    * upstream → client: text frames are parsed; a frame with `"type" => t`
      is delivered to the channel as `{:relay, t, fields_without_type}`,
      which the channel pushes as event `t` with the remaining fields.
      Malformed JSON and non-typed objects are dropped (Node drops
      malformed frames the same way).

  Lifecycle:

    * started by `AfterlightWeb.GameChannel` under
      `Afterlight.Gateway.ProxySupervisor` (restart: :temporary — a dead
      relay means a dead session, never a silently rebuilt one).
    * outbound frames sent while the upstream is still connecting are
      queued and flushed in order once it is up (unbounded queueing is
      the retained P2 posture, design D7).
    * upstream close → the channel is told `:relay_down` (it pushes
      `error {message: "relay_down"}` and closes the socket) and this
      proxy stops. Client socket exit → the upstream is closed.
    * newest-connection-wins (design D6): `establish/3` registers this
      proxy as the live transport for its guest_id; if another proxy was
      registered, its upstream is closed FIRST and `establish/3` waits
      for that proxy to terminate (monitor + ~2 s timeout) BEFORE the
      new session may forward `hello` — Node sees a clean
      removeClient → addClient and never two sessions for one guestId.

  Logs carry the correlation id and guest id — never tokens or secrets.
  """

  use GenServer
  require Logger

  alias Afterlight.Gateway
  alias Afterlight.Gateway.Sessions

  defstruct [
    :guest_id,
    :channel_pid,
    :adapter,
    :correlation_id,
    :upstream_pid,
    :early_up,
    :status,
    queue: :queue.new()
  ]

  ## Client API

  @doc """
  Starts a proxy. Opts: `:guest_id`, `:channel_pid` (the GameChannel
  process), `:adapter` (UpstreamAdapter module), `:correlation_id`.
  """
  @spec start_link(keyword) :: {:ok, pid}
  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts)
  end

  @doc false
  def child_spec(opts) do
    %{
      id: {__MODULE__, make_ref()},
      start: {__MODULE__, :start_link, [opts]},
      restart: :temporary,
      type: :worker
    }
  end

  @doc """
  Newest-connection-wins handshake (design D6). Registers `proxy_pid`
  for `guest_id`; if a previous proxy was registered and is still alive,
  closes ITS upstream first and waits up to `:timeout` (default 2 s) for
  it to terminate before returning, so the new session forwards `hello`
  only after Node has processed the old disconnect.
  """
  @spec establish(String.t(), pid, keyword) :: :ok
  def establish(guest_id, proxy_pid, opts \\ []) do
    timeout = Keyword.get(opts, :timeout, 2_000)
    previous = Sessions.register_proxy(guest_id, proxy_pid)

    if is_pid(previous) and previous != proxy_pid and Process.alive?(previous) do
      ref = Process.monitor(previous)

      # It may die between the alive? check and the call — the monitor
      # below still fires either way.
      try do
        supersede(previous)
      catch
        :exit, _ -> :ok
      end

      receive do
        {:DOWN, ^ref, :process, ^previous, _reason} ->
          :ok
      after
        timeout ->
          Process.demonitor(ref, [:flush])
          Logger.warning("gateway proxy supersede timeout guest=#{guest_id} old=#{inspect(previous)}")
          :ok
      end
    else
      :ok
    end
  end

  @doc """
  Forwards a flat frame (`%{"type" => t, ...}`) upstream. While the
  upstream is connecting the frame is queued (still ordered). Returns
  `:ok` or `{:error, :relay_down}`.
  """
  @spec forward(pid, %{binary() => term}) :: :ok | {:error, :relay_down}
  def forward(proxy_pid, frame) do
    GenServer.call(proxy_pid, {:forward, frame}, 10_000)
  catch
    :exit, _ -> {:error, :relay_down}
  end

  @doc "Marks the proxy superseded: its upstream is closed, then it stops."
  @spec supersede(pid) :: :ok
  def supersede(proxy_pid), do: GenServer.call(proxy_pid, :supersede)

  @doc "Stops the proxy and closes the upstream (channel terminate path)."
  @spec stop(pid) :: :ok
  def stop(proxy_pid) do
    GenServer.stop(proxy_pid, :normal)
    :ok
  catch
    :exit, _ -> :ok
  end

  ## Server callbacks

  @impl true
  def init(opts) do
    state = %__MODULE__{
      guest_id: Keyword.fetch!(opts, :guest_id),
      channel_pid: Keyword.fetch!(opts, :channel_pid),
      adapter: Keyword.fetch!(opts, :adapter),
      correlation_id: Keyword.get(opts, :correlation_id, Gateway.correlation_id()),
      status: :connecting
    }

    Process.flag(:trap_exit, true)
    {:ok, state, {:continue, :connect}}
  end

  @impl true
  def handle_continue(:connect, state) do
    url = Gateway.config(:node_ws_url, "ws://127.0.0.1:3001/ws")
    headers = boundary_headers()

    case state.adapter.connect(url, headers, self()) do
      {:ok, pid} ->
        state = %{state | upstream_pid: pid}

        # An `upstream_up` may have been queued before this continue ran
        # (adapters that connect asynchronously); honor it now.
        state =
          if state.early_up == pid do
            maybe_supersede_new_upstream(%{state | early_up: nil, status: :up})
          else
            maybe_supersede_new_upstream(state)
          end

        {:noreply, if(state.status == :up, do: flush_queue(state), else: state)}

      {:error, reason} ->
        Logger.warning(
          "gateway relay connect failed corr=#{state.correlation_id} guest=#{state.guest_id} reason=#{inspect(reason)}"
        )

        notify_relay_down(state)
        {:stop, :shutdown, state}
    end
  end

  @impl true
  def handle_call({:forward, frame}, _from, state) do
    case state.status do
      :up ->
        case send_frame(state, frame) do
          :ok -> {:reply, :ok, state}
          {:error, _} -> {:reply, {:error, :relay_down}, state}
        end

      :connecting ->
        {:reply, :ok, %{state | queue: :queue.in(Jason.encode!(frame), state.queue)}}

      :stopping ->
        {:reply, {:error, :relay_down}, state}
    end
  end

  def handle_call(:supersede, _from, state) do
    case state.status do
      :up ->
        close_upstream(state)
        {:reply, :ok, state}

      :connecting ->
        # Upstream may not exist yet; it is closed the moment it appears
        # (see maybe_supersede_new_upstream/1).
        {:reply, :ok, %{state | status: :stopping}}

      :stopping ->
        {:reply, :ok, state}
    end
  end

  @impl true
  def handle_info({:upstream_up, pid}, %{upstream_pid: nil} = state) do
    # Queued before the connect continue ran — remember it.
    {:noreply, %{state | early_up: pid}}
  end

  def handle_info({:upstream_up, pid}, %{upstream_pid: pid} = state) do
    case maybe_supersede_new_upstream(%{state | status: :up}) do
      %{status: :stopping} = state -> {:noreply, state}
      new_state -> {:noreply, flush_queue(new_state)}
    end
  end

  def handle_info({:upstream_frame, pid, json}, %{upstream_pid: pid} = state) do
    relay_to_channel(json, state)
    {:noreply, state}
  end

  def handle_info({:upstream_down, pid, reason}, %{upstream_pid: pid} = state) do
    Logger.info(
      "gateway relay upstream closed corr=#{state.correlation_id} guest=#{state.guest_id} reason=#{inspect(reason)}"
    )

    notify_relay_down(state)
    {:stop, :shutdown, %{state | upstream_pid: nil}}
  end

  def handle_info({:DOWN, _ref, :process, pid, reason}, %{channel_pid: pid} = state) do
    Logger.info(
      "gateway session ended corr=#{state.correlation_id} guest=#{state.guest_id} reason=#{inspect(reason)}"
    )

    close_upstream(state)
    {:stop, :shutdown, %{state | upstream_pid: nil}}
  end

  def handle_info({:EXIT, _pid, _reason}, state), do: {:noreply, state}

  def handle_info(_msg, state), do: {:noreply, state}

  @impl true
  def terminate(_reason, state) do
    close_upstream(state)
    Sessions.unregister_proxy(state.guest_id, self())
    :ok
  end

  ## Internals

  # If the proxy was superseded while :connecting, close the fresh
  # upstream immediately so the old session tears down cleanly.
  defp maybe_supersede_new_upstream(%{status: :stopping} = state) do
    close_upstream(state)
    state
  end

  defp maybe_supersede_new_upstream(state), do: state

  defp flush_queue(state) do
    case :queue.out(state.queue) do
      {:empty, _queue} ->
        state

      {{:value, json}, rest} ->
        case send_frame(state, json) do
          :ok -> flush_queue(%{state | queue: rest})
          {:error, _} -> state
        end
    end
  end

  defp send_frame(state, frame_or_json) do
    json =
      case frame_or_json do
        %{} = frame -> Jason.encode!(frame)
        binary when is_binary(binary) -> binary
      end

    state.adapter.send_frame(state.upstream_pid, json)
  end

  defp relay_to_channel(json, state) do
    case Jason.decode(json) do
      {:ok, %{"type" => type} = frame} when is_binary(type) ->
        send(state.channel_pid, {:relay, type, Map.delete(frame, "type")})

      # Node drops malformed JSON (parses to null) and only ever sends
      # typed flat objects; junk is dropped, never forwarded.
      _ ->
        Logger.warning("gateway relay dropped malformed upstream frame corr=#{state.correlation_id}")
        :ok
    end
  end

  defp notify_relay_down(state) do
    send(state.channel_pid, :relay_down)
  end

  defp close_upstream(%{upstream_pid: nil}), do: :ok

  defp close_upstream(state) do
    state.adapter.close(state.upstream_pid)
  catch
    _, _ -> :ok
  end

  defp boundary_headers do
    case Gateway.config(:boundary_secret) do
      secret when is_binary(secret) -> [{"x-afterlight-boundary", secret}]
      _ -> []
    end
  end
end
