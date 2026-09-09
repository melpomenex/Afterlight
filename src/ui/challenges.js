/**
 * Direct challenges UI. Parent calls `initChallenges(...)` — this module
 * never travels, sits, or mutates room membership.
 *
 * Accept highlights the destination through `onHighlight`. Decline leaves
 * participation and room state untouched. Mute/block ride the protocol.
 */

import { MSG_TYPES } from '../../shared/protocol.js';
import {
  ACTIVITY_ERRORS,
  generateActivityRequestId,
} from '../../shared/activityProtocol.js';
import {
  CHALLENGE_COMMANDS,
  CHALLENGE_EVENTS,
  CHALLENGE_ERRORS,
  CHALLENGE_STATUSES,
  CHALLENGE_EXPIRY_MS,
  validateChallengeInvite,
  validateChallengeRespond,
  validateChallengeMute,
  validateChallengeBlock,
} from '../../shared/challengeModel.js';
import { formatActivityLine, labelForType } from './activityDiscovery.js';

const MUTE_KEY = 'afterlight-challenge-mute-v1';
const BLOCK_KEY = 'afterlight-challenge-block-v1';

function readList(key) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

function writeList(key, list) {
  try {
    localStorage.setItem(key, JSON.stringify(list.slice(0, 64)));
  } catch {
    /* session-only */
  }
}

function el(tag, attrs = {}) {
  if (typeof document === 'undefined') return null;
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'text') node.textContent = v;
    else if (k === 'className') node.className = v;
    else node.setAttribute(k, v);
  }
  return node;
}

