/**
 * Shared network protocol constants and packet definitions.
 *
 * Inventory payloads (WELCOME, INVENTORY_STATE) carry the whole player
 * object, which additively includes:
 *   - `materials`: { [materialId]: count } — gathered copper/timber/glass
 *   - `inventory.sprinklers`: count of crafted, unplaced sprinkler kits
 *
 * Chat payloads (additive):
 *   - chat_send (C→S): { text } — raw line; the server parses /msg and /me
 *   - chat_history (S→C): { channel, messages: [{ channel, from, fromKind,
 *     text, ts, action? }] } — sent once after WELCOME
 *   - chat_message (S→C): { channel, from, fromKind: 'player'|'irc'|'system',
 *     text, ts, action? } — channel traffic (sender echo included exactly once)
 *   - chat_dm (S→C): { from, fromKind, to, text, ts, action?, echo? } — private
 *   - chat_presence (S→C): { channel, event: 'join'|'part', who, fromKind, ts }
 *   - chat_error (S→C): { message }
 *
 * Theater payloads (additive):
 *   - theater_queue (C→S): { op: 'add'|'addMany'|'remove'|'playNow'|'skip'|'clear',
 *     url?, title?, itemId?, items? } — queue management for the shared
 *     screen; addMany is the playlist-import batch (items capped, applied
 *     as one state change)
 *   - theater_control (C→S): { op: 'pause'|'resume'|'seek'|'ended'|'failed',
 *     itemId?, positionSec? } — playback control from any occupant
 *   - theater_channel (C→S): { url, title } — tune to an IPTV channel by
 *     resolved stream URL (never an index into a private list). Torrent
 *     play-now reuses this op with additive fields { fileIndex, filePath,
 *     fileBytes } (the resolve→pick outcome; see torrent payloads below)
 *   - theater_state (S→C): { theater: { now, queue }, serverNow } — full
 *     snapshot, broadcast on every applied change and sent on room join
 *   - Presence payloads additively carry `sitting: boolean` (theater seats)
 *
 * YouTube playlist import payloads (additive, theater room):
 *   - theater_playlist_resolve (C→S): { requestId, listId } — ask the
 *     server to read a public playlist; nothing reaches the shared bill
 *     until the importer confirms the preview
 *   - theater_playlist_resolved (S→C): { requestId, title, videos:
 *     [{ videoId, title }] } — the preview data, sent to the requester
 *     only (failures ride the error message with a readable reason)
 *   - theater_import_result (S→C): { queued, skipped, didNotFit } — the
 *     honest outcome of one applied addMany, sent to the importer only
 *   Playlist links themselves are never bill entries: the reducer refuses
 *   kind 'youtubePlaylist' on add/channel.
 *
 * Torrent payloads (additive, theater room):
 *   - torrent_resolve (C→S): { requestId, magnet } — ask the server's
 *     torrent engine to fetch a magnet's metadata; nothing reaches the
 *     shared bill until the paster picks a file from the torrent_files list
 *   - torrent_files (S→C): { requestId, infohash, name, files: [{ index,
 *     path, bytes, playable }] } — the picker data, sent to the requester
 *     only; `playable` marks files browsers can usually decode
 *   - torrent_state (S→C): { items: [{ infohash, progress, peers,
 *     downloaded, ready }] } — periodic swarm progress while a torrent
 *     item is live or being resolved; clients ignore stale/missing status
 *   - torrent_grant (S→C): { infohash, fileIndex, grant, expiresAtMs } —
 *     targeted playback grant for the stream endpoint; Phoenix re-mints
 *     before expiry while the item stays active for this participant
 *   - Torrent items on the bill are { kind: 'torrent', url: <magnet>,
 *     infohash?, fileIndex, filePath, fileBytes } — the magnet stays
 *     canonical so the bill survives restarts; playback rides the server's
 *     GET /api/theater/torrent/:infohash/:fileIndex stream endpoint
 *   Queue/queue add payloads for torrents carry { fileIndex, filePath,
 *   fileBytes } additively (validated by the shared reducer).
 *
 * Places directory payloads (additive, Phoenix world runtime — never a
 * Node-owned message; unrouted when the world row is not flipped):
 *   - place_directory_get (C→S): { requestId } — one bounded snapshot of
 *     public place summaries. Signed game sessions only; at most one
 *     request in flight and no more than one per five seconds per session;
 *     requestId is a string ≤64 chars. Violations ride the bare `error`
 *     message: { message: "rate_limited" } for spam/one-in-flight,
 *     { message: "directory_request_invalid" } for a missing/oversized
 *     requestId.
 *   - place_directory (S→C): { requestId, serverNow, entries: [{ roomId,
 *     occupancy, observedAt, atmosphereLabel? }] } — the reply, capped at
 *     64 public entries and 16KiB. occupancy counts unique roster
 *     identities in the authoritative room roster (the requester included;
 *     a superseded duplicate connection never counts twice); it is 0 only
 *     for a known public room with no live process, and null when the
 *     owner could not be read within the deadline (or is remote) — never a
 *     fabricated count. observedAt is the server wall-clock ms of the
 *     observation (null when unknown). atmosphereLabel is optional static
 *     manifest metadata (the atmosphere preset key); activity, capacity
 *     and private gardens ("garden:<owner>") are never included.
 *   Replies are snapshots, not a presence subscription: clients poll at
 *   most every 10s while the selector is open and treat data older than
 *   30s as unknown.
 *
 * Room atmosphere payloads (additive, Phoenix world runtime — task 2.1,
 * room-atmosphere spec; never a Node-owned message, never relayed):
 *   - atmosphere_get (C→S): { requestId } — membership-gated resnapshot of
 *     the joined room's semantic atmosphere; at most one per five seconds
 *     per session; requestId is a string ≤64 chars. Violations ride the
 *     bare `error` message: { message: "rate_limited" } for spam,
 *     { message: "atmosphere_request_invalid" } for a missing/oversized
 *     requestId, { message: "room_unavailable" } without live membership.
 *   - atmosphere_state (S→C): { roomId, requestId?, schemaVersion, epoch,
 *     revision, serverNow, state } — a FULL-REPLACEMENT snapshot: epoch is
 *     the room's held lease epoch (0 = un-owned, which never emits),
 *     revision is atmosphere-only monotonic within the epoch (higher epoch
 *     or higher revision replaces state whole; duplicates are clock
 *     refreshes only; stale frames are discarded), and state carries
 *     { seed, mode, preset, intensity, wind, startedAt, transition, time,
 *     events: [{ id, kind, at, durationMs, intensity, origin }] } — ≤4
 *     events, ≤8KiB. Semantic only: individual particle transforms never
 *     travel. Shared/shapes are pinned by shared/atmosphereModel.js and
 *     tests/fixtures/atmosphere/model-vectors.json.
 *   - atmosphere_unavailable (S→C): { requestId, roomId } — the joined room
 *     is unknown or has no supported projected atmosphere; nothing falls
 *     back and no room is started. Sent as the join snapshot for nothing:
 *     unsupported rooms simply get no atmosphere at join.
 *
 * IPTV library + program guide payloads (additive, theater room):
 *   - iptv_state (S→C): { iptv: { lists: [{ id, name, addedBy, channelCount }],
 *     epg: { name, updatedAt, channels, programmes } | null } } — metadata
 *     catalog, broadcast on every library/guide change and sent on WELCOME
 *     and theater room join; channel arrays travel separately (below)
 *   - iptv_list_get (C→S): { listId } — pull one shared list's channels
 *   - iptv_list (S→C): { listId, channels } — the reply (cached per session)
 *   - iptv_list_remove (C→S): { listId } — anyone present may remove a list
 *   - epg_lookup (C→S): { keys: [tvgId|name] } — bounded now/next lookup
 *   - epg_schedule (S→C): { entries: [{ key, now, next }] } — the reply
 *   Uploads (playlist text, URL imports, guide files) ride HTTP POST on the
 *   game server's /api/theater/* endpoints, not WS frames.
 */

