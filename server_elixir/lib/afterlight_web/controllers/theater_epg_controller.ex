defmodule AfterlightWeb.TheaterEpgController do
  @moduledoc false

  alias Afterlight.Catalog
  alias Afterlight.Catalog.{Model, XMLTV}

  @epg_file_max 64 * 1024 * 1024

  def serve(conn) do
    with {:ok, body} <- read_body_capped(conn, @epg_file_max),
         {:ok, text} <- decode_body(body),
         {:ok, parsed} <- parse_guide(text),
         {:ok, summary} <- persist(conn, parsed) do
      json(conn, 200, %{
        ok: true,
        epg: summary,
        skipped: parsed["skipped"],
        truncated: parsed["truncated"]
      })
    else
      {:error, :too_large} ->
        json(conn, 413, %{error: "That guide file is too large for the theater archive."})

      {:error, message} when is_binary(message) ->
        json(conn, 400, %{error: message})

      {:error, :persist_failed} ->
        json(conn, 500, %{error: "The guide could not be saved just now."})
    end
  rescue
    _ ->
      json(conn, 500, %{error: "The theater could not accept that upload just now."})
  end

  defp gunzip_capped(data, max) do
    try do
      text = :zlib.gunzip(data)

      if byte_size(text) > max do
        {:error, :too_large}
      else
        {:ok, text}
      end
    rescue
      _ -> {:error, :gunzip}
    end
  end

  defp decode_body(body) do
    if byte_size(body) >= 2 and :binary.at(body, 0) == 0x1F and :binary.at(body, 1) == 0x8B do
      case gunzip_capped(body, @epg_file_max) do
        {:ok, text} -> {:ok, text}
        {:error, _} -> {:error, "That gzip guide could not be unpacked."}
      end
    else
      {:ok, body}
    end
  end

  defp parse_guide(text) do
    parsed =
      XMLTV.parse_xmltv(text,
        max_channels: Model.epg_channels_max(),
        max_programmes: Model.epg_programmes_max()
      )

    if parsed["recognized"] do
      {:ok, parsed}
    else
      {:error, "That file does not look like an XMLTV program guide (.epg / .xml)."}
    end
  end

  defp persist(conn, parsed) do
    name = blank_to_nil(conn.query_params["name"]) || "Program guide"

    case Catalog.set_epg(%{
           name: name,
           channels: parsed["channels"],
           programmes: parsed["programmes"]
         }) do
      {:ok, summary} ->
        Catalog.announce_state()
        {:ok, summary}

      {:error, "persist_failed"} ->
        {:error, :persist_failed}

      {:error, _} ->
        {:error, :persist_failed}
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