export function initChallenges({
  net,
  root = null,
  toast = null,
  onHighlight = null,
  getLocalId = () => net?.guestId ?? null,
  now = () => Date.now(),
  createEl = el,
} = {}) {
  if (!net || typeof net.on !== 'function' || typeof net.send !== 'function') {
    throw new Error('initChallenges requires a net facade with send/on');
  }

  let muted = readList(MUTE_KEY).includes('all');
  const blocked = new Set(readList(BLOCK_KEY));
  let incoming = null;
  let expiryHandle = null;
  const listeners = [];

  const mount = root || (typeof document !== 'undefined' ? document.getElementById('challenge-card') : null);
  const card = mount || createEl?.('div', { className: 'panel challenge-card', id: 'challenge-card' });
  if (card && !mount && typeof document !== 'undefined') {
    card.hidden = true;
    document.body.append(card);
  }

  function supports() {
    return net.supportsActivities === true;
  }

  function failClosed(requestId, activityId, error, message) {
    const frame = {
      type: MSG_TYPES.ACTIVITY_ERROR,
      requestId,
      activityId,
      error,
      message,
    };
    net.dispatchLocalActivityError?.(frame);
    toast?.('Challenge', message, 'ACTIVITY');
    return { ok: false, error, requestId };
  }

  function sendCommand(type, payload) {
    if (!supports()) {
      return failClosed(
        payload.requestId,
        payload.activityId,
        ACTIVITY_ERRORS.ACTIVITIES_UNAVAILABLE,
        'Challenges need the shared places connection.',
      );
    }
    net.send(type, payload);
    return { ok: true, requestId: payload.requestId };
  }

  function hideCard() {
    incoming = null;
    if (expiryHandle != null) {
      clearTimeout(expiryHandle);
      expiryHandle = null;
    }
    if (card) {
      card.hidden = true;
      card.textContent = '';
    }
  }

  function renderIncoming(invite) {
    incoming = invite;
    if (!card) {
      toast?.(
        `${invite.senderName || 'A visitor'} challenges you`,
        `${labelForType(invite.activityType || invite.activityId)} — accept or decline.`,
        'ACTIVITY',
      );
      return;
    }
    card.textContent = '';
    card.hidden = false;
    const micro = createEl('div', { className: 'micro', text: 'CHALLENGE' });
    const title = createEl('strong', { text: `${invite.senderName || 'A visitor'} invites you` });
    const body = createEl('p', {
      text: `${labelForType(invite.activityType || invite.activityId)} — walk over if you accept. Nobody is moved for you.`,
    });
    const actions = createEl('div', { className: 'challenge-actions' });
    const accept = createEl('button', { type: 'button', text: 'Accept' });
    const decline = createEl('button', { type: 'button', text: 'Decline' });
    const mute = createEl('button', { type: 'button', className: 'challenge-quiet', text: 'Mute invites' });
    const block = createEl('button', { type: 'button', className: 'challenge-quiet', text: 'Block' });
    accept.onclick = () => respond(true);
    decline.onclick = () => respond(false);
    mute.onclick = () => setMuted(true);
    block.onclick = () => blockPlayer(invite.senderId);
    actions.append(accept, decline, mute, block);
    card.append(micro, title, body, actions);
    if (expiryHandle != null) clearTimeout(expiryHandle);
    const remain = Math.max(0, (invite.expiresAt || now() + CHALLENGE_EXPIRY_MS) - now());
    expiryHandle = setTimeout(() => {
      hideCard();
      toast?.('Challenge expired', 'The invitation ran out.', 'ACTIVITY');
    }, remain);
  }

  function showStale(result) {
    hideCard();
    const line = formatActivityLine([result.availability || {}], { fresh: true });
    toast?.(
      'Table is busy',
      `${line.text || 'Current availability unknown'}. You can watch or queue — nobody was moved.`,
      'ACTIVITY',
    );
  }

  function invite({ activityId, targetId, targetName } = {}) {
    const requestId = generateActivityRequestId('chal');
    const validation = validateChallengeInvite({ requestId, activityId, targetId, targetName });
    if (!validation.valid) {
      return failClosed(requestId, activityId, CHALLENGE_ERRORS.INVALID_REQUEST, validation.error);
    }
    if (blocked.has(validation.sanitized.targetId)) {
      toast?.('Challenge', 'You blocked that visitor.', 'ACTIVITY');
      return { ok: false, error: CHALLENGE_ERRORS.BLOCKED, requestId };
    }
    return sendCommand(CHALLENGE_COMMANDS.INVITE, validation.sanitized);
  }

  function respond(accept) {
    if (!incoming?.inviteId) return { ok: false, error: CHALLENGE_ERRORS.NOT_FOUND };
    const requestId = generateActivityRequestId('chal_r');
    const validation = validateChallengeRespond({ requestId, inviteId: incoming.inviteId, accept });
    if (!validation.valid) {
      return failClosed(requestId, incoming.activityId, CHALLENGE_ERRORS.INVALID_REQUEST, validation.error);
    }
    const sent = sendCommand(CHALLENGE_COMMANDS.RESPOND, validation.sanitized);
    hideCard();
    return sent;
  }

  function setMuted(next) {
    muted = next === true;
    writeList(MUTE_KEY, muted ? ['all'] : []);
    const validation = validateChallengeMute({ muted });
    if (validation.valid) sendCommand(CHALLENGE_COMMANDS.MUTE, validation.sanitized);
    hideCard();
    toast?.(muted ? 'Invites muted' : 'Invites unmuted', muted ? 'Challenge cards will stay away.' : 'Challenges can arrive again.', 'ACTIVITY');
  }

  function blockPlayer(playerId) {
    const validation = validateChallengeBlock({ playerId, blocked: true });
    if (!validation.valid) return { ok: false, error: CHALLENGE_ERRORS.INVALID_REQUEST };
    blocked.add(playerId);
    writeList(BLOCK_KEY, [...blocked]);
    sendCommand(CHALLENGE_COMMANDS.BLOCK, validation.sanitized);
    hideCard();
    toast?.('Visitor blocked', 'Their invitations will not arrive.', 'ACTIVITY');
    return { ok: true };
  }

  function onInvite(msg) {
    if (!msg || typeof msg !== 'object') return;
    if (muted || blocked.has(msg.senderId)) return;
    if (msg.targetId && msg.targetId !== getLocalId()) return;
    renderIncoming(msg);
  }

  function onResult(msg) {
    if (!msg || typeof msg !== 'object') return;
    const status = msg.status;
    if (status === CHALLENGE_STATUSES.DECLINED) {
      toast?.('Challenge declined', 'They stayed where they were.', 'ACTIVITY');
      return;
    }
    if (status === CHALLENGE_STATUSES.EXPIRED) {
      toast?.('Challenge expired', 'The invitation ran out.', 'ACTIVITY');
      hideCard();
      return;
    }
    if (status === CHALLENGE_STATUSES.STALE) {
      showStale(msg);
      return;
    }
    if (status === CHALLENGE_STATUSES.ACCEPTED) {
      toast?.('Challenge accepted', 'The table is marked — walk there. Nobody was seated.', 'ACTIVITY');
      if (msg.highlight !== false && msg.activityId) {
        try {
          onHighlight?.({
            activityId: msg.activityId,
            roomId: msg.roomId || null,
            teleport: false,
            autoSeat: false,
          });
        } catch {
          /* highlight is presentation-only */
        }
      }
    }
  }

  net.on(CHALLENGE_EVENTS.INVITE, onInvite);
  net.on(CHALLENGE_EVENTS.RESULT, onResult);
  listeners.push(() => hideCard());

  return {
    invite,
    respond,
    setMuted,
    blockPlayer,
    isMuted: () => muted,
    incoming: () => incoming,
    dispose() {
      hideCard();
    },
  };
}
