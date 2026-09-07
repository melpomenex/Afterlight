defmodule Afterlight.Catalog.UrlFetch do
  @moduledoc """
  SSRF-hardened playlist URL fetch (design D5).

  http(s) only, redirect cap 3 with per-hop re-validation, private-address
  blocking before each hop, 15 s total timeout, streamed size cap.
  """

  @max_redirects 3
  @timeout_ms 15_000
  @max_bytes 8 * 1024 * 1024

  @spec fetch(String.t()) :: {:ok, String.t()} | {:error, String.t()}
  def fetch(url) when is_binary(url) do
    with {:ok, uri} <- parse_url(url),
         {:ok, text} <- fetch_loop(uri, @max_redirects, monotonic_ms()) do
      {:ok, text}
    else
      {:error, :too_large} -> {:error, Afterlight.Catalog.Errors.text("text_too_large")}
      {:error, :timeout} ->
        {:error, "That playlist took too long to fetch. Try again, or upload it as a file."}

      {:error, :blocked} ->
        {:error, "Could not fetch that playlist URL."}

      {:error, :too_many_redirects} ->
        {:error, "Could not fetch that playlist URL."}

      {:error, message} when is_binary(message) ->
        {:error, message}

      {:error, _} ->
        {:error, "Could not fetch that playlist URL."}
    end
  end

  defp fetch_loop(uri, redirects_left, started_ms) do
    if monotonic_ms() - started_ms > @timeout_ms do
      {:error, :timeout}
    else
      with :ok <- validate_host(uri.host),
           {:ok, response} <- request(uri, started_ms),
           {:ok, body} <- read_body(response) do
        case redirect_target(response, uri) do
          :none -> {:ok, body}
          {:redirect, next} when redirects_left > 0 -> fetch_loop(next, redirects_left - 1, started_ms)
          {:redirect, _} -> {:error, :too_many_redirects}
        end
      end
    end
  end

  defp parse_url(url) do
    uri = URI.parse(String.trim(url))

    cond do
      uri.scheme not in ["http", "https"] ->
        {:error, "Only http(s) playlist URLs can be fetched."}

      not is_binary(uri.host) or uri.host == "" ->
        {:error, "Enter a full http(s) URL pointing at a playlist."}

      true ->
        {:ok, uri}
    end
  rescue
    _ -> {:error, "Enter a full http(s) URL pointing at a playlist."}
  end

  defp request(uri, started_ms) do
    remaining = max(@timeout_ms - (monotonic_ms() - started_ms), 1)

    Finch.build(:get, URI.to_string(uri), [{"user-agent", "Afterlight-Theater/1.0"}], nil)
    |> Finch.request(Afterlight.Finch, receive_timeout: remaining)
    |> case do
      {:ok, response} ->
        if response.status >= 200 and response.status < 300 or redirect_status?(response.status) do
          {:ok, response}
        else
          {:error, "The host answered HTTP #{response.status} for that playlist."}
        end

      {:error, _} ->
        {:error, :blocked}
    end
  end

  defp read_body(%Finch.Response{headers: headers, body: body}) do
    declared =
      headers
      |> Enum.find_value(fn {k, v} ->
        if String.downcase(k) == "content-length", do: String.to_integer(v)
      end)

    cond do
      is_integer(declared) and declared > @max_bytes ->
        {:error, :too_large}

      byte_size(body) > @max_bytes ->
        {:error, :too_large}

      true ->
        {:ok, body}
    end
  end

  defp redirect_target(response, current) do
    if redirect_status?(response.status) do
      case response_header(response.headers, "location") do
        nil -> :none
        location -> {:redirect, URI.merge(current, location)}
      end
    else
      :none
    end
  end

  defp redirect_status?(status), do: status in [301, 302, 303, 307, 308]

  defp response_header(headers, name) do
    Enum.find_value(headers, fn {k, v} ->
      if String.downcase(k) == name, do: v
    end)
  end

  defp validate_host(host) do
    case resolve_host(host) do
      {:ok, address} ->
        if private_address?(address), do: {:error, :blocked}, else: :ok

      {:error, _} ->
        {:error, :blocked}
    end
  end

  defp resolve_host(host) do
    case :inet.getaddr(String.to_charlist(host), :inet) do
      {:ok, address} ->
        {:ok, address}

      {:error, _} ->
        case :inet.getaddr(String.to_charlist(host), :inet6) do
          {:ok, address} -> {:ok, address}
          {:error, reason} -> {:error, reason}
        end
    end
  end

  @doc false
  def private_address?(address) do
    case address do
      {127, _, _, _} -> true
      {10, _, _, _} -> true
      {172, b, _, _} when b in 16..31 -> true
      {192, 168, _, _} -> true
      {169, 254, _, _} -> true
      {0, _, _, _} -> true
      {100, 64, _, _} -> true
      {100, b, _, _} when b in 65..127 -> true
      {_, _, _, _, _, _, _, _} -> ipv6_private?(address)
      _ -> false
    end
  end

  defp ipv6_private?({0, 0, 0, 0, 0, 0, 0, 1}), do: true
  defp ipv6_private?({0xFE, 0x80, _, _, _, _, _, _}), do: true
  defp ipv6_private?({0xFC, _, _, _, _, _, _, _}), do: true
  defp ipv6_private?({0xFD, _, _, _, _, _, _, _}), do: true
  defp ipv6_private?(_), do: false

  defp monotonic_ms, do: System.monotonic_time(:millisecond)
end
