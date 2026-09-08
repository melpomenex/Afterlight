# Atmosphere & Weather Test Tools

This directory contains the testing and verification harness for the atmosphere and weather system (OpenSpec change `add-atmosphere-weather-system`).

## 1. Interactive Harness — `harness.html`

The interactive harness (`tools/atmosphere/harness.html`) drives production atmosphere components with deterministic fixtures, without connecting to a live multiplayer server:

- **Plaza + Arcade Shelter World:** Uses the real world factory and static batching to render a wet stone plaza, dry sheltered stone under an arcade roof, roof-edge runoff drip anchors, pooled puddles, and warm window lights.
- **Production Controllers:** Runs `createAtmosphereController`, `createAtmosphereEvents`, `createAudioMixer`, `createEnvironmentAudio`, and `createAtmosphereStateClient`.
- **Controls Panel:**
  - Preset switcher (rain, storm, clear, dry-heat, diurnal-rain)
  - Quality switcher (normal, reduced)
  - Shared events trigger (lightning with delayed thunder, meteor slot)
  - Flash comfort mode (softened, off)
  - Audio zone crossfades (exposed, roof/arcade, alcove)
  - User-gesture audio start/stop
  - Camera cycling (isometric angles 1–3, perspective first person with drag-to-look)
  - Server time seeking and clock pause/play
  - Live instrumentation counters (draw calls, triangles, active particles, event stats)

### Running the Interactive Harness

Start the Vite dev server:
```sh
npm run dev
```
Then navigate to:
```
http://localhost:5173/tools/atmosphere/harness.html
```

---

## 2. Automated Headless Capture Tool — `capture.mjs`

`tools/atmosphere/capture.mjs` automates browser execution using Chromium and the Chrome DevTools Protocol (CDP). It records visual screenshots and verifies strict D8 performance and allocation budgets.

### Prerequisites

- Node.js >= 18 with ES modules
- Chromium installed (`/snap/bin/chromium`, `/usr/bin/chromium-browser`, or via `CHROME` env var)
- Dev server running on the target port (`npm run dev` or `npm run dev:stack`)

### Usage

```sh
# Single run: normal tier, isometric camera 0
node tools/atmosphere/capture.mjs --url http://localhost:5173 --place harness

# Full verification matrix (normal + reduced tiers x all 4 cameras x 3 repeats + 390x844 layout + 20-cycle soak):
node tools/atmosphere/capture.mjs --url http://localhost:5173 --place harness --matrix --out openspec/changes/add-atmosphere-weather-system/evidence
```

### Options

| Flag | Description | Default |
|---|---|---|
| `--url <origin>` | Development server origin | `http://localhost:5173` |
| `--place <name>` | Target place (`harness`, `court`, `desert-camp`, `rooftops`) | `harness` |
| `--quality <tier>` | Effect detail tier (`normal`, `reduced`) | `normal` |
| `--camera <0-3>` | Camera mode (0: iso 1, 1: iso 2, 2: iso 3, 3: first person) | `0` |
| `--warmup-ms <ms>` | Warmup time before recording stats | `10000` |
| `--duration-ms <ms>` | Measurement sampling window | `60000` |
| `--repeats <n>` | Measurement repetitions per setting | `3` |
| `--matrix` | Runs both tiers, all 4 cameras, layout capture and soak | `false` |
| `--out <dir>` | Destination directory for reports and images | `openspec/changes/add-atmosphere-weather-system/evidence` |
| `--help` | Displays command-line help | |

### Outputs

The capture tool writes to the specified `--out` directory:
- `report.json`: Full machine-readable report conforming to schema version 1, containing environment metadata, matrix performance stats, baseline comparisons, soak test results, and budget evaluation.
- `report.md`: Markdown summary table with pass/fail evaluation and embedded image links.
- `capture-*.png`: High-resolution screenshots of all camera angles, quality tiers, and mobile layout.

### Verified Budgets (D8 Ceilings)

| Budget | Normal Tier | Reduced Tier |
|---|---:|---:|
| Rain drops | ≤ 4096 | ≤ 1024 |
| Splash / ripple instances | ≤ 128 | ≤ 32 |
| Active particle render batches | ≤ 6 | ≤ 3 |
| New atmosphere draw calls | ≤ 12 | ≤ 6 |
| Atmosphere CPU p95 | ≤ 2.0 ms | ≤ 1.0 ms |
| Additional shadow lights | 0 | 0 |
| 20-cycle soak growth | 0 leaks | 0 leaks |
