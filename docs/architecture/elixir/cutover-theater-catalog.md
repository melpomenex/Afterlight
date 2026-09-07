# Theater & catalog cutover runbook (P5)

P5 moves the Orpheum theater bill and IPTV/EPG catalog from Node JSON files
into PostgreSQL. Node keeps serving until the routing flip; these tasks are
the migration and rollback rehearsal path.

## Shadow import

```sh
cd server_elixir
mix afterlight.import_theater_catalog \
  --game-state ../data/game-state.json \
  --iptv ../data/iptv.json \
  --epg ../data/epg.json
```

Each file is snapshot-copied and SHA-256-hashed **before** reading. A second
run against the same snapshots is a no-op. Hash mismatch after a recorded
import exits non-zero. Theater tolerates an idle `{now: null, queue: []}`
section; missing `iptv.json` / `epg.json` blocks unless
`--attest-missing-catalog yes`.

Expected live magnitudes (audit only): 2 lists / 16k channels; 12k EPG
channels / 1.3k with programmes. Validation compares imported row counts to
the snapshot contents.

## Reverse-export rehearsal (run BEFORE the flip)

Freeze Node theater/catalog writes, then:

```sh
mix afterlight.export_theater --out /tmp/theater.json --freeze-ack yes
mix afterlight.export_catalog \
  --iptv-out /tmp/iptv.json \
  --epg-out /tmp/epg.json \
  --freeze-ack yes
```

Both tasks refuse without `--freeze-ack yes`.

## Playlist import worker

YouTube playlist resolve uses plain Oban (design D3 — not AshOban): one unique
job per theater room, 15 s timeout, 3 MiB streamed cap, `RESOLVE_MAX` 100.
Resolved previews stage in memory; `theater_import_result` is computed through
the pure reducer `addMany` dry-run.

## Rollback

Before flip: do nothing (Node untouched). After flip: reverse export under
write freeze is the documented escape hatch; forward-fix preferred once
revisions accumulate.
