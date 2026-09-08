defmodule AfterlightWeb.TheaterMediaController do
  @moduledoc """
  Serves prepared HLS manifests and segments from the media cache.
  """

  import Plug.Conn

  alias Afterlight.TheaterMedia.Cache

  def serve(conn, prepare_id, rest) do
    if valid_id?(prepare_id) do
      rel = Enum.join(rest, "/")
      path = Path.join(Cache.job_dir(prepare_id), rel)
      root = Cache.job_dir(prepare_id)

      if safe_path?(root, path) and File.exists?(path) do
        conn
        |> put_resp_content_type(mime(rel))
        |> send_file(200, path)
      else
        conn |> put_status(404) |> send_resp(404, "not_found")
      end
    else
      conn |> put_status(400) |> send_resp(400, "invalid_id")
    end
  end

  defp valid_id?(id), do: is_binary(id) and Regex.match?(~r/^med_[a-z0-9]+$/, id)

  defp safe_path?(root, path) do
    expanded = Path.expand(path)
    String.starts_with?(expanded, Path.expand(root))
  end

  defp mime(path) do
    cond do
      String.ends_with?(path, ".m3u8") -> "application/vnd.apple.mpegurl"
      String.ends_with?(path, ".m4s") -> "video/iso.segment"
      String.ends_with?(path, ".mp4") -> "video/mp4"
      true -> "application/octet-stream"
    end
  end
end
