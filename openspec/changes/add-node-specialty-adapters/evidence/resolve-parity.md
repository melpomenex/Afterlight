# Resolve parity evidence (task 3.1)

Date: 2026-09-07

`Afterlight.Specialty.TorrentRules.parse_magnet/1` delegates to the parity reference corpus pinned by `tests/fixtures/parity/torrent-model.json`.

Elixir verification:

```sh
cd server_elixir && mix test test/afterlight/specialty/resolve_test.exs
```

The `parse_magnet parity fixtures match JS reference corpus` case runs the full torrent-model fixture file via `Afterlight.Parity.run_file/1`.
