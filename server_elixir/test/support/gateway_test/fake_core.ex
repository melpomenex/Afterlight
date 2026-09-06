defmodule GatewayTest.FakeCore do
  @moduledoc """
  Shared message loop for fake upstream adapters (see
  `GatewayTest.FakeUpstream` / `GatewayTest.ManualUpstream`).

  The fake process receives:

    * `{:send, json}` — the proxy forwarded a frame upstream.
    * `:close` — the proxy closed the upstream (newest-wins, session end).
    * `{:__inject_frame__, json}` — test injects an upstream→client frame.
    * `{:__inject_down__, reason}` — test simulates an upstream close.

  All events are mirrored to the registered test owner:

    * `{:fake_frame, pid, json}` — proxy sent a frame upstream.
    * `{:fake_closed, pid}` — proxy closed the upstream.
    * `{:fake_upstream_started, pid, headers}` — connect happened.
  """

  @owner_table :gateway_test_fake_upstream_owner

  def ensure_owner_table do
    if :ets.whereis(@owner_table) == :undefined do
      :ets.new(@owner_table, [:named_table, :set, :public])
    end

    :ok
  end

  def set_owner(owner) do
    ensure_owner_table()
    :ets.insert(@owner_table, {:owner, owner})
    :ok
  end

  def current_owner do
    ensure_owner_table()

    case :ets.lookup(@owner_table, :owner) do
      [{:owner, pid}] -> pid
      [] -> self()
    end
  end

  def spawn(proxy_pid, opts) do
    owner = current_owner()
    headers = Keyword.get(opts, :headers, [])
    announce? = Keyword.get(opts, :announce, true)

    pid =
      spawn(fn ->
        if announce?, do: send(proxy_pid, {:upstream_up, self()})
        send(owner, {:fake_upstream_started, self(), headers})
        loop(proxy_pid, owner)
      end)

    {:ok, pid}
  end

  defp loop(proxy_pid, owner) do
    receive do
      {:send, json} ->
        send(owner, {:fake_frame, self(), json})
        loop(proxy_pid, owner)

      :close ->
        # Mirror the real WebSockex close handshake: the proxy observes
        # the close as an upstream_down.
        send(proxy_pid, {:upstream_down, self(), :closed})
        send(owner, {:fake_closed, self()})
        exit(:normal)

      {:__inject_frame__, json} ->
        send(proxy_pid, {:upstream_frame, self(), json})
        loop(proxy_pid, owner)

      {:__inject_down__, reason} ->
        send(proxy_pid, {:upstream_down, self(), reason})
        exit(:normal)

      :__announce__ ->
        # ManualUpstream: the test released the (simulated) connection
        # attempt; the proxy is told the upstream is up.
        send(proxy_pid, {:upstream_up, self()})
        loop(proxy_pid, owner)

      _other ->
        loop(proxy_pid, owner)
    end
  end

  ## Test-side helpers

  def inject_frame(upstream_pid, frame) do
    send(upstream_pid, {:__inject_frame__, Jason.encode!(frame)})
    :ok
  end

  def inject_down(upstream_pid, reason \\ :closed) do
    send(upstream_pid, {:__inject_down__, reason})
    :ok
  end

  def announce(upstream_pid) do
    send(upstream_pid, :__announce__)
    :ok
  end
end

defmodule GatewayTest.FakeUpstream do
  @moduledoc "Fake upstream that reports `:upstream_up` immediately."
  @behaviour Afterlight.Gateway.UpstreamAdapter

  @impl true
  def connect(_url, headers, proxy_pid), do: GatewayTest.FakeCore.spawn(proxy_pid, headers: headers)

  @impl true
  def send_frame(pid, json) do
    send(pid, {:send, json})
    :ok
  end

  @impl true
  def close(pid) do
    send(pid, :close)
    :ok
  end
end

defmodule GatewayTest.ManualUpstream do
  @moduledoc """
  Fake upstream that connects but WITHHOLDS `:upstream_up` until
  `announce/1` — used to test outbound queueing while the upstream is
  still connecting.
  """
  @behaviour Afterlight.Gateway.UpstreamAdapter

  @impl true
  def connect(_url, headers, proxy_pid),
    do: GatewayTest.FakeCore.spawn(proxy_pid, headers: headers, announce: false)

  @impl true
  def send_frame(pid, json) do
    send(pid, {:send, json})
    :ok
  end

  @impl true
  def close(pid) do
    send(pid, :close)
    :ok
  end
end
