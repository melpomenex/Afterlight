// Stable guest/player id → u32 entity id (shared by client pack bridge and
// server binary encoder). Pure FNV-1a — matches Afterlight.Realtime.EntityId.

export function playerEntityId(playerId) {
  if (playerId == null || playerId === '') return 0;
  const s = String(playerId);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
