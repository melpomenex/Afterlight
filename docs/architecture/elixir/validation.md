# Validation and reproducibility

Generated with Archify 2.17.0-dev.1, source revision `c6519401f7b91b9d43011657880893b0a8955548` from the official tt-a1i/archify repository. The temporary tool checkout is `/tmp/afterlight-archify`; it is not a game dependency.

All three architecture documents passed final deterministic delivery: 9/9 showcase checks, zero composition errors and zero warnings. One focused geometry correction round per diagram. JSON specifications and HTML SHA-256 receipts are stored alongside the artifacts.

The packaged visual-check commands wrote artifact-bound receipts reporting passing containment/readability at 1440×900, 1600×1000, 1920×1080 and 2048×1320, plus endpoint-size light/dark PNGs. Each command subsequently exited 1 with `kill EACCES` during Chromium cleanup. Therefore overall `browser_evidence: failed` (environmental command failure), despite passing recorded measurements. Raw receipts are preserved without modification; do not interpret their internal pass status as a successful command exit.

Perceptual review: rendered light 2048×1320 and dark 1440×900 screenshots inspected for all three documents. Main paths, labels, cards and boundaries are readable with no visible overlaps. The platform was also opened in the in-app browser; manual DOM containment measurements passed all four desktop dimensions. This review does not exercise every search/export interaction.

Only architecture documentation was added. No game tests/build or performance benchmarks were run because application code and dependencies were unchanged. The documents contain proposed targets, not achieved capacity.

## Artifact receipts

### platform

- Output: `diagrams/platform.html`
- Diagram type: architecture
- Specification SHA-256: `f270aeb8a888ac4c7b017f14e2d2dee46400e242247b02eec973afa73bc2ca3c`
- Artifact SHA-256: `db0365dd23627e2ab61623a77c10880aff764d8b610ae7d01e1b8717dacd7917`
- Validation: 9/9 showcase; 0 errors; 0 warnings
- Browser evidence: failed (Chromium cleanup permission error)
- Visual review: passed for the screenshot scope above
- Correction rounds: 1

### conferencing

- Output: `diagrams/conferencing.html`
- Diagram type: architecture
- Specification SHA-256: `0887c170b3e54195a948d8d95738ab9c74df926b86cca4ed0413137a5fea3b36`
- Artifact SHA-256: `67e4de15892e55e82aed621fa5c7d1edf1064a260b465d1611ebf8b505f9bd3e`
- Validation: 9/9 showcase; 0 errors; 0 warnings
- Browser evidence: failed (Chromium cleanup permission error)
- Visual review: passed for the screenshot scope above
- Correction rounds: 1

### migration

- Output: `diagrams/migration.html`
- Diagram type: architecture
- Specification SHA-256: `b5f61ca8e8010b96ef37315b4f39e2511c86fc0364587fbcc06d7eb935d2f732`
- Artifact SHA-256: `e77364edef815db0c47ee03930dfafd5f5b6066b63f184f35766d615194fd7b2`
- Validation: 9/9 showcase; 0 errors; 0 warnings
- Browser evidence: failed (Chromium cleanup permission error)
- Visual review: passed for the screenshot scope above
- Correction rounds: 1

## Regeneration

Check out the pinned Archify revision, then from the game repository run (replace `platform` with either other diagram name):

```sh
node /path/to/archify/archify/bin/archify.mjs validate architecture docs/architecture/elixir/diagrams/platform.json --quality showcase --json
node /path/to/archify/archify/bin/archify.mjs deliver architecture docs/architecture/elixir/diagrams/platform.json docs/architecture/elixir/diagrams/platform.html --quality showcase --json
node /path/to/archify/archify/bin/archify.mjs visual-check docs/architecture/elixir/diagrams/platform.html --json
```
