# Baseline Games Performance & Allocation Records

**Date:** 2026-09-13
**Git Commit:** e3570b8
**Target Environments:** Kart Royale, Summit Run, Downhill Mayhem

## 1. Host Hardware and Environment

- **CPU:** AMD Ryzen 9 5900X 12-Core Processor (24 vCPUs)
- **RAM:** 24,490 MB (~24 GB)
- **OS / Platform:** Linux x86_64
- **Node.js:** v26.8.1
- **Vite:** v7.3.6

## 2. Production Build Baselines

- **Main Application (`npm run build`):**
  - WASM realtime builder: passed
  - Vite client bundle: passed (all 382 modules transformed, output in `dist/`)
- **Kart Royale Standalone/Host Bundle (`npm --prefix games/kart-royale run build`):**
  - `tsc --noEmit && vite build`: passed (66 modules transformed, output in `games/kart-royale/dist/`)
- **Downhill Mayhem (`games/downhill-mayhem`):**
  - Unit tests and shared course hashing: passed

## 3. Subsystem Architecture & Native Profiles

### Kart Royale (`kart-royale`)
- **Native World Profile:** Sunset Bay (coastal golden-hour marine environment with trackside structures)
- **Instrumentation (`kartPerf`):**
  - Ring buffer: last 20 attempts capped (`window.__kartPerf`, `window.__afterlight.kartPerformance()`)
  - Spans: `interaction`, `controller-import`, `admission`, `host-import`, `construct`, `boot`, `spawn-valid`, `ready`, `input-ready`, `first-visible-frame`
- **Memory CEILINGS (Design D8):**
  - Combined retention envelope: 256 MiB GPU / 256 MiB CPU (128 MiB GPU / 128 MiB CPU on <=4 GiB devices)
- **Entry Timing Limits:**
  - Ready entry: first frame p95 <= 500 ms, input ready <= 1,000 ms
  - Suspended return: first frame <= 200 ms, input p95 <= 500 ms

### Summit Run (`snowboard-race`)
- **Native World Profile:** Cold alpine mountain (conifers, snowy peaks, frozen blue sky)
- **Native Scene Footprint:**
  - Terrain: 550 × 70 subdivisions
  - Peaks: 70 procedural mountain silhouettes
  - Trees: 420 instanced conifer meshes (high tier) / scaled 0.6 at low tier
  - Particles: 160 snow particles (high) / 80 particles (low)
  - Deterministic draw order & seed: 321

### Downhill Mayhem (`downhill-mayhem`)
- **Native World Profile:** Summer alpine/forest downhill trail
- **Scene Footprint:**
  - Course document: analytic geometry with SHA-256 hash binding
  - Simulation: 30 Hz fixed-step server-authoritative simulation with client prediction and Hermite spline course tracking
  - Visuals: course terrain, rider models, dynamic dust/skid particles

## 4. Recorded Limitations & Verification Constraints
- In headless/CI containers without dedicated display server, WebGL runs under SwiftShader/software rendering or mock context; GPU memory queries and frame rates reflect software simulation.
- Performance gates must distinguish headless simulation limitations from physical desktop/mobile measurements as defined in Design D8.
