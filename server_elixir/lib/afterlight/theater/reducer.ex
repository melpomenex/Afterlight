defmodule Afterlight.Theater.Reducer do
  @moduledoc """
  Pure model and reducer for the shared theater screen (The Orpheum).

  Ported 1:1 from shared/theaterModel.js. Side-effect free; all mutations
  flow state-in → state-out with deterministic error reporting.
  """

  @url_max 2048
  @title_max 120
  @queue_max 50
  @resolve_max 100
  @name_max 40

  @youtube_hosts MapSet.new([
                   "youtube.com",
                   "www.youtube.com",
                   "m.youtube.com",
                   "music.youtube.com",
                   "youtube-nocookie.com",
                   "www.youtube-nocookie.com",
                   "youtu.be",
                   "www.youtu.be"
                 ])

  @vimeo_hosts MapSet.new(["vimeo.com", "www.vimeo.com", "player.vimeo.com"])

  @video_ext_re ~r/\.(mp4|webm|m4v|mov|ogv|ogg|mkv|avi|wmv|flv|ts|m2ts)$/i
  @http_url_re ~r{\Ahttps?://}i
  # JS \s = [\f\n\r\t\v\u0020\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]
  @ws_re ~r/[\s\x{00A0}\x{1680}\x{2000}-\x{200A}\x{2028}\x{2029}\x{202F}\x{205F}\x{3000}\x{FEFF}]+/u

  # Torrent format regexes and limits
  @hex_re ~r/\A[0-9a-fA-F]{40}\z/
  @base32_re ~r/\A[A-Z2-7]{32}\z/
  @base32_alphabet "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
  @path_max 512
  @video_file_exts MapSet.new([
                     "mp4",
                     "m4v",
                     "webm",
                     "mov",
                     "ogv",
                     "ogg",
                     "mkv",
                     "avi"
                   ])

  # -- public API --------------------------------------------------------------

  def url_max, do: @url_max
  def title_max, do: @title_max
  def queue_max, do: @queue_max
  def resolve_max, do: @resolve_max
  def name_max, do: @name_max

  def create_state, do: %{"now" => nil, "queue" => []}

  @doc """
  Generates a deterministic or random item id in the format `itm_<now36>_<seq36>`.
  """
  def new_item_id(now_ms \\ nil, seq_or_seed \\ nil) do
    now_ms = now_ms || System.system_time(:millisecond)

    seq =
      case seq_or_seed do
        nil ->
          case Process.get(:parity_theater_id_seq) do
            nil ->
              :crypto.strong_rand_bytes(4)
              |> :binary.bin_to_list()
              |> Enum.map(fn b -> rem(b, 36) end)
              |> Enum.map(&base36_digit/1)
              |> List.to_string()

            current ->
              Process.put(:parity_theater_id_seq, current + 1)
              base36(current)
          end

        seq when is_integer(seq) ->
          base36(seq)

        str when is_binary(str) ->
          ascii_downcase(str)
      end

    "itm_" <> base36(now_ms) <> "_" <> seq
  end

  def default_title("youtube"), do: "A YouTube video"
  def default_title("vimeo"), do: "A Vimeo video"
  def default_title("hls"), do: "Live channel"
  def default_title("file"), do: "A video link"
  def default_title("torrent"), do: "A torrent stream"
  def default_title(_kind), do: "Something to watch"

  def clean_text(value, max \\ @title_max)

  def clean_text(value, max) when is_binary(value) do
    Regex.replace(@ws_re, value, " ")
    |> String.trim()
    |> utf16_truncate(max)
  end

  def clean_text(_value, _max), do: ""

  def utf16_truncate(value, max) when is_binary(value) do
    utf16 = :unicode.characters_to_binary(value, :utf8, {:utf16, :big})
    units = div(byte_size(utf16), 2) |> min(max)
    truncated = binary_part(utf16, 0, units * 2)
    :unicode.characters_to_binary(truncated, {:utf16, :big}, :utf8)
  end

  def utf16_length(value) when is_binary(value) do
    value
    |> :unicode.characters_to_binary(:utf8, {:utf16, :big})
    |> byte_size()
    |> div(2)
  end

  def utf16_length(_), do: 0

  # -- classifySource ---------------------------------------------------------

  def classify_source(raw_url) when not is_binary(raw_url), do: nil

  def classify_source(raw_url) do
    case classify_internal(raw_url) do
      nil ->
        nil

      %{kind: "torrent", url: url, infohash: infohash} ->
        %{"kind" => "torrent", "url" => url, "infohash" => infohash}

      %{kind: "youtube", url: url, video_id: video_id} = c ->
        base = %{"kind" => "youtube", "url" => url, "videoId" => video_id}
        if Map.has_key?(c, :list_id), do: Map.put(base, "listId", c.list_id), else: base

      %{kind: "youtubePlaylist", url: url, list_id: list_id} ->
        %{"kind" => "youtubePlaylist", "url" => url, "listId" => list_id}

      %{kind: "vimeo", url: url, video_id: video_id} ->
        %{"kind" => "vimeo", "url" => url, "videoId" => video_id}

      %{kind: "file", url: url, needs_prepare: needs} ->
        %{"kind" => "file", "url" => url, "needsPrepare" => needs}

      %{kind: other, url: url} ->
        %{"kind" => other, "url" => url}
    end
  end

  def classify_internal(raw_url) when not is_binary(raw_url), do: nil

  def classify_internal(raw_url) do
    url = String.trim(raw_url)

    if url == "" or utf16_length(url) > @url_max do
      nil
    else
      case whatwg_parse(url) do
        :error -> nil
        {:ok, scheme, host, path, params} -> classify_parsed(url, scheme, host, path, params)
      end
    end
  end

  defp classify_parsed(url, scheme, host, path, params) do
    case parse_magnet(url) do
      %{kind: "torrent"} = classified ->
        classified

      nil ->
        if scheme in ["http", "https"] do
          cond do
            MapSet.member?(@youtube_hosts, host) -> classify_youtube(url, host, path, params)
            MapSet.member?(@vimeo_hosts, host) -> classify_vimeo(url, path)
            String.ends_with?(String.downcase(path), ".m3u8") -> %{kind: "hls", url: url}
            Regex.match?(@video_ext_re, path) ->
              %{kind: "file", url: url, needs_prepare: extension_needs_prepare?(url)}
            true -> nil
          end
        else
          nil
        end
    end
  end

  # -- effectivePositionSec ----------------------------------------------------

  def effective_position_sec(nil, _now_ms), do: 0

  def effective_position_sec(now, now_ms) when is_map(now) do
    if js_falsy(Map.get(now, "playing")) do
      Map.get(now, "positionSec")
    else
      delta =
        case Map.get(now, "updatedAt") do
          updated when is_number(updated) and is_number(now_ms) -> (now_ms - updated) / 1000
          _ -> :nan
        end

      add_delta(Map.get(now, "positionSec"), delta)
    end
  end

  def effective_position_sec(_other, _now_ms), do: 0

  defp add_delta(_pos, :nan), do: :nan

  defp add_delta(pos, delta) when is_number(pos) and is_number(delta) do
    pos + max(0, delta)
  end

  defp add_delta(_pos, _delta), do: :nan

  # -- applyTheaterAction ------------------------------------------------------

  def apply_action(prev, action, actor \\ nil, now_ms \\ nil)

  def apply_action(prev, action, opts, nil) when is_list(opts) do
    actor = Keyword.get(opts, :actor)
    now_ms = Keyword.get(opts, :now_ms, System.system_time(:millisecond))
    apply_action(prev, action, actor, now_ms)
  end

  def apply_action(prev, action, actor, now_ms) do
    now_ms = now_ms || System.system_time(:millisecond)
    now = if is_map(prev), do: Map.get(prev, "now"), else: nil

    queue =
      if is_map(prev) and is_list(Map.get(prev, "queue")), do: Map.get(prev, "queue"), else: []

    op = if is_map(action), do: Map.get(action, "op")

    if is_binary(op) do
      run_op(op, now, queue, action, actor, now_ms)
    else
      error("invalid_action")
    end
  end

  defp ok(state), do: %{"state" => state, "error" => nil}
  defp error(reason), do: %{"state" => nil, "error" => reason}

  defp run_op("add", now, queue, action, actor, now_ms) do
    case classify_internal(Map.get(action, "url")) do
      nil ->
        error("invalid_url")

      %{kind: "youtubePlaylist"} ->
        error("use_import")

      classified ->
        with_pick(classified, action, fn pick ->
          item = make_item(classified, Map.get(action, "title"), actor, now_ms, pick)

          if is_map(now) do
            if length(queue) >= @queue_max do
              error("queue_full")
            else
              ok(%{"now" => now, "queue" => queue ++ [item]})
            end
          else
            ok(%{"now" => start_now(item, actor, now_ms), "queue" => queue})
          end
        end)
    end
  end

  defp run_op("addMany", now, queue, action, actor, now_ms) do
    items = if is_map(action), do: Map.get(action, "items")

    if not is_list(items) or items == [] or length(items) > @resolve_max do
      error("invalid_action")
    else
      {now3, queue3, queued, skipped, did_not_fit} =
        Enum.reduce(items, {now, queue, 0, 0, 0}, fn entry, acc ->
          {now, queue, queued, skipped, did_not_fit} = acc
          classified = classify_internal(entry_field(entry, "url"))

          cond do
            is_nil(classified) or classified.kind == "youtubePlaylist" ->
              {now, queue, queued, skipped + 1, did_not_fit}

            not is_map(now) ->
              item = make_item(classified, entry_field(entry, "title"), actor, now_ms, nil)
              {start_now(item, actor, now_ms), queue, queued + 1, skipped, did_not_fit}

            length(queue) >= @queue_max ->
              {now, queue, queued, skipped, did_not_fit + 1}

            true ->
              item = make_item(classified, entry_field(entry, "title"), actor, now_ms, nil)
              {now, queue ++ [item], queued + 1, skipped, did_not_fit}
          end
        end)

      if queued == 0 do
        error(if did_not_fit > 0, do: "queue_full", else: "invalid_action")
      else
        %{
          "state" => %{"now" => now3, "queue" => queue3},
          "error" => nil,
          "report" => %{"queued" => queued, "skipped" => skipped, "didNotFit" => did_not_fit}
        }
      end
    end
  end

  defp run_op("remove", now, queue, action, _actor, now_ms) do
    item_id = Map.get(action, "itemId")

    if js_falsy(item_id) do
      error("item_not_found")
    else
      if is_map(now) and Map.get(now, "id") == item_id do
        case queue do
          [] ->
            ok(%{"now" => nil, "queue" => []})

          [head | tail] ->
            ok(%{"now" => start_now(head, Map.get(head, "queuedBy"), now_ms), "queue" => tail})
        end
      else
        case Enum.split_with(queue, fn item -> Map.get(item, "id") == item_id end) do
          {[], _} ->
            error("item_not_found")

          {_, remaining} ->
            ok(%{"now" => now, "queue" => remaining})
        end
      end
    end
  end

  defp run_op("playNow", now, queue, action, actor, now_ms) do
    item_id = Map.get(action, "itemId")

    if js_falsy(item_id) do
      error("item_not_found")
    else
      if is_map(now) and Map.get(now, "id") == item_id do
        ok(%{"now" => now, "queue" => queue})
      else
        idx = Enum.find_index(queue, fn item -> Map.get(item, "id") == item_id end)

        if is_nil(idx) do
          error("item_not_found")
        else
          {chosen, rest} = List.pop_at(queue, idx)
          queue2 = if is_map(now), do: [current_as_queue_item(now) | rest], else: rest

          ok(%{
            "now" => start_now(chosen, actor, now_ms),
            "queue" => queue2
          })
        end
      end
    end
  end

  defp run_op("clear", _now, _queue, _action, _actor, _now_ms) do
    ok(%{"now" => nil, "queue" => []})
  end

  defp run_op("play", now, queue, action, actor, now_ms) do
    if not is_map(now) do
      error("nothing_playing")
    else
      item_id = if is_map(action), do: Map.get(action, "itemId")

      if is_binary(item_id) and item_id != "" and item_id != Map.get(now, "id") do
        error("item_mismatch")
      else
        if Map.get(now, "playing") == true do
          ok(%{"now" => now, "queue" => queue})
        else
          actor_name = clean_or(actor, @name_max, Map.get(now, "by", "Someone"))

          ok(%{
            "now" =>
              Map.merge(now, %{
                "playing" => true,
                "updatedAt" => now_ms,
                "by" => actor_name
              }),
            "queue" => queue
          })
        end
      end
    end
  end

  defp run_op("pause", now, queue, action, actor, now_ms) do
    if not is_map(now) do
      error("nothing_playing")
    else
      item_id = if is_map(action), do: Map.get(action, "itemId")

      if is_binary(item_id) and item_id != "" and item_id != Map.get(now, "id") do
        error("item_mismatch")
      else
        pos = effective_position_sec(now, now_ms)
        actor_name = clean_or(actor, @name_max, Map.get(now, "by", "Someone"))

        ok(%{
          "now" =>
            Map.merge(now, %{
              "playing" => false,
              "positionSec" => pos,
              "updatedAt" => now_ms,
              "by" => actor_name
            }),
          "queue" => queue
        })
      end
    end
  end

  defp run_op("seek", now, queue, action, actor, now_ms) do
    if not is_map(now) do
      error("nothing_playing")
    else
      item_id = if is_map(action), do: Map.get(action, "itemId")

      if is_binary(item_id) and item_id != "" and item_id != Map.get(now, "id") do
        error("item_mismatch")
      else
        if Map.get(now, "kind") == "hls" and is_nil(Map.get(now, "playbackUrl")) do
          error("seek_unsupported")
        else
          pos = js_to_number(Map.get(action, "positionSec", :absent))

          if pos == :nan or not is_number(pos) do
            error("invalid_position")
          else
            clamped_pos = max(0, pos)
            actor_name = clean_or(actor, @name_max, Map.get(now, "by", "Someone"))

            ok(%{
              "now" =>
                Map.merge(now, %{
                  "positionSec" => clamped_pos,
                  "updatedAt" => now_ms,
                  "by" => actor_name
                }),
              "queue" => queue
            })
          end
        end
      end
    end
  end

  defp run_op("skip", now, queue, _action, _actor, now_ms) do
    if not is_map(now) do
      error("nothing_playing")
    else
      case queue do
        [] ->
          ok(%{"now" => nil, "queue" => []})

        [head | tail] ->
          ok(%{
            "now" => start_now(head, Map.get(head, "queuedBy"), now_ms),
            "queue" => tail
          })
      end
    end
  end

  defp run_op("resume", now, queue, action, actor, now_ms) do
    if not is_map(now) do
      error("nothing_playing")
    else
      run_op("play", now, queue, action, actor, now_ms)
    end
  end

  defp run_op("ended", now, queue, action, _actor, now_ms) do
    if not is_map(now) do
      error("nothing_playing")
    else
      if Map.get(action, "itemId") != Map.get(now, "id") do
        error("item_mismatch")
      else
        case queue do
          [] ->
            ok(%{"now" => nil, "queue" => []})

          [head | tail] ->
            ok(%{"now" => start_now(head, Map.get(head, "queuedBy"), now_ms), "queue" => tail})
        end
      end
    end
  end

  defp run_op("failed", now, queue, action, _actor, now_ms) do
    run_op("ended", now, queue, action, nil, now_ms)
  end

  defp run_op("channel", _now, queue, action, actor, now_ms) do
    case classify_internal(Map.get(action, "url")) do
      nil ->
        error("invalid_url")

      %{kind: "youtubePlaylist"} ->
        error("use_import")

      classified ->
        with_pick(classified, action, fn pick ->
          item = make_item(classified, Map.get(action, "title"), actor, now_ms, pick)

          ok(%{
            "now" => start_now(item, actor, now_ms),
            "queue" => queue
          })
        end)
    end
  end

  defp run_op(_unknown, _now, _queue, _action, _actor, _now_ms) do
    error("invalid_action")
  end

  # -- normalizeTheaterState ------------------------------------------------------

  def normalize_state(raw, now_ms \\ nil)

  def normalize_state(raw, now_ms) when is_map(raw) do
    now_ms = now_ms || System.system_time(:millisecond)

    now =
      case Map.get(raw, "now") do
        raw_now when is_map(raw_now) -> normalize_now(raw_now, now_ms)
        _ -> nil
      end

    queue =
      case Map.get(raw, "queue") do
        entries when is_list(entries) ->
          Enum.reduce_while(entries, [], fn entry, acc ->
            if length(acc) >= @queue_max do
              {:halt, acc}
            else
              {:cont, normalize_entry(entry, now_ms, acc)}
            end
          end)

        _ ->
          []
      end

    %{"now" => now, "queue" => queue}
  end

  def normalize_state(_raw, _now_ms), do: %{"now" => nil, "queue" => []}

  defp normalize_now(raw_now, now_ms) do
    classified = classify_internal(Map.get(raw_now, "url"))

    pick =
      cond do
        is_nil(classified) or classified.kind == "youtubePlaylist" -> :invalid
        true -> pick_for(raw_now, classified)
      end

    if pick == :invalid do
      nil
    else
      %{
        "id" => id_of(raw_now, now_ms),
        "kind" => classified.kind,
        "url" => classified.url,
        "videoId" => Map.get(classified, :video_id),
        "title" => clean_or(Map.get(raw_now, "title"), @title_max, default_title(classified.kind))
      }
      |> Map.merge(pick)
      |> Map.merge(%{
        "playing" => Map.get(raw_now, "playing") != false,
        "positionSec" =>
          nonneg_number_or(js_to_number(Map.get(raw_now, "positionSec", :absent))),
        "updatedAt" =>
          finite_number_or(js_to_number(Map.get(raw_now, "updatedAt", :absent)), now_ms),
        "by" => clean_or(Map.get(raw_now, "by"), @name_max, "Someone"),
        "queuedBy" => clean_or(Map.get(raw_now, "queuedBy"), @name_max, "Someone")
      })
    end
  end

  defp normalize_entry(entry, now_ms, acc) when is_map(entry) do
    classified = classify_internal(Map.get(entry, "url"))

    if is_nil(classified) or classified.kind == "youtubePlaylist" do
      acc
    else
      case pick_for(entry, classified) do
        :invalid ->
          acc

        pick ->
          item =
            %{
              "id" => id_of(entry, now_ms),
              "kind" => classified.kind,
              "url" => classified.url,
              "videoId" => Map.get(classified, :video_id),
              "title" =>
                clean_or(Map.get(entry, "title"), @title_max, default_title(classified.kind))
            }
            |> Map.merge(pick)
            |> Map.merge(%{
              "queuedBy" => clean_or(Map.get(entry, "queuedBy"), @name_max, "Someone")
            })

          acc ++ [item]
      end
    end
  end

  defp normalize_entry(_entry, _now_ms, acc), do: acc

  # -- parseM3U -----------------------------------------------------------------

  def parse_m3u(text) when not is_binary(text),
    do: %{"entries" => [], "skipped" => 0, "recognized" => false}

  def parse_m3u(text) do
    if String.trim(text) == "" do
      %{"entries" => [], "skipped" => 0, "recognized" => false}
    else
      text
      |> String.split(~r/\r?\n/)
      |> Enum.reduce({[], 0, false, nil, 0}, fn raw_line, acc ->
        {entries, skipped, recognized, pending, idx} = acc
        line = String.trim(raw_line)

        cond do
          line == "" ->
            acc

          String.starts_with?(String.upcase(line), "#EXTM3U") ->
            {entries, skipped, true, pending, idx}

          String.starts_with?(line, "#") ->
            pending2 =
              if String.starts_with?(String.upcase(line), "#EXTINF") do
                parse_extinf(line)
              else
                pending
              end

            {entries, skipped, recognized, pending2, idx}

          not Regex.match?(@http_url_re, line) ->
            {entries, skipped + 1, recognized, nil, idx}

          true ->
            idx = idx + 1
            name = clean_or(pending && Map.get(pending, "name"), @title_max, "Channel #{idx}")

            entry = %{
              "url" => line,
              "name" => name,
              "group" => (pending && Map.get(pending, "group")) || nil,
              "logo" => (pending && Map.get(pending, "logo")) || nil,
              "tvgId" => tvg_id_of(pending)
            }

            {entries ++ [entry], skipped, true, nil, idx}
        end
      end)
      |> then(fn {entries, skipped, recognized, _pending, _idx} ->
        %{"entries" => entries, "skipped" => skipped, "recognized" => recognized}
      end)
    end
  end

  defp tvg_id_of(nil), do: nil

  defp tvg_id_of(pending) do
    tvg_id = Map.get(pending, "tvgId")

    if js_falsy(tvg_id) do
      nil
    else
      clean_text(tvg_id)
    end
  end

  defp parse_extinf(line) do
    body =
      case String.split(line, ":", parts: 2) do
        [_prefix, rest] -> rest
        [whole] -> whole
      end

    {attrs_part, raw_name} =
      case :binary.matches(body, ",") do
        [] ->
          {body, ""}

        matches ->
          {start, len} = List.last(matches)
          name = binary_part(body, start + len, byte_size(body) - start - len)
          {binary_part(body, 0, start), String.trim(name)}
      end

    name =
      case raw_name do
        "" -> nil
        name -> name
      end

    group = extinf_attr(attrs_part, "group-title")
    logo = extinf_attr(attrs_part, "tvg-logo")
    tvg_id = extinf_attr(attrs_part, "tvg-id")

    name =
      if is_nil(name) do
        extinf_attr(attrs_part, "tvg-name")
      else
        name
      end

    %{"name" => name, "group" => group, "logo" => logo, "tvgId" => tvg_id}
  end

  defp extinf_attr(attrs, key) do
    case Regex.run(Regex.compile!("#{key}=\"([^\"]*)\"", "i"), attrs) do
      [_, value] ->
        case String.trim(value) do
          "" -> nil
          trimmed -> trimmed
        end

      _ ->
        nil
    end
  end

  # -- private helpers ---------------------------------------------------------

  defp with_pick(%{kind: "torrent"}, action, callback) do
    case sanitize_torrent_pick(action) do
      nil ->
        error("no_file_chosen")

      pick ->
        if video_file?(pick["filePath"]) do
          callback.(pick)
        else
          error("no_file_chosen")
        end
    end
  end

  defp with_pick(_classified, _action, callback), do: callback.(nil)

  defp pick_for(entry, %{kind: "torrent"} = classified) do
    case sanitize_torrent_pick(entry) do
      nil ->
        :invalid

      pick ->
        if video_file?(pick["filePath"]) do
          %{
            "infohash" => classified.infohash,
            "fileIndex" => pick["fileIndex"],
            "filePath" => pick["filePath"],
            "fileBytes" => pick["fileBytes"]
          }
        else
          :invalid
        end
    end
  end

  defp pick_for(_entry, _classified), do: %{}

  def sanitize_torrent_pick(raw) when not is_map(raw) or is_struct(raw), do: nil

  def sanitize_torrent_pick(raw) do
    file_index = js_to_number(Map.get(raw, "fileIndex", :absent))
    file_path = path_of(raw)
    file_bytes = js_to_number(Map.get(raw, "fileBytes", :absent))

    cond do
      not is_integer(file_index) or file_index < 0 or file_index > 1_000_000 -> nil
      file_path == "" or String.length(file_path) > @path_max -> nil
      file_bytes == :nan or not is_number(file_bytes) or file_bytes < 0 -> nil
      true -> %{"fileIndex" => file_index, "filePath" => file_path, "fileBytes" => file_bytes}
    end
  end

  defp path_of(raw) do
    case Map.get(raw, "filePath", :absent) do
      path when is_binary(path) -> String.trim(path)
      _ -> ""
    end
  end

  def video_file?(path) do
    case Regex.run(~r/\.([a-z0-9]+)$/i, to_string(path)) do
      [_, ext] -> MapSet.member?(@video_file_exts, String.downcase(ext))
      _ -> false
    end
  end

  defp entry_field(entry, key) when is_map(entry), do: Map.get(entry, key)
  defp entry_field(_entry, _key), do: nil

  defp make_item(classified, title, queued_by, now_ms, pick) do
    base = %{
      "id" => new_item_id(now_ms),
      "kind" => classified.kind,
      "url" => classified.url,
      "videoId" => Map.get(classified, :video_id),
      "title" => clean_or(title, @title_max, default_title(classified.kind)),
      "queuedBy" => clean_or(queued_by, @name_max, "Someone")
    }

    if classified.kind == "torrent" do
      p = pick || %{}

      Map.merge(base, %{
        "infohash" => classified.infohash,
        "fileIndex" => Map.get(p, "fileIndex"),
        "filePath" => Map.get(p, "filePath"),
        "fileBytes" => Map.get(p, "fileBytes")
      })
    else
      Map.merge(base, initial_prepare_fields(classified))
    end
  end

  defp extension_needs_prepare?(url) do
    case Regex.run(~r/\.([a-z0-9]+)(?:\?|#|$)/i, url) do
      [_, ext] -> ext in ["mkv", "avi", "wmv", "flv", "ts", "m2ts"]
      _ -> false
    end
  end

  defp initial_prepare_fields(%{kind: "file", needs_prepare: true, url: url}) do
    %{
      "sourceUrl" => url,
      "prepareStatus" => "pending",
      "playbackUrl" => nil,
      "prepareId" => nil,
      "prepareError" => nil
    }
  end

  defp initial_prepare_fields(%{kind: "file"}), do: %{}
  defp initial_prepare_fields(_), do: %{}

  defp copy_prepare_fields(item) when is_map(item) do
    Enum.reduce(
      ["sourceUrl", "playbackUrl", "prepareStatus", "prepareId", "prepareError"],
      %{},
      fn key, acc ->
        case Map.get(item, key) do
          nil -> acc
          val -> Map.put(acc, key, val)
        end
      end
    )
  end

  defp start_now(item, actor, now_ms) do
    base = %{
      "id" => Map.get(item, "id"),
      "kind" => Map.get(item, "kind"),
      "url" => Map.get(item, "url"),
      "videoId" => Map.get(item, "videoId") || nil,
      "title" => Map.get(item, "title")
    }

    base =
      if Map.get(item, "kind") == "torrent" do
        Map.merge(base, %{
          "infohash" => Map.get(item, "infohash"),
          "fileIndex" => Map.get(item, "fileIndex"),
          "filePath" => Map.get(item, "filePath"),
          "fileBytes" => Map.get(item, "fileBytes")
        })
      else
        base
      end

    Map.merge(base, copy_prepare_fields(item), %{
      "playing" => true,
      "positionSec" => 0,
      "updatedAt" => now_ms,
      "by" => clean_or(actor, @name_max, "Someone"),
      "queuedBy" => Map.get(item, "queuedBy") || Map.get(item, "by") || "Someone"
    })
  end

  defp current_as_queue_item(current) do
    base = %{
      "id" => Map.get(current, "id"),
      "kind" => Map.get(current, "kind"),
      "url" => Map.get(current, "url"),
      "videoId" => Map.get(current, "videoId") || nil,
      "title" => Map.get(current, "title"),
      "queuedBy" => Map.get(current, "queuedBy")
    }

    if Map.get(current, "kind") == "torrent" do
      Map.merge(base, %{
        "infohash" => Map.get(current, "infohash"),
        "fileIndex" => Map.get(current, "fileIndex"),
        "filePath" => Map.get(current, "filePath"),
        "fileBytes" => Map.get(current, "fileBytes")
      })
    else
      Map.merge(base, copy_prepare_fields(current))
    end
  end

  defp id_of(entry, now_ms) do
    case Map.get(entry, "id") do
      id when is_binary(id) -> id
      _ -> new_item_id(now_ms)
    end
  end

  defp clean_or(value, max, fallback) do
    case clean_text(value, max) do
      "" -> fallback
      text -> text
    end
  end

  defp base36_digit(n) when n >= 0 and n <= 9, do: ?0 + n
  defp base36_digit(n) when n >= 10 and n <= 35, do: ?a + (n - 10)

  defp base36(n) when is_integer(n), do: n |> Integer.to_string(36) |> ascii_downcase()
  defp base36(n), do: Integer.to_string(n, 36) |> ascii_downcase()

  defp js_falsy(nil), do: true
  defp js_falsy(false), do: true
  defp js_falsy(x) when is_number(x) and x == 0, do: true
  defp js_falsy(""), do: true
  defp js_falsy(_), do: false

  defp nonneg_number_or(:nan), do: 0
  defp nonneg_number_or(n) when is_number(n) and n >= 0, do: n
  defp nonneg_number_or(_), do: 0

  defp finite_number_or(:nan, default), do: default
  defp finite_number_or(n, _default) when is_number(n), do: n
  defp finite_number_or(_, default), do: default

  def js_to_number(n) when is_number(n), do: n
  def js_to_number(:absent), do: :nan
  def js_to_number(""), do: 0

  def js_to_number(<<char, rest::binary>>) when char in [?\s, ?\t, ?\n, ?\r] do
    case String.trim(rest) do
      "" -> 0
      _ -> js_parse(rest)
    end
  end

  def js_to_number(value) when is_binary(value), do: js_parse(value)
  def js_to_number(nil), do: 0
  def js_to_number(true), do: 1
  def js_to_number(false), do: 0
  def js_to_number(_), do: :nan

  defp js_parse("0x" <> hex) do
    case Integer.parse(hex, 16) do
      {n, ""} -> n
      _ -> :nan
    end
  end

  defp js_parse(value) do
    trimmed = String.trim(value)

    case Float.parse(trimmed) do
      {f, ""} ->
        if f == trunc(f) and not (trimmed =~ "." or trimmed =~ "e" or trimmed =~ "E") do
          trunc(f)
        else
          f
        end

      _ ->
        :nan
    end
  end

  # -- WHATWG parsing helpers --------------------------------------------------

  defp whatwg_parse(url) do
    case Regex.run(~r/\A([a-zA-Z][a-zA-Z0-9+.\-]*):(.*)/s, url) do
      [_, scheme, rest] ->
        scheme = ascii_downcase(scheme)

        if String.starts_with?(rest, "//") do
          after_slashes = binary_part(rest, 2, byte_size(rest) - 2)
          {authority, tail} = take_until(after_slashes, [?/, ??, ?#])
          host = authority |> strip_userinfo() |> strip_port() |> ascii_downcase()

          if host == "" and scheme in ["http", "https", "ws", "wss", "ftp"] do
            :error
          else
            {path, query} = path_query_from_tail(tail)
            {:ok, scheme, host, path, decode_params(query)}
          end
        else
          {path, query} = split_path_query(rest)
          {:ok, scheme, "", path, decode_params(query)}
        end

      nil ->
        :error
    end
  end

  defp path_query_from_tail(""), do: {"/", nil}

  defp path_query_from_tail(tail) do
    if String.starts_with?(tail, "/") do
      split_path_query(tail)
    else
      {"/", query_of(tail)}
    end
  end

  defp split_path_query(seg) do
    {path, rest} = take_until(seg, [??, ?#])
    {path, query_of(rest)}
  end

  defp query_of("?" <> q), do: List.first(String.split(q, "#", parts: 2))
  defp query_of(_), do: nil

  defp take_until(bin, _stops, i \\ 0)
  defp take_until(bin, _stops, i) when i >= byte_size(bin), do: {bin, ""}

  defp take_until(bin, stops, i) do
    if :binary.at(bin, i) in stops do
      {binary_part(bin, 0, i), binary_part(bin, i, byte_size(bin) - i)}
    else
      take_until(bin, stops, i + 1)
    end
  end

  defp strip_userinfo(host) do
    case :binary.matches(host, "@") do
      [] ->
        host

      matches ->
        {start, len} = List.last(matches)
        binary_part(host, start + len, byte_size(host) - start - len)
    end
  end

  defp strip_port("[" <> _ = host) do
    case :binary.split(host, "]") do
      [inside, rest] -> inside <> "]" <> List.first(String.split(rest, ":"))
      [host] -> host
    end
  end

  defp strip_port(host), do: List.first(String.split(host, ":"))

  defp decode_params(nil), do: []

  defp decode_params(query) do
    query
    |> String.split("&", trim: false)
    |> Enum.reject(&(&1 == ""))
    |> Enum.map(fn pair ->
      case String.split(pair, "=", parts: 2) do
        [k] -> {form_decode(k), ""}
        [k, v] -> {form_decode(k), form_decode(v)}
      end
    end)
  end

  defp form_decode(value) do
    spaced = String.replace(value, "+", " ")

    try do
      URI.decode(spaced)
    rescue
      _ -> spaced
    end
  end

  defp param_get(params, name) do
    case Enum.find(params, fn {k, _v} -> k == name end) do
      {_k, v} -> v
      nil -> nil
    end
  end

  defp ascii_downcase(binary) do
    binary
    |> :binary.bin_to_list()
    |> Enum.map(fn c -> if c in ?A..?Z, do: c + 32, else: c end)
    |> :binary.list_to_bin()
  end

  defp parse_magnet(raw) when not is_binary(raw), do: nil

  defp parse_magnet(raw) do
    url = String.trim(raw)

    if url == "" or utf16_length(url) > @url_max or
         not String.starts_with?(ascii_downcase(url), "magnet:?") do
      nil
    else
      case whatwg_parse(url) do
        {:ok, _scheme, _host, _path, params} -> find_btih(params, url)
        :error -> nil
      end
    end
  end

  defp find_btih(params, url) do
    params
    |> Enum.filter(fn {k, _v} -> k == "xt" end)
    |> Enum.map(fn {_k, v} -> v end)
    |> Enum.find_value(fn xt ->
      case Regex.run(~r{\Aurn:btih:(.+)\z}i, xt) do
        [_, raw] -> normalize_infohash(raw, url)
        _ -> nil
      end
    end)
  end

  defp normalize_infohash(raw, url) do
    cond do
      Regex.match?(@hex_re, raw) ->
        %{kind: "torrent", url: url, infohash: ascii_downcase(raw)}

      Regex.match?(@base32_re, raw) ->
        %{kind: "torrent", url: url, infohash: base32_to_hex(raw)}

      true ->
        nil
    end
  end

  defp base32_to_hex(raw) do
    alphabet = String.graphemes(@base32_alphabet)

    {_bits, _value, out} =
      raw
      |> String.graphemes()
      |> Enum.reduce({0, 0, ""}, fn ch, {bits, value, out} ->
        idx = Enum.find_index(alphabet, &(&1 == ch))
        value = Bitwise.bsl(value, 5) + idx
        bits = bits + 5

        if bits >= 8 do
          byte = Bitwise.band(Bitwise.bsr(value, bits - 8), 0xFF)
          hex_digit = fn n -> String.at("0123456789abcdef", n) end

          out =
            out <>
              hex_digit.(Bitwise.band(Bitwise.bsr(byte, 4), 0xF)) <>
              hex_digit.(Bitwise.band(byte, 0xF))

          {bits - 8, value, out}
        else
          {bits, value, out}
        end
      end)

    out
  end

  defp classify_youtube(url, host, path, params) do
    youtu_path_id =
      if String.ends_with?(host, "youtu.be") do
        path_id(path, ~r"\A/([\w-]{6,})")
      else
        nil
      end

    v = param_get(params, "v")
    list_param = param_get(params, "list")

    list_id =
      if is_binary(list_param) and Regex.match?(~r/\A[\w-]{12,}\z/, list_param), do: list_param

    v_id =
      if is_binary(v) and Regex.match?(~r/\A[\w-]{6,}\z/, v), do: v

    shorts_id = path_id(path, ~r"\A/(?:shorts|embed|live|v)/([\w-]{6,})")

    video_id = youtu_path_id || v_id || shorts_id

    cond do
      video_id ->
        base = %{kind: "youtube", url: url, video_id: video_id}
        if list_id, do: Map.put(base, :list_id, list_id), else: base

      list_id ->
        %{kind: "youtubePlaylist", url: url, list_id: list_id}

      true ->
        nil
    end
  end

  defp classify_vimeo(url, path) do
    case Regex.run(~r"\A/(?:video/)?(\d{6,})(?:[/?]|\z)", path) do
      [_, id] -> %{kind: "vimeo", url: url, video_id: id}
      _ -> nil
    end
  end

  defp path_id(path, regex) do
    case Regex.run(regex, path) do
      [_, id] -> id
      _ -> nil
    end
  end
end
