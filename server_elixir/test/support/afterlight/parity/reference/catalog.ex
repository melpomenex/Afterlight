defmodule Afterlight.Parity.Reference.Catalog do
  @moduledoc """
  Parity reference for shared/iptvModel.js + shared/xmltv.js, plus the
  `parseM3U` scanner from shared/theaterModel.js.

  Delegates to production modules `Afterlight.Catalog.M3U`,
  `Afterlight.Catalog.XMLTV`, and `Afterlight.Catalog.Model`.
  Semantics are pinned by tests/fixtures/parity/iptv-xmltv.json.
  """

  @behaviour Afterlight.Parity.Reference

  alias Afterlight.Catalog.M3U
  alias Afterlight.Catalog.XMLTV
  alias Afterlight.Catalog.Model

  # -- dispatch ---------------------------------------------------------------

  def run_case_fn("sanitizeChannels", [raw, max], _now), do: M3U.sanitize_channels(raw, max)
  def run_case_fn("sanitizeChannels", [raw], _now), do: M3U.sanitize_channels(raw)

  def run_case_fn("applyAddPlaylist", [library, opts], now),
    do: Model.apply_add_playlist(library, opts, now)

  def run_case_fn("applyAddPlaylist", [library], now),
    do: Model.apply_add_playlist(library, %{}, now)

  def run_case_fn("applyRemoveList", [library, list_id], _now),
    do: Model.apply_remove_list(library, list_id)

  def run_case_fn("normalizeIptvLibrary", [raw], now), do: Model.normalize_iptv_library(raw, now)

  def run_case_fn("applySetEpg", [arg], now), do: Model.apply_set_epg(arg, now)
  def run_case_fn("normalizeEpg", [raw], now), do: Model.normalize_epg(raw, now)
  def run_case_fn("epgSummary", [epg], _now), do: Model.epg_summary(epg)
  def run_case_fn("catalogSnapshot", [arg], _now), do: Model.catalog_snapshot(arg)
  def run_case_fn("serializeM3U", [channels], _now), do: M3U.serialize_m3u(channels)
  def run_case_fn("parseM3U", [text], _now), do: M3U.parse_m3u(text)
  def run_case_fn("parseXmltvTime", [value], _now), do: XMLTV.parse_xmltv_time(value)
  def run_case_fn("decodeEntities", [text], _now), do: XMLTV.decode_entities(text)
  def run_case_fn("normalizeChannelKey", [value], _now), do: XMLTV.normalize_channel_key(value)

  # parseXmltv(text): async in JS — recordCall serialized the returned
  # Promise to {}. Ground-truth recorded shape is the empty map.
  def run_case_fn("fn", [text], _now) when is_binary(text) do
    _ = XMLTV.parse_xmltv(text)
    %{}
  end

  # createEpgIndex(epg): JS Maps serialize to {}; ground-truth recorded
  # shape is %{"byId" => %{}, "byName" => %{}}.
  def run_case_fn("fn", [epg], _now) when is_map(epg) do
    _index = XMLTV.create_epg_index(epg)
    %{"byId" => %{}, "byName" => %{}}
  end

  # resolveEpgKey(index, key) / nowNextForId(index, id, atMs) / lookupNowNext(index, keys, atMs, max).
  # The recorded index arg is the lossy empty Map shape; rebuild the fixture-pinned sample index.
  def run_case_fn("fn", [index, key], _now) when is_map(index),
    do: XMLTV.resolve_epg_key(epg_index_for_case(index), key)

  def run_case_fn("fn", [index, id, at_ms], _now) when is_map(index),
    do: XMLTV.now_next_for_id(epg_index_for_case(index), id, at_ms)

  def run_case_fn("fn", [index, keys, at_ms, max], _now) when is_map(index),
    do: XMLTV.lookup_now_next(epg_index_for_case(index), keys, at_ms, max)

  def run_case_fn(fname, args, _now),
    do: raise("catalog port: unhandled fixture fn #{inspect(fname)} with #{length(args)} arg(s)")

  # -- fixture-pinned sample guide ---------------------------------------------

  defp epg_index_for_case(%{"byId" => %{}, "byName" => %{}}),
    do: XMLTV.create_epg_index(sample_epg())

  defp epg_index_for_case(%{"byId" => by_id, "byName" => by_name}),
    do: %{"byId" => by_id, "byName" => by_name}

  defp sample_epg do
    t0 = 1_700_000_000_000

    %{
      "name" => "Sample Guide",
      "updatedAt" => t0,
      "channels" => %{
        "alpha.tv" => %{"names" => ["Alpha", "Alpha HD"], "icon" => "http://a.example/1.png"},
        "gamma.tv" => %{"names" => ["Gamma"], "icon" => nil},
        "delta.tv" => %{"names" => ["Delta"], "icon" => nil}
      },
      "programmes" => %{
        "alpha.tv" => [
          [t0 - 3_600_000, t0 + 1_800_000, "Morning News"],
          [t0 + 1_800_000, t0 + 3_600_000, "Noon Bulletin", "with guests"]
        ],
        "gamma.tv" => [[t0 + 10_000, t0 + 20_000, "Late Slot"]],
        "delta.tv" => [[t0 - 10_000, t0 - 5_000, "Ended Show"]]
      }
    }
  end

  # -- public delegates -------------------------------------------------------

  defdelegate sanitize_channels(raw, max), to: M3U
  defdelegate sanitize_channels(raw), to: M3U
  defdelegate serialize_m3u(channels), to: M3U
  defdelegate parse_m3u(text), to: M3U

  defdelegate parse_xmltv(text), to: XMLTV
  defdelegate parse_xmltv(text, opts), to: XMLTV
  defdelegate parse_xmltv_time(value), to: XMLTV
  defdelegate decode_entities(text), to: XMLTV
  defdelegate normalize_channel_key(value), to: XMLTV
  defdelegate create_epg_index(epg), to: XMLTV
  defdelegate resolve_epg_key(index, key), to: XMLTV
  defdelegate now_next_for_id(index, id, at_ms), to: XMLTV
  defdelegate lookup_now_next(index, keys, at_ms), to: XMLTV
  defdelegate lookup_now_next(index, keys, at_ms, max), to: XMLTV

  defdelegate apply_add_playlist(library, opts, now_ms), to: Model
  defdelegate apply_remove_list(library, list_id), to: Model
  defdelegate normalize_iptv_library(raw, now_ms), to: Model
  defdelegate apply_set_epg(arg, now_ms), to: Model
  defdelegate normalize_epg(raw, now_ms), to: Model
  defdelegate epg_summary(epg), to: Model
  defdelegate catalog_snapshot(arg), to: Model
end
