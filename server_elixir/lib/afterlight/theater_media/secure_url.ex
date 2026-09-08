defmodule Afterlight.TheaterMedia.SecureUrl do
  @moduledoc """
  SSRF-safe URL validation for media probe input (HEAD only).
  """

  alias Afterlight.Catalog.UrlFetch

  @max_redirects 3
  @timeout_ms 15_000

  @spec validate(String.t()) :: :ok | {:error, atom()}
  def validate(url) when is_binary(url) do
    with {:ok, uri} <- parse(url),
         {:ok, final} <- head_loop(uri, @max_redirects, monotonic_ms()) do
      if UrlFetch.private_address?(final.host_address) do
        {:error, :blocked}
      else
        :ok
      end
    end
  end

  defp parse(url) do
    uri = URI.parse(String.trim(url))

    cond do
      uri.scheme not in ["http", "https"] -> {:error, :blocked}
      not is_binary(uri.host) or uri.host == "" -> {:error, :blocked}
      true -> {:ok, uri}
    end
  rescue
    _ -> {:error, :blocked}
  end

  defp head_loop(uri, redirects_left, started_ms) do
    if monotonic_ms() - started_ms > @timeout_ms do
      {:error, :unreachable}
    else
      with :ok <- validate_host(uri.host),
           {:ok, response} <- head(uri, started_ms) do
        case redirect_target(response, uri) do
          :none ->
            case resolve_host(uri.host) do
              {:error, _} -> {:error, :blocked}
              addr -> {:ok, %{host_address: addr}}
            end

          {:redirect, next} when redirects_left > 0 ->
            head_loop(next, redirects_left - 1, started_ms)

          {:redirect, _} ->
            {:error, :blocked}
        end
      end
    end
  end

  defp validate_host(host) do
    case resolve_host(host) do
      {:error, _} ->
        {:error, :blocked}

      addr when is_tuple(addr) ->
        if UrlFetch.private_address?(addr), do: {:error, :blocked}, else: :ok
    end
  end

  defp head(uri, started_ms) do
    remaining = max(@timeout_ms - (monotonic_ms() - started_ms), 1)

    Finch.build(:head, URI.to_string(uri), [{"user-agent", "Afterlight-Theater/1.0"}], nil)
    |> Finch.request(Afterlight.Finch, receive_timeout: remaining)
    |> case do
      {:ok, response} when response.status in 200..399 -> {:ok, response}
      {:ok, %{status: status}} when status in [401, 403] -> {:error, :auth_required}
      {:ok, %{status: status}} when status >= 400 -> {:error, :host_rejected}
      {:error, _} -> {:error, :unreachable}
    end
  end

  defp redirect_target(response, current) do
    if response.status in [301, 302, 303, 307, 308] do
      case response_header(response.headers, "location") do
        nil -> :none
        location -> {:redirect, URI.merge(current, location)}
      end
    else
      :none
    end
  end

  defp response_header(headers, name) do
    Enum.find_value(headers, fn {k, v} ->
      if String.downcase(k) == name, do: v
    end)
  end

  defp resolve_host(host) do
    case :inet.getaddr(String.to_charlist(host), :inet) do
      {:ok, address} -> address
      {:error, _} ->
        case :inet.getaddr(String.to_charlist(host), :inet6) do
          {:ok, address} -> address
          {:error, reason} -> {:error, reason}
        end
    end
  end

  defp monotonic_ms, do: System.monotonic_time(:millisecond)
end
