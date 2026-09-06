defmodule Afterlight.Gateway.Sessions do
  @moduledoc """
  Transient, ETS-only session registry (task 2.1; no database — durable
  `guest_sessions` rows are P4).

  Two tables:

    * `:afterlight_gateway_tokens` — issued guest token => guest_id.
      Transient bookkeeping for the credentials the gateway handed out;
      gone on restart, which is fine because verification is
      stateless (signed token) and re-issue is silent.

    * `:afterlight_gateway_proxies` — guest_id => live NodeProxy pid.
      One live transport per verified identity (design D6). A new
      session registering for an existing guest_id supersedes the old
      one: `NodeProxy.establish/3` closes the OLD upstream first and
      waits for its termination before the new session's `hello` is
      forwarded, so Node always processes a clean
      removeClient → addClient and the duplicate-guestId ghost-eviction
      quirk cannot trigger from transport reconnects.
  """

  @tokens :afterlight_gateway_tokens
  @proxies :afterlight_gateway_proxies

  @doc "Creates the registry tables if missing. Idempotent."
  @spec init() :: :ok
  def init do
    for name <- [@tokens, @proxies] do
      if :ets.whereis(name) == :undefined do
        :ets.new(name, [
          :named_table,
          :set,
          :public,
          read_concurrency: true,
          write_concurrency: true
        ])
      end
    end

    :ok
  end

  ## Issued tokens (token => guest_id)

  @spec record_token(String.t(), String.t()) :: true
  def record_token(token, guest_id) when is_binary(token) do
    :ets.insert(@tokens, {token, guest_id})
  end

  @spec lookup_token(String.t()) :: {:ok, String.t()} | :error
  def lookup_token(token) do
    case :ets.lookup(@tokens, token) do
      [{^token, guest_id}] -> {:ok, guest_id}
      [] -> :error
    end
  end

  @spec delete_token(String.t()) :: true
  def delete_token(token), do: :ets.delete(@tokens, token)

  ## Live proxies (guest_id => proxy pid)

  @doc """
  Registers `proxy_pid` as the live transport for `guest_id` and returns
  the previously registered pid (or nil). Registration is atomic; the
  CALLER owns the newest-wins handshake (close old upstream, wait for
  termination) — see `Afterlight.Gateway.NodeProxy.establish/3`.
  """
  @spec register_proxy(String.t(), pid) :: pid | nil
  def register_proxy(guest_id, proxy_pid) do
    previous =
      case :ets.lookup(@proxies, guest_id) do
        [{^guest_id, pid}] -> pid
        [] -> nil
      end

    :ets.insert(@proxies, {guest_id, proxy_pid})
    previous
  end

  @spec lookup_proxy(String.t()) :: pid | nil
  def lookup_proxy(guest_id) do
    case :ets.lookup(@proxies, guest_id) do
      [{^guest_id, pid}] -> pid
      [] -> nil
    end
  end

  @doc "Removes the mapping only if `proxy_pid` is still the registered owner."
  @spec unregister_proxy(String.t(), pid) :: :ok
  def unregister_proxy(guest_id, proxy_pid) do
    if lookup_proxy(guest_id) == proxy_pid do
      :ets.delete(@proxies, guest_id)
    end

    :ok
  end
end
