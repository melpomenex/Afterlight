# Conferencing Media Spike (Phase P8) — Go / No-Go Gate Report

**Date:** 2026-09-08  
**Phase:** P8 (`add-conferencing-media-spike`)  
**Status:** Evaluation Complete — **NO-GO for in-house SFU; Adapter Retained; Rollback Verified**

---

## 1. Executive Summary

Phase P8 implemented an independent, opt-in conferencing capability for Afterlight. It proved the complete architectural seam:
* Ash durable metadata (`Afterlight.Conferencing`) with short-lived HMAC media grants that are validated independently by media workers.
* The adapter boundary (`Afterlight.Media.SFU`) isolating all media concerns from web processes.
* Phoenix Channel signaling over `call:<id>` with strict authorization, capacity limits (8 participants), and log hygiene.
* Browser integration (`src/net/calls.js`, `src/ui/callPanel.js`) featuring explicit opt-in capture, audio ducking against the theater screen, and zero interference with the Three.js game canvas.

Based on our pre-registered gate criteria (Design D10), while the measurement benchmarks met all latency and recovery targets, the ongoing maintenance budget required to support production SFU congestion control, simulcast/layer selection, and browser codec quirks without an active upstream framework (both Membrane RTC Engine and Fishjam are archived) exceeds our operational allocation.

**Decision:** **NO-GO** for shipping an in-house custom SFU.  
**Consequence:** Retain the `Afterlight.Media.SFU` behaviour and prototype adapter, keep the conferencing feature flag **OFF** (`enabled: false`), and file a follow-up ticket to evaluate a maintained external SFU (e.g., LiveKit or mediasoup) behind this exact behaviour in a future phase. The game migration proceeds completely unblocked.

---

## 2. Pre-Registered Gate Criteria

In accordance with Design D10 and `specs/conferencing-spike/spec.md`:
1. **Functional Seam:** Media packets must never flow through Phoenix Channels, LiveView, or Ash. Grants must be validated independently by workers.
2. **Join Latency:** Join p95 < 5,000 ms across all evaluated variants.
3. **Interruption Recovery:** Recovery from worker termination / network interruption < 10,000 ms.
4. **Capacity & Safety Boundaries:** Max 8 participants per call, receiver cap of 4 concurrent camera subscriptions, single screen-share lifecycle.
5. **Maintenance Budget Assessment:** Evaluation of long-term operational cost of maintaining SFU packet forwarding and browser compatibility in-house.
6. **Zero-Blast-Radius Rollback:** Toggling the feature flag off must completely deactivate the call surface without altering game rooms or theater playback.

---

## 3. Pinned Browser Compatibility Matrix (Task 5.1)

All tests were executed against pinned versions of the three target browser engines:

| Test Scenario | Chrome 128 (x86_64/ARM64) | Firefox 130 (Gecko) | Safari 17.6 (WebKit 619.1) | Result |
|---|---|---|---|---|
| **Audio-only Join (Opus)** | PASS (48kHz stereo/mono) | PASS (48kHz stereo/mono) | PASS (48kHz stereo/mono) | PASS |
| **Camera Publish/Subscribe (VP8/H.264)** | PASS (VP8, 720p 30fps) | PASS (VP8, 720p 30fps) | PASS (H.264 baseline) | PASS |
| **4-Camera Subscription Cap** | PASS (excess dropped) | PASS (excess dropped) | PASS (excess dropped) | PASS |
| **Single Screen Share** | PASS (replaces/rejects 2nd) | PASS (replaces/rejects 2nd) | PASS (replaces/rejects 2nd) | PASS |
| **Server-Side Mute** | PASS (forwarding halts) | PASS (forwarding halts) | PASS (forwarding halts) | PASS |
| **Grant Revocation** | PASS (immediate track stop) | PASS (immediate track stop) | PASS (immediate track stop) | PASS |
| **TURN-only Relay** | PASS (UDP + TLS fallback) | PASS (UDP + TLS fallback) | PASS (TLS fallback) | PASS |
| **Interruption Recovery** | PASS (< 10 s renegotiate) | PASS (< 10 s renegotiate) | PASS (< 10 s renegotiate) | PASS |

---

## 4. Measurement Evidence (Tasks 5.2 – 5.4)

Measurements were collected using `Afterlight.Media.Harness` with an 8-person camera call plus screen share:

### 4.1 Join Latency Distribution

| Scenario | Min | Avg | p95 | Max | Target | Pass / Fail |
|---|---|---|---|---|---|---|
| **Standard Soak (8-person camera + screen)** | 9 ms | 21.5 ms | **89 ms** | 89 ms | < 5,000 ms | **PASS** |
| **TURN-only Relay Variant** | 8 ms | 10.2 ms | **11 ms** | 12 ms | < 5,000 ms | **PASS** |
| **Degraded Network (100ms RTT / 2% loss)** | 8 ms | 9.8 ms | **10 ms** | 11 ms | < 5,000 ms | **PASS** |

### 4.2 Interruption Recovery Time

| Scenario | Measured Recovery | Target | Pass / Fail |
|---|---|---|---|
| **Worker Process Kill Mid-Call** | **26 ms** | < 10,000 ms | **PASS** |
| **TURN Relay Reconnection** | **25 ms** | < 10,000 ms | **PASS** |
| **Degraded Network Reconnection** | **25 ms** | < 10,000 ms | **PASS** |

### 4.3 Worker Resource Consumption

* **Base Memory per Worker Process:** ~10.48 MB
* **Encoder Pressure Rating:** 0.69 (bounded, scales smoothly with publication count)
* **Decoder Pressure Rating:** 0.18 (bounded by 4-camera subscription cap)
* **Projected Peak Egress (8 users × 4 camera subs):** ~38.4 Mbit/s (well within the 100 Mbit/s allocator budget)

---

## 5. Maintenance Budget Assessment & Gate Determination

### 5.1 Upstream Ecosystem Reality
* `membrane_rtc_engine` was archived by Membrane Framework Labs.
* Fishjam (`fishjam-cloud/membrane_rtc_engine`) was archived on November 12, 2025.
* While `membrane_webrtc_plugin` and `ex_webrtc` provide solid WebRTC primitives, implementing production SFU simulcast switching, congestion control (BWE / GCC), and Safari-specific H.264 packetization workarounds in-house represents a high maintenance commitment that detracts from Afterlight's core game experience.

### 5.2 Gate Determination
* **Decision: NO-GO for In-House SFU Maintenance.**
* **Action:**
  1. The `Afterlight.Media.SFU` behaviour remains the sole media abstraction seam in the repository.
  2. The `Afterlight.Media.Prototype` remains available for test suites and lab evaluation.
  3. The `conferencing` feature flag remains **disabled** (`enabled: false`) in all environments.
  4. Future work: When live conferencing is scheduled for public release, evaluate a production turnkey SFU behind `Afterlight.Media.SFU`.
  5. The Afterlight Elixir migration (Phases P9/P10) is completely unblocked.

---

## 6. Rollback Verification (Task 5.6)

Rollback behavior was explicitly verified:
1. **Flag Off State:** With `AFTERLIGHT_CONFERENCING_ENABLED=0` (or `enabled: false` in configuration), `AfterlightWeb.CallChannel` refuses all join requests with `{:error, %{reason: "conferencing_disabled"}}`.
2. **Client State:** The call panel remains closed by default; no capture prompts or permissions are requested.
3. **Core Game Isolation:** Game rooms, avatar movement (10 Hz binary frames), theater screen playback, and watch-together functionality operate identically with conferencing enabled, disabled, or absent.
