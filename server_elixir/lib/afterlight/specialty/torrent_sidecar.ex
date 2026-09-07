defmodule Afterlight.Specialty.TorrentSidecar do
  @moduledoc false

  alias Afterlight.Specialty
  alias Afterlight.Specialty.CircuitBreaker

  @breaker Afterlight.Specialty.CircuitBreaker

  @doc "Resolve a magnet via the authenticated adapter HTTP endpoint."
  @spec resolve(String.t()) :: {:ok, map()} | {:error, atom()}
  def resolve(magnet) when is_binary(magnet) do
    with :ok <- CircuitBreaker.allow?(@breaker),
         {:ok, body} <- request(:post, "/api/theater/torrent/resolve", %{magnet: magnet}) do
      CircuitBreaker.record_success(@breaker)
      {:ok, body}
    else
      {:error, reason} ->
        if reason in [:transport, :sidecar_error, :timeout] do
          CircuitBreaker.record_failure(@breaker)
        end

        {:error, map_sidecar_error(reason)}
    end
  end

  @doc "Fetch swarm status snapshots for torrent_state pass-through."
  @spec status() :: {:ok, list()} | {:error, atom()}
  def status do
    with :ok <- CircuitBreaker.allow?(@breaker),
         {:ok, %{"items" => items}} <- request(:get, "/api/theater/torrent/status", nil) do
      CircuitBreaker.record_success(@breaker)
      {:ok, if(is_list(items), do: items, else: [])}
    else
      {:error, reason} ->
        if reason in [:transport, :sidecar_error, :timeout] do
          CircuitBreaker.record_failure(@breaker)
        end

        {:error, map_sidecar_error(reason)}
    end
  end

  @doc "Push the bill-derived exempt-from-reap infohash set (idempotent)."
  @spec push_exempt([String.t()]) :: :ok | {:error, atom()}
  def push_exempt(infohashes) when is_list(infohashes) do
    body = %{infohashes: Enum.map(infohashes, &to_string/1)}

    with :ok <- CircuitBreaker.allow?(@breaker),
         {:ok, _} <- request(:put, "/api/theater/torrent/exempt", body) do
      CircuitBreaker.record_success(@breaker)
      :ok
    else
      {:error, reason} ->
        if reason in [:transport, :sidecar_error, :timeout] do
          CircuitBreaker.record_failure(@breaker)
        end

        {:error, map_sidecar_error(reason)}
    end
  end

  defp map_sidecar_error(:open), do: :engine_unavailable
  defp map_sidecar_error(:timeout), do: :resolve_timeout
  defp map_sidecar_error(:invalid_magnet), do: :invalid_magnet
  defp map_sidecar_error(:engine_unavailable), do: :engine_unavailable
  defp map_sidecar_error(:resolve_timeout), do: :resolve_timeout
  defp map_sidecar_error(:resolve_failed), do: :resolve_failed
  defp map_sidecar_error(other), do: other

  defp request(method, path, body) do
    url = Specialty.sidecar_base_url() |> String.trim_trailing("/") |> Kernel.<>("/") |> Kernel.<>(String.trim_leading(path, "/"))
    timeout = Specialty.config(:resolve_timeout_ms, 50_000)

    headers =
      case Specialty.boundary_secret() do
        secret when is_binary(secret) and secret != "" ->
          [{"content-type", "application/json"}, {"x-afterlight-boundary", secret}]

        _ ->
          [{"content-type", "application/json"}]
      end

    req =
      case body do
        nil -> Finch.build(method, url, headers)
        map -> Finch.build(method, url, headers, Jason.encode!(map))
      end

    case Finch.request(req, Afterlight.Finch, receive_timeout: timeout) do
      {:ok, %{status: status, body: resp_body}} when status in 200..299 ->
        decode_json(resp_body)

      {:ok, %{status: 400, body: resp_body}} ->
        case decode_json(resp_body) do
          {:ok, %{"reason" => reason}} -> {:error, normalize_reason(reason)}
          _ -> {:error, :sidecar_error}
        end

      {:ok, %{status: 503, body: resp_body}} ->
        _ = decode_json(resp_body)
        {:error, :engine_unavailable}

      {:ok, %{status: status}} when status >= 500 ->
        {:error, :sidecar_error}

      {:ok, %{status: 403}} ->
        {:error, :sidecar_error}

      {:error, %Mint.TransportError{reason: :timeout}} ->
        {:error, :timeout}

      {:error, _} ->
        {:error, :transport}
    end
  end

  defp decode_json(body) when is_binary(body) and body != "" do
    case Jason.decode(body) do
      {:ok, map} -> {:ok, map}
      _ -> {:error, :sidecar_error}
    end
  end

  defp decode_json(_), do: {:ok, %{}}

  defp normalize_reason("invalid_magnet"), do: :invalid_magnet
  defp normalize_reason("engine_unavailable"), do: :engine_unavailable
  defp normalize_reason("resolve_timeout"), do: :resolve_timeout
  defp normalize_reason("resolve_failed"), do: :resolve_failed
  defp normalize_reason(_), do: :sidecar_error
end