export const MSG_TYPES = {
  // Client -> Server
  HELLO: 'hello',
  SET_NICKNAME: 'set_nickname',
  JOIN_ROOM: 'join_room',
  MOVEMENT: 'movement',
  GARDEN_ACTION: 'garden_action',
  MARKET_BUY: 'market_buy',
  MARKET_SELL: 'market_sell',
  ORDER_PLACE: 'order_place',
  ORDER_CANCEL: 'order_cancel',
  CONTRACT_COMPLETE: 'contract_complete',
  NODE_HARVEST: 'node_harvest',
  MACHINE_CONTRIBUTE: 'machine_contribute',
  MACHINE_MILL: 'machine_mill',
  MACHINE_CRAFT: 'machine_craft',
  THEATER_QUEUE: 'theater_queue',
  THEATER_CONTROL: 'theater_control',
  THEATER_CHANNEL: 'theater_channel',
  THEATER_PLAYLIST_RESOLVE: 'theater_playlist_resolve',
  TORRENT_RESOLVE: 'torrent_resolve',
  TORRENT_FILES: 'torrent_files',
  TORRENT_STATE: 'torrent_state',
  TORRENT_GRANT: 'torrent_grant',
  IPTV_LIST_GET: 'iptv_list_get',
  IPTV_LIST_REMOVE: 'iptv_list_remove',
  EPG_LOOKUP: 'epg_lookup',
  EMOTE: 'emote',
  CHAT_SEND: 'chat_send',
  PING: 'ping',
  PLACE_DIRECTORY_GET: 'place_directory_get',

  // Server -> Client
  WELCOME: 'welcome',
  FULL_STATE: 'full_state',
  PRESENCE_JOIN: 'presence_join',
  PRESENCE_LEAVE: 'presence_leave',
  PRESENCE_UPDATE: 'presence_update',
  GARDEN_STATE: 'garden_state',
  INVENTORY_STATE: 'inventory_state',
  MARKET_UPDATE: 'market_update',
  CONTRACT_UPDATE: 'contract_update',
  NODE_STATE: 'node_state',
  MACHINE_UPDATE: 'machine_update',
  THEATER_STATE: 'theater_state',
  THEATER_PLAYLIST_RESOLVED: 'theater_playlist_resolved',
  THEATER_IMPORT_RESULT: 'theater_import_result',
  IPTV_STATE: 'iptv_state',
  IPTV_LIST: 'iptv_list',
  EPG_SCHEDULE: 'epg_schedule',
  WEATHER_UPDATE: 'weather_update',
  ACTION_RESULT: 'action_result',
  TRADE_FILLED: 'trade_filled',
  EMOTE_BROADCAST: 'emote_broadcast',
  CHAT_HISTORY: 'chat_history',
  CHAT_MESSAGE: 'chat_message',
  CHAT_DM: 'chat_dm',
  CHAT_PRESENCE: 'chat_presence',
  CHAT_ERROR: 'chat_error',
  PLACE_DIRECTORY: 'place_directory',
  ATMOSPHERE_GET: 'atmosphere_get',
  ATMOSPHERE_STATE: 'atmosphere_state',
  ATMOSPHERE_UNAVAILABLE: 'atmosphere_unavailable',
  ERROR: 'error',
  PONG: 'pong',
};

export const ROOMS = {
  MARKET: 'market',
  THEATER: 'theater',
  gardenFor: (playerId) => `garden:${playerId}`,
  isGarden: (roomId) => roomId?.startsWith('garden:'),
  gardenOwner: (roomId) => roomId?.startsWith('garden:') ? roomId.slice('garden:'.length) : null,
};

export const WEATHER = {
  CLEAR: 'clear',
  DRIZZLE: 'drizzle',
  RAIN: 'rain',
};

export function serialize(msg) {
  return JSON.stringify(msg);
}

export function parse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
