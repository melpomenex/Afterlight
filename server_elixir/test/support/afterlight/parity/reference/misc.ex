defmodule Afterlight.Parity.Reference.Misc do
  @moduledoc """
  Parity reference for `shared/identity.js`, `server/youtubePlaylist.js`
  (pure core) and `shared/protocol.js` (fixture file `identity-misc.json`).
  TEST-SIDE PARITY REFERENCE — never authority.

  Ported surface (fixture fn names): `generateDefaultNickname`,
  `sanitizeNickname`, `resolveDuplicateNickname`, `generatePlayerPalette`,
  `extractPlaylistVideos`, `isYouTubeMixId`, `looksLikePlaylistId`,
  `parse`, `serialize`.

  ## JS-fidelity decisions

  * **`generateDefaultNickname` OOB noun.** `Math.cos(0) * 20 = 20` indexes
    one past the 20-noun table → JS template-literal renders `undefined`;
    the port reproduces `"Quietundefined10"` for seed 0. Trig is
    `:math.sin`/`:math.cos` (same C libm; fixture seeds sit far from the
    floor boundaries).
  * **`resolveDuplicateNickname` set arg.** The JS recorder executed with a
    real `Set`, which JSON-serializes as `{}` — the recorded arg loses its
    contents. The recorded expecteds (`"wren2"`, `"Wren2"`) imply the
    desired base was treated as claimed (which is the only situation the
    server calls this fn in), so the claimed-check is
    `set has lower(candidate) || lower(candidate) == lower(base)`. The
    3-digit random fallback after the 2..99 ladder stays masked
    (`"<generated>"` matches any binary).
  * **`sanitizeNickname`.** Control-char strip `[\x00-\x1F\x7F-\x9F]`, tag
    strip `<[^>]*>`, ASCII `\\w`/`\\s` classes (JS `\\s` is Unicode-aware;
    fixture inputs are ASCII + astral emoji, which the `[^\w\s-]` strip
    removes either way), UTF-16 code-unit slice at 20 via
    `Afterlight.Parity.Hazards.utf16_truncate/2`, and length checks in
    UTF-16 units. The <3-chars fallback produces a generated default
    (masked).
  * **`generatePlayerPalette`.** Hash is `hash*31 + charCode >>> 0` per
    UTF-16 code unit (surrogate pairs included, like `charCodeAt`) —
    implemented here over a UTF-16 re-encoding of the id; the shared
    `Hazards.js_hash31/2` expects a UTF-16-*encoded* binary and would
    misdecode UTF-8 input.
  * **`collectVideos` DFS.** JS iterates `Object.values` in insertion
    order; Jason-decoded Elixir maps have no insertion order, so the port
    visits map values in SORTED key order. Every fixture input orders its
    video containers before/after unrelated keys such that the recorded
    video order is preserved (verified against `yt/*` expecteds).
  * **`serialize`.** JS `JSON.stringify` formats integral floats as
    integers (`{x:1.0}` → `{"x":1}`). The port is a small custom JSON
    encoder (strings/floats delegated to Jason) that emits integral floats
    as integers and iterates map keys in sorted order (the decoded arg's
    insertion order is unrecoverable; sorted matches the recorded case).
  * **`parse`.** Malformed JSON → `nil` (JS `null`); `JSON.parse("42")` →
    `42` numeric primitive.
  """

  @behaviour Afterlight.Parity.Reference

  alias Afterlight.Accounts.ReducerSupport
  alias Afterlight.Parity.Hazards

  ## -- shared/identity.js palette (sanitize/dedup live in ReducerSupport) --

  @palettes [
    %{"coat" => "#7a4e32", "apron" => "#b8a682", "hat" => "#473d32", "boots" => "#2b231c"},
    %{"coat" => "#3a5449", "apron" => "#c2bca3", "hat" => "#2d3f37", "boots" => "#202924"},
    %{"coat" => "#3d4b60", "apron" => "#b5b29c", "hat" => "#2a3547", "boots" => "#1c222e"},
    %{"coat" => "#634b6b", "apron" => "#bfb5a3", "hat" => "#44324a", "boots" => "#251c29"},
    %{"coat" => "#806835", "apron" => "#ccc4a7", "hat" => "#544320", "boots" => "#2e2411"},
    %{"coat" => "#445e38", "apron" => "#b8b498", "hat" => "#314427", "boots" => "#1f2b18"}
  ]

  ## -- server/youtubePlaylist.js ---------------------------------------------

  @resolve_max 100
  @video_id_re ~r/^[A-Za-z0-9_-]{6,}$/
  @playlist_id_re ~r/^[A-Za-z0-9_-]{12,}$/

  @impl true
  def run_case_fn("generateDefaultNickname", [seed], _now_ms),
    do: ReducerSupport.generate_default_nickname(seed)

  def run_case_fn("sanitizeNickname", [input], _now_ms),
    do: ReducerSupport.sanitize_nickname(input, case_rng())

  def run_case_fn("resolveDuplicateNickname", [desired, active], _now_ms),
    do: ReducerSupport.resolve_duplicate_nickname(desired, active, case_rng())

  def run_case_fn("generatePlayerPalette", [id], _now_ms), do: generate_player_palette(id)

  def run_case_fn("extractPlaylistVideos", [html], _now_ms), do: extract_playlist_videos(html)

  def run_case_fn("isYouTubeMixId", [list_id], _now_ms),
    do: Regex.match?(~r/^(RD|UL)/, list_id || "")

  def run_case_fn("looksLikePlaylistId", [list_id], _now_ms),
    do: is_binary(list_id) and Regex.match?(@playlist_id_re, list_id)

  def run_case_fn("parse", [raw], _now_ms) do
    case Jason.decode(raw) do
      {:ok, term} -> term
      _ -> nil
    end
  end

  def run_case_fn("serialize", [msg], _now_ms), do: js_encode(msg)

  # protocol/serialize-roundtrip records the exporter wrapper
  # roundtripMsg(msg) = parse(serialize(msg)).
  def run_case_fn("roundtripMsg", [msg], _now_ms) do
    case Jason.decode(js_encode(msg)) do
      {:ok, term} -> term
      _ -> nil
    end
  end

  def run_case_fn("serializeMsg", [msg], _now_ms), do: js_encode(msg)

  def run_case_fn(fname, args, _now_ms),
    do: raise("misc port: unknown fixture fn #{fname}/#{length(args)}")

  defp case_rng do
    case Process.get({Afterlight.Parity, :case_seed}) do
      seed when is_number(seed) -> fn -> seed end
      _ -> &ReducerSupport.default_rng/0
    end
  end

  defp generate_player_palette(id) do
    hash =
      id
      |> :unicode.characters_to_binary(:utf8, {:utf16, :big})
      |> utf16_hash31(0)

    Enum.at(@palettes, rem(hash, length(@palettes)))
  end

  # hash = (hash * 31 + charCode) >>> 0 per UTF-16 code unit (16-bit units,
  # surrogate pairs uncombined — charCodeAt semantics).
  defp utf16_hash31(<<code::16, rest::binary>>, acc),
    do: utf16_hash31(rest, Bitwise.band(acc * 31 + code, 0xFFFFFFFF))

  defp utf16_hash31(<<>>, acc), do: acc

  ## -- server/youtubePlaylist.js -------------------------------------------------

  defp extract_playlist_videos(html) when is_binary(html) do
    unless String.contains?(html, "ytInitialData") do
      %{"reason" => "playlist_unreadable"}
    else
      case parse_yt_initial_data(html) do
        :error ->
          %{"reason" => "playlist_unreadable"}

        {:ok, data} ->
          case collect_videos(data) do
            [] ->
              %{"reason" => "playlist_not_public"}

            videos ->
              %{"title" => playlist_title(data) || "A YouTube playlist", "videos" => videos}
          end
      end
    end
  end

  defp extract_playlist_videos(_html), do: %{"reason" => "playlist_unreadable"}

  # Brace-matching extraction of the first ytInitialData assignment,
  # honoring strings and escapes (no regex gamble against markup).
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
        is_binary(title) ->
          title

        is_list(get_in(title && title, ["runs"])) ->
          title["runs"]
          |> Enum.map(&to_string(Map.get(&1 || %{}, "text")))
          |> Enum.join("")

        is_map(title) ->
          title["simpleText"]

        true ->
          nil
      end

    if is_binary(text), do: String.trim(text), else: nil
  end

  defp video_from_node(%{"playlistVideoRenderer" => r} = _node) when is_map(r) do
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

  defp video_from_node(%{"lockupViewModel" => l} = _node) when is_map(l) do
    # Only plain video lockups are entries; playlist lockups carry a list id
    # in contentId.
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

  defp video_from_node(_node), do: nil

  # Depth-first sweep for entry nodes in page order. JS iterates
  # Object.values in insertion order; Jason maps carry no order, so map
  # values are visited in sorted key order (fixture inputs keep their
  # recorded video order under this rule).
  defp collect_videos(data) do
    %{videos: videos, seen: _seen} = visit(data, %{videos: [], seen: MapSet.new()})
    videos
  end

  defp visit(node, acc) when is_list(node) do
    Enum.reduce(node, acc, &visit/2)
  end

  defp visit(node, acc) when is_map(node) do
    if length(acc.videos) >= @resolve_max do
      acc
    else
      case video_from_node(node) do
        %{"videoId" => video_id} = video ->
          if MapSet.member?(acc.seen, video_id) do
            acc
          else
            %{videos: acc.videos ++ [video], seen: MapSet.put(acc.seen, video_id)}
          end

        nil ->
          node
          |> Enum.sort_by(fn {k, _v} -> to_string(k) end)
          |> Enum.reduce(acc, fn {_k, v}, a -> visit(v, a) end)
      end
    end
  end

  defp visit(_node, acc), do: acc

  ## -- shared/protocol.js ---------------------------------------------------------

  # JS JSON.stringify formatting: integral floats render as integers
  # ({x: 1.0} → {"x":1}); map keys iterate in sorted order (insertion order
  # is unrecoverable from the decoded fixture arg).
  defp js_encode(value) when is_binary(value), do: Jason.encode!(value)
  defp js_encode(nil), do: "null"
  defp js_encode(true), do: "true"
  defp js_encode(false), do: "false"
  defp js_encode(value) when is_integer(value), do: Integer.to_string(value)

  defp js_encode(value) when is_float(value) do
    if value == trunc(value), do: Integer.to_string(trunc(value)), else: Jason.encode!(value)
  end

  defp js_encode(value) when is_list(value) do
    "[" <> Enum.map_join(value, ",", &js_encode/1) <> "]"
  end

  defp js_encode(value) when is_map(value) do
    entries =
      value
      |> Enum.sort_by(fn {k, _v} -> to_string(k) end)
      |> Enum.map(fn {k, v} -> js_encode(to_string(k)) <> ":" <> js_encode(v) end)

    "{" <> Enum.join(entries, ",") <> "}"
  end
end
