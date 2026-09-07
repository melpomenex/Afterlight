defmodule AfterlightWeb.TheaterPlaylistController do
  @moduledoc false

  alias Afterlight.Catalog
  alias Afterlight.Catalog.{Errors, Model, UrlFetch}

  @list_text_max Model.list_text_max()

  def serve(conn) do
    with {:ok, body} <- read_body_capped(conn, @list_text_max),
         {:ok, name, by, text} <- parse_request(conn, body) do
      finish(conn, name, by, text)
    else
      {:error, :too_large} ->
        json(conn, 413, %{error: Errors.text("text_too_large")})

      {:error, status, payload} when is_integer(status) and is_map(payload) ->
        json(conn, status, payload)

      {:error, message} when is_binary(message) ->
        json(conn, 400, %{error: message})
    end
  rescue
    _ ->
      json(conn, 500, %{error: "The theater could not accept that upload just now."})
  end

  defp parse_request(conn, body) do
    name = blank_to_nil(conn.query_params["name"])
    by = blank_to_nil(conn.query_params["by"]) || "Someone"
    content_type = content_type(conn)

    if String.contains?(content_type, "application/json") do
      parse_json(name, by, body)
    else
      {:ok, name, by, body}
    end
  end

  defp parse_json(name, by, body) do
    with {:ok, parsed} <- Jason.decode(body) do
      target = if is_binary(parsed["url"]), do: String.trim(parsed["url"]), else: ""

      if target == "" do
        {:error, "Enter a full http(s) URL pointing at a playlist."}
      else
        uri = URI.parse(target)

        if uri.scheme not in ["http", "https"] do
          {:error, "Only http(s) playlist URLs can be fetched."}
        else
          case UrlFetch.fetch(target) do
            {:ok, text} ->
              {:ok, name || uri.host, by, text}

            {:error, message} ->
              {:error, 502, %{error: message}}
          end
        end
      end
    else
      _ -> {:error, "Malformed playlist import request."}
    end
  end

  defp finish(conn, name, by, text) do
    case Catalog.add_playlist(%{"name" => name, "text" => text, "addedBy" => by}) do
      {:ok, list} ->
        Catalog.announce_state()

        json(conn, 200, %{
          ok: true,
          list: %{
            id: list["id"],
            name: list["name"],
            channelCount: length(list["channels"] || [])
          }
        })

      {:error, reason} ->
        json(conn, 400, %{error: Errors.text(reason)})
    end
  end

  defp read_body_capped(conn, max_bytes) do
    declared =
      conn
      |> Plug.Conn.get_req_header("content-length")
      |> List.first()
      |> case do
        nil -> nil
        value -> String.to_integer(value)
      end

    if is_integer(declared) and declared > max_bytes + 16 * 1024 * 1024 do
      {:error, :too_large}
    else
      read_loop(conn, max_bytes, [])
    end
  end

  defp read_loop(conn, max_bytes, acc) do
    case Plug.Conn.read_body(conn, length: 1_048_576) do
      {:ok, body, _conn} ->
        acc = [body | acc]

        if IO.iodata_length(acc) > max_bytes do
          {:error, :too_large}
        else
          {:ok, IO.iodata_to_binary(Enum.reverse(acc))}
        end

      {:more, part, conn} ->
        acc = [part | acc]

        if IO.iodata_length(acc) > max_bytes do
          {:error, :too_large}
        else
          read_loop(conn, max_bytes, acc)
        end

      {:error, _} ->
        {:error, :too_large}
    end
  end

  defp content_type(conn) do
    conn
    |> Plug.Conn.get_req_header("content-type")
    |> List.first()
    |> case do
      nil -> ""
      value -> String.downcase(value)
    end
  end

  defp blank_to_nil(value) when is_binary(value) do
    trimmed = String.trim(value)
    if trimmed == "", do: nil, else: trimmed
  end

  defp blank_to_nil(_), do: nil

  defp json(conn, status, payload) do
    conn
    |> Plug.Conn.put_resp_content_type("application/json")
    |> Plug.Conn.send_resp(status, Jason.encode!(payload))
    |> Plug.Conn.halt()
  end
end
