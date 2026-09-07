# P11 snapshot retention hashes

Captured: 2026-09-07 (task 4.1). These files are **read-only forensic snapshots** of the pre-cutover Node era — not a rollback source.

| File | SHA-256 | Size (bytes) |
|---|---|---|
| `data/game-state.json` | `4e7882612fd628886e02ddd518c639b052a3034dcf0cd00924393301e41e3a36` | 19 513 |
| `data/iptv.json` | `504ba03f5335e16e76b3da1105d23f7e2e8d574887fbcd3953fe66af3968c205` | 3 613 355 |
| `data/epg.json` | `cb9ad858fd5f2c87cfc7c374a2e411d42add90ca4dc5526b21ef7e29918a2ad0` | 9 192 440 |

## Runtime write policy

- **No Elixir path** writes these three files (grep + parity importers read snapshots only).
- **Node** still writes them while transitional `:node` relay is active for economy/theater/catalog — expected until P5/P6 cutover completes.
- **Sidecar-owned**: `data/torrents/library.json` + cache dir — written only by `server/torrents.js`.

Re-verify after sweeps: `node scripts/p11-snapshot-hashes.mjs --verify`.
