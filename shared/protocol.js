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
 *   - theater_queue (C→S): { op: 'add'|'remove'|'playNow'|'skip'|'clear',
 *     url?, title?, itemId? } — queue management for the shared screen
 *   - theater_control (C→S): { op: 'pause'|'resume'|'seek'|'ended'|'failed',
 *     itemId?, positionSec? } — playback control from any occupant
 *   - theater_channel (C→S): { url, title } — tune to an IPTV channel by
 *     resolved stream URL (never an index into a private list)
 *   - theater_state (S→C): { theater: { now, queue }, serverNow } — full
 *     snapshot, broadcast on every applied change and sent on room join
 *   - Presence payloads additively carry `sitting: boolean` (theater seats)
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
  EMOTE: 'emote',
  CHAT_SEND: 'chat_send',
  PING: 'ping',

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
  WEATHER_UPDATE: 'weather_update',
  ACTION_RESULT: 'action_result',
  TRADE_FILLED: 'trade_filled',
  EMOTE_BROADCAST: 'emote_broadcast',
  CHAT_HISTORY: 'chat_history',
  CHAT_MESSAGE: 'chat_message',
  CHAT_DM: 'chat_dm',
  CHAT_PRESENCE: 'chat_presence',
  CHAT_ERROR: 'chat_error',
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
