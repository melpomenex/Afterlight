defmodule Afterlight.Theater.YoutubePlaylist do
  @moduledoc """
  Server-side YouTube playlist resolver for The Orpheum import flow.

  Pure extraction core plus a bounded Finch fetch (15 s, 3 MiB streamed cap,
  `RESOLVE_MAX` 100). Mix ids `RD*` / `UL*` are declined at resolve time.
  """

  alias Afterlight.Theater.Reducer

  @fetch_timeout_ms 15_000
  @fetch_max_bytes 3 * 1024 * 1024
  @resolve_max Reducer.resolve_max()
  @playlist_id_re ~r/^[A-Za-z0-9_-]{12,}$/
  @video_id_re ~r/^[\w-]{6,}$/

  def fetch_timeout_ms, do: @fetch_timeout_ms
  def fetch_max_bytes, do: @fetch_max_bytes
  def resolve_max, do: @resolve_max

  def is_mix_id?(list_id) do
    list_id = to_string(list_id || "")
    String.match?(list_id, ~r/^(RD|UL)/)
  end

  def looks_like_playlist_id?(list_id) do
    is_binary(list_id) and Regex.match?(@playlist_id_re, list_id)
  end

  @doc """
  Bounded resolve of one playlist id. Returns `{:ok, %{title, videos}}` or
  `{:error, reason}` with stable reason strings.
  """
  def resolve(list_id) when is_binary(list_id) do
    cond do
      is_mix_id?(list_id) ->
        {:error, "is_mix"}

      not looks_like_playlist_id?(list_id) ->
        {:error, "playlist_unreadable"}

      true ->
        fetch_and_extract(list_id)
    end
  end

  def resolve(_), do: {:error, "playlist_unreadable"}

  @doc """
  Pure extraction: playlist HTML → `{:ok, %{title, videos}}` or `{:error, reason}`.
  """
  def extract_playlist_videos(html) when is_binary(html) do
    if String.contains?(html, "ytInitialData") do
      case parse_yt_initial_data(html) do
        :error ->
          {:error, "playlist_unreadable"}

        {:ok, data} ->
          case collect_videos(data) do
            [] -> {:error, "playlist_not_public"}
            videos -> {:ok, %{title: playlist_title(data) || "A YouTube playlist", videos: videos}}
          end
      end
    else
      {:error, "playlist_unreadable"}
    end
  end

  def extract_playlist_videos(_), do: {:error, "playlist_unreadable"}

  defp fetch_and_extract(list_id) do
    url = "https://www.youtube.com/playlist?list=#{URI.encode_www_form(list_id)}&hl=en"

    headers = [
      {"accept-language", "en"},
      {"cookie", "CONSENT=YES+cb; SOCS=CAI"}
    ]

    request = Finch.build(:get, url, headers)

    task =
      Task.async(fn ->
        Finch.request(request, Afterlight.Finch, receive_timeout: @fetch_timeout_ms)
      end)

    try do
      case Task.await(task, @fetch_timeout_ms + 1_000) do
        {:ok, %{status: status}} when status in [403, 404] ->
          {:error, "playlist_not_public"}

        {:ok, %{status: status, headers: resp_headers, body: body}} when status in 200..299 ->
          declared =
            resp_headers
            |> Enum.find_value(fn
              {"content-length", v} -> parse_int(v)
              {_, _} -> nil
            end)

          if is_integer(declared) and declared > @fetch_max_bytes do
            {:error, "playlist_unreadable"}
          else
            read_body(body)
          end

        {:ok, %{status: _}} ->
          {:error, "playlist_unreadable"}

        {:error, _} ->
          {:error, "playlist_unreadable"}
      end
    catch
      :exit, _ -> {:error, "playlist_unreadable"}
    end
  end

  defp read_body(body) when is_binary(body) do
    if byte_size(body) > @fetch_max_bytes do
      {:error, "playlist_unreadable"}
    else
      extract_playlist_videos(body)
    end
  end

  defp read_body({:stream, stream}) do
    stream
    |> Enum.reduce_while({:ok, []}, fn chunk, {:ok, acc} ->
      size = Enum.reduce(acc, byte_size(chunk), fn c, n -> n + byte_size(c) end)

      if size > @fetch_max_bytes do
        {:halt, {:error, "playlist_unreadable"}}
      else
        {:cont, {:ok, [chunk | acc]}}
      end
    end)
    |> case do
      {:ok, chunks} -> extract_playlist_videos(IO.iodata_to_binary(Enum.reverse(chunks)))
      {:error, reason} -> {:error, reason}
    end
  end

  defp read_body(_), do: {:error, "playlist_unreadable"}

  defp parse_int(v) when is_binary(v) do
    case Integer.parse(v) do
      {n, _} -> n
      :error -> nil
    end
  end

  defp parse_int(_), do: nil

  defp parse_yt_initial_data(html) do
    case :binary.match(html, "ytInitialData") do
      :nomatch ->
        :error

      {marker, _} ->
        <<_::binary-size(marker), after_marker::binary>> = html

        case :binary.match(after_marker, "{") do
          :nomatch ->
            :error

          {open, _} ->
            <<_::binary-size(open), json::binary>> = after_marker
            scan_json(json, 0, false, false, [])
        end
    end
  end

  defp scan_json(<<>>, _depth, _in_string, _escaped, _acc), do: :error

  defp scan_json(<<ch, rest::binary>>, depth, in_string, escaped, acc) do
    cond do
      in_string ->
        cond do
          escaped -> scan_json(rest, depth, true, false, [ch | acc])
          ch == ?\\ -> scan_json(rest, depth, true, true, [ch | acc])
          ch == ?" -> scan_json(rest, depth, false, false, [ch | acc])
          true -> scan_json(rest, depth, true, false, [ch | acc])
        end

      ch == ?" ->
        scan_json(rest, depth, true, false, [ch | acc])

      ch == ?{ ->
        scan_json(rest, depth + 1, false, false, [ch | acc])

      ch == ?} ->
        if depth == 1 do
          json = IO.iodata_to_binary(Enum.reverse(["}" | acc]))

          case Jason.decode(json) do
            {:ok, data} -> {:ok, data}
            _ -> :error
          end
        else
          scan_json(rest, depth - 1, false, false, [ch | acc])
        end

      true ->
        scan_json(rest, depth, false, false, [ch | acc])
    end
  end

  defp playlist_title(data) do
    title =
      get_in(data, ["metadata", "playlistMetadataRenderer", "title"]) ||
        get_in(data, ["microformat", "microformatDataRenderer", "title"]) ||
        get_in(data, ["header", "playlistHeaderRenderer", "title"])

    text =
      cond do
        is_binary(title) -> title
        is_list(get_in(title || %{}, ["runs"])) ->
          title["runs"]
          |> Enum.map(&to_string(Map.get(&1 || %{}, "text")))
          |> Enum.join("")

        is_map(title) -> title["simpleText"]
        true -> nil
      end

    if is_binary(text), do: String.trim(text), else: nil
  end

  defp video_from_node(%{"playlistVideoRenderer" => r}) when is_map(r) do
    with video_id when is_binary(video_id) <- r["videoId"],
         true <- Regex.match?(@video_id_re, video_id) do
      title =
        cond do
          is_list(get_in(r, ["title", "runs"])) ->
            r["title"]["runs"]
            |> Enum.map(&to_string(Map.get(&1 || %{}, "text")))
            |> Enum.join("")

          is_binary(get_in(r, ["title", "simpleText"])) ->
            r["title"]["simpleText"]

          true ->
            ""
        end

      %{"videoId" => video_id, "title" => if(is_binary(title), do: String.trim(title), else: "")}
    else
      _ -> nil
    end
  end

  defp video_from_node(%{"lockupViewModel" => l}) when is_map(l) do
    if is_binary(l["contentType"]) and l["contentType"] != "LOCKUP_CONTENT_TYPE_VIDEO" do
      nil
    else
      with video_id when is_binary(video_id) <- l["contentId"],
           true <- Regex.match?(@video_id_re, video_id) do
        title = get_in(l, ["metadata", "lockupMetadataViewModel", "title", "content"])
        %{"videoId" => video_id, "title" => if(is_binary(title), do: String.trim(title), else: "")}
      else
        _ -> nil
      end
    end
  end

  defp video_from_node(_), do: nil

  defp collect_videos(data) do
    %{videos: videos} = visit(data, %{videos: [], seen: MapSet.new()})
    videos
  end

  defp visit(node, acc) when is_list(node), do: Enum.reduce(node, acc, &visit(&1, &2))

  defp visit(node, acc) when is_map(node) do
    if length(acc.videos) >= @resolve_max do
      acc
    else
      case video_from_node(node) do
        %{"videoId" => video_id} = video ->
          if MapSet.member?(acc.seen, video_id) do
            acc
          else
            %{
              videos: acc.videos ++ [video],
              seen: MapSet.put(acc.seen, video_id)
            }
          end

        nil ->
          node
          |> Enum.sort_by(fn {k, _v} -> to_string(k) end)
          |> Enum.reduce(acc, fn {_k, v}, a -> visit(v, a) end)
      end
    end
  end

  defp visit(_node, acc), do: acc
end
