/**
 * Shared network protocol constants and packet definitions.
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
  EMOTE: 'emote',
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
  WEATHER_UPDATE: 'weather_update',
  ACTION_RESULT: 'action_result',
  TRADE_FILLED: 'trade_filled',
  EMOTE_BROADCAST: 'emote_broadcast',
  ERROR: 'error',
  PONG: 'pong',
};

export const ROOMS = {
  MARKET: 'market',
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
