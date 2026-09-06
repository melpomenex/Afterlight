import { Socket } from 'phoenix';

/**
 * Phoenix Channels transport for the NetworkClient facade (P2 gateway
 * transport). Contract (add-phoenix-gateway-transport design D2/D4):
 *
 *  - acquires a short-lived guest token via POST /api/auth/guest (silent
 *    re-issue on every reconnect), connects with it, and joins `game:v1`;
 *  - server→client: the gateway pushes each relayed Node frame as a channel
 *    event named by the frame's `type` with the remaining fields as payload;
 *    the adapter re-flattens to `{type: event, ...payload}`;
 *  - client→server: `channel.push(type, fields)` for each flat frame;
 *  - "open" means joined (the facade sends hello + desiredRoom replay then,
 *    so the handshake rides the joined channel);
 *  - sends before join are silently dropped (facade gates on isOpen, and
 *    this transport double-gates);
 *  - disconnects map to the facade's close path (reconnect + fresh token is
 *    the facade's scheduleReconnect → connect()).
 */

const CHANNEL_TOPIC = 'game:v1';

/** True for Phoenix bookkeeping events that must not reach game handlers. */
function isPhoenixInternal(event) {
  return (
    typeof event !== 'string' ||
    event.startsWith('phoenix') ||
    event.startsWith('phx_') ||
    event.startsWith('chan_reply')
  );
}

/**
 * Rebuild one flat Node frame from a channel event. Exported for tests:
 * this is the only translation between the two framings.
 */
export function flatFrameFromChannelEvent(event, payload) {
  if (isPhoenixInternal(event)) return null;
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return { type: event, ...payload };
  }
  return { type: event };
}

function deriveHttpBase(wsUrl) {
  try {
    const url = new URL(wsUrl);
    return `${url.protocol === 'wss:' ? 'https:' : 'http:'}//${url.host}`;
  } catch {
    const loc = typeof window !== 'undefined' ? window.location : { protocol: 'http:', hostname: 'localhost' };
    return `${loc.protocol}//${loc.hostname}:3001`;
  }
}

export function createPhoenixTransport(client, wsUrl) {
  let socket = null;
  let channel = null;
  let joined = false;
  let connecting = false;

  async function acquireToken() {
    const res = await fetch(`${deriveHttpBase(wsUrl)}/api/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guestId: client.guestId, nickname: client.nickname }),
    });
    if (!res.ok) {
      throw new Error(`guest token refused (HTTP ${res.status})`);
    }
    const body = await res.json();
    if (!body?.token) throw new Error('guest token response missing token');
    return body.token;
  }

  function teardown() {
    if (channel) {
      try { channel.leave(); } catch {}
    }
    if (socket) {
      try { socket.disconnect(); } catch {}
    }
    channel = null;
    socket = null;
    joined = false;
    connecting = false;
  }

  return {
    isOpen: () => joined,
    isConnecting: () => connecting,

    connect() {
      if (joined || connecting) return;
      connecting = true;

      acquireToken()
        .then((token) => {
          socket = new Socket(wsUrl, { params: { token } });

          socket.onOpen(() => {
            channel = socket.channel(CHANNEL_TOPIC, { guestId: client.guestId });

            channel.onMessage = (event, payload, next) => {
              const frame = flatFrameFromChannelEvent(event, payload);
              if (frame && joined) client.handleFrame(frame);
              return next(event, payload);
            };

            channel
              .join()
              .receive('ok', () => {
                joined = true;
                connecting = false;
                client.handleOpen();
              })
              .receive('error', (resp) => {
                console.warn('game channel join refused:', resp);
                teardown();
                client.handleError(resp);
                client.handleClose();
              });
          });

          socket.onClose(() => {
            const wasJoined = joined;
            teardown();
            if (wasJoined) client.handleClose();
          });

          socket.onError((err) => {
            if (connecting) {
              // connect-phase failure (bad token, gateway down): fall back
              // to the facade's reconnect loop.
              connecting = false;
              teardown();
              client.handleError(err);
              client.handleClose();
              return;
            }
            client.handleError(err);
          });

          socket.connect();
        })
        .catch((err) => {
          connecting = false;
          client.handleError(err);
          client.handleClose();
        });
    },

    send(frame) {
      if (!joined || !channel) return; // silent drop (facade semantics)
      const { type, ...payload } = frame;
      channel.push(type, payload);
    },

    close() {
      teardown();
    },
  };
}
