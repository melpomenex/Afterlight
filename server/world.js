import { MSG_TYPES, serialize, ROOMS } from '../shared/protocol.js';
import { sanitizeMovement } from '../shared/worldModel.js';
import { encodeFlush } from '../shared/realtime/nodeBinaryFlush.js';

export class WorldManager {
  constructor() {
    this.clients = new Map(); // playerId -> ClientSession
    this.rooms = new Map(); // roomId -> Set<playerId>
    this.dirtyMovementRooms = new Set();
    this.roomRtSeq = new Map();
    this.roomRtTick = new Map();
  }

  addClient(playerId, clientSession) {
    this.clients.set(playerId, clientSession);
    this.joinRoom(playerId, clientSession.currentRoom || ROOMS.MARKET);
  }

  removeClient(playerId) {
    const session = this.clients.get(playerId);
    if (!session) return;
    const oldRoom = session.currentRoom;
    if (oldRoom && this.rooms.has(oldRoom)) {
      this.rooms.get(oldRoom).delete(playerId);
      this.broadcastToRoom(oldRoom, {
        type: MSG_TYPES.PRESENCE_LEAVE,
        playerId,
      });
    }
    this.clients.delete(playerId);
  }

  joinRoom(playerId, roomId) {
    const session = this.clients.get(playerId);
    if (!session) return;

    const oldRoom = session.currentRoom;
    if (oldRoom && oldRoom !== roomId && this.rooms.has(oldRoom)) {
      this.rooms.get(oldRoom).delete(playerId);
      this.broadcastToRoom(oldRoom, {
        type: MSG_TYPES.PRESENCE_LEAVE,
        playerId,
      });
    }

    session.currentRoom = roomId;
    const alreadyMember = this.rooms.get(roomId)?.has(playerId) ?? false;
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    this.rooms.get(roomId).add(playerId);

    // Notify others in the room. Re-joining the current room is a no-op for
    // everyone else: a duplicate JOIN_ROOM must not repeat PRESENCE_JOIN.
    if (!alreadyMember) {
      this.broadcastToRoom(roomId, {
        type: MSG_TYPES.PRESENCE_JOIN,
        player: {
          id: session.player.id,
          nickname: session.player.nickname,
          x: session.x,
          z: session.z,
          rotY: session.rotY,
          walking: session.walking,
          sitting: !!session.sitting,
        },
      }, playerId);
    }

    // Send the joining player list of existing players in room
    const existingPlayers = [];
    for (const otherId of this.rooms.get(roomId)) {
      if (otherId === playerId) continue;
      const other = this.clients.get(otherId);
      if (other) {
        existingPlayers.push({
          id: other.player.id,
          nickname: other.player.nickname,
          x: other.x,
          z: other.z,
          rotY: other.rotY,
          walking: other.walking,
          sitting: !!other.sitting,
        });
      }
    }

    session.send({
      type: MSG_TYPES.PRESENCE_UPDATE,
      players: existingPlayers,
    });
  }

  updateMovement(playerId, pose) {
    const session = this.clients.get(playerId);
    if (!session) return;

    // Movement from a player without a room has nowhere to go; drop it.
    if (!session.currentRoom) return;

    // Validate coordinates are finite and coerce relay flags (pure rule in
    // shared/worldModel.js — also the Node-baseline parity reference).
    const sanitized = sanitizeMovement(pose);
    if (!sanitized) {
      return;
    }

    Object.assign(session, sanitized);
    session.moved = true;
    this.dirtyMovementRooms.add(session.currentRoom);
  }

  tickMovementBroadcast() {
    for (const roomId of this.dirtyMovementRooms) {
      const roomPlayers = this.rooms.get(roomId);
      if (!roomPlayers || roomPlayers.size === 0) continue;

      const updates = [];
      for (const pid of roomPlayers) {
        const s = this.clients.get(pid);
        if (s) {
          updates.push({
            id: s.player.id,
            x: s.x,
            z: s.z,
            rotY: s.rotY,
            walking: s.walking,
            sitting: !!s.sitting,
            airborne: !!s.airborne,
          });
          s.moved = false;
        }
      }

      if (updates.length > 0) {
        const tick = (this.roomRtTick.get(roomId) ?? 0) + 1;
        this.roomRtTick.set(roomId, tick);
        const seq = (this.roomRtSeq.get(roomId) ?? 0) + 1;
        this.roomRtSeq.set(roomId, seq);

        let rtPayload = null;
        try {
          rtPayload = Buffer.from(encodeFlush(updates, tick, seq)).toString('base64');
        } catch {
          rtPayload = null;
        }

        const legacyMsg = { type: MSG_TYPES.PRESENCE_UPDATE, players: updates, tick };
        let legacyPacket = null;

        for (const pid of roomPlayers) {
          const s = this.clients.get(pid);
          if (!s) continue;
          s.moved = false;
          if (s.ws.readyState !== 1) continue;
          if (s.rt && rtPayload) {
            s.send({ type: 'rt_binary', tick, data: rtPayload });
          } else {
            if (!legacyPacket) legacyPacket = serialize(legacyMsg);
            s.ws.send(legacyPacket);
          }
        }
      }
    }
    this.dirtyMovementRooms.clear();
  }

  broadcastToRoom(roomId, msg, excludePlayerId = null) {
    const roomPlayers = this.rooms.get(roomId);
    if (!roomPlayers) return;
    const packet = serialize(msg);
    for (const pid of roomPlayers) {
      if (pid === excludePlayerId) continue;
      const s = this.clients.get(pid);
      if (s && s.ws.readyState === 1) { // WebSocket.OPEN
        s.ws.send(packet);
      }
    }
  }

  broadcastToAll(msg) {
    const packet = serialize(msg);
    for (const s of this.clients.values()) {
      if (s.ws.readyState === 1) {
        s.ws.send(packet);
      }
    }
  }
}
