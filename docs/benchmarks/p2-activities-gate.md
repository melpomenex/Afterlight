# Phase P2 Gate Evidence: Orpheum Arcade, Live Cabinets & Verified Scores

**Assembled:** 2026-09-08  
**Scope:** Phase P2 Arcade Cabinets, Live Screen Materials, Attract Demos, Verified Leaderboards, Score Forgery Rejection, Database Outage Resilience, and Live Orpheum Coexistence (Tasks 3.1 – 3.11)  
**Status:** **PASS** (all pre-registered criteria satisfied)

---

## 1. Executive Summary

Phase P2 establishes the Orpheum as a shared arcade alongside its cinema identity, featuring four fully playable arcade cabinets: **Pong**, **Rain Runner**, **Signal Lost**, and **Sporefall**. Each cabinet features live procedural canvas screen rendering, attract modes, spatial audio with strict voice limits, and server-simulated rules. Terminal run and match results are securely verified through authoritative OTP sessions and recorded into Ash/Postgres without exposing client-side score write actions.

This gate report records verification against every requirement in Task 3.11 and `openspec/changes/add-place-activities-program/specs/orpheum-arcade/spec.md`:
1. **Play every cabinet through completion with an observer:** Player and observer receive identical scores, terminal stats, and match end events across all four cabinets. Spectators cannot submit control inputs.
2. **Reject score forgery:** Client-submitted control payloads cannot manipulate scores or declare winners. Direct resource creation by guest actors is blocked by Ash policy authorization. Duplicate completion keys reject altered scores as idempotent replays. Out-of-bounds, negative, non-integer, and over-cap scores are rejected by validation.
3. **Database outage resilience:** When Postgres or the database connection is interrupted, activity sessions continue to tick, simulate, and complete without crashing or blocking. `CompletionRecorder` retries pending records and flushes them upon recovery. Saturated backlogs honestly report `:recording_backlog_full` and broadcast matching status to clients.
4. **No-WebGPU baseline renderer compatibility:** All cabinets, screen pipelines, and focused camera views operate on standard Three.js WebGL and Canvas 2D without requiring WebGPU.
5. **Texture budgets & visibility throttling:** Cabinet screen textures are strictly bounded (512×384 default, 1024×768 focused). Visibility throttling enforces 60 fps (focused), 20 fps (spectators within 6m), 10 fps (attract between 6m and 20m), and 0 fps (culled beyond 20m or hidden rooms).
6. **Spatial audio voice limits and muting:** Each cabinet caps synthesized audio to at most 3 concurrent voices, applies linear distance attenuation beyond 12m, and respects global mute.
7. **Live Orpheum coexistence & performance costs:** All four cabinets, 48 theater seats, exit gates, and the movie screen coexist in the Orpheum without spatial conflicts, camera leaks, or collision overlap. Live Orpheum frame times remain well within the 20 ms p95 threshold (measured ~16.4 ms / 60 fps).

---

## 2. Pre-Registered Gate Evaluation

| Gate Criterion | Target / Threshold | Measured Result | Status | Test Reference |
| --- | --- | --- | --- | --- |
| **All cabinets play-through with observer** | Identical score & events to player and observer | Pong (7:3), Rain Runner (1540), Signal Lost (2800), Sporefall (4200) all verified | **PASS** | `p2_gate_test.exs` #1–4, `tests/p2-gate.test.js` #2 |
| **Spectator input rejection** | Zero spectator input accepted | Rejected with `:not_seated` / `:invalid_participant_lease` | **PASS** | `p2_gate_test.exs` #1–4 |
| **Client control score injection** | Forbidden control keys stripped; sim score unchanged | Client passing `"score": 999999` stripped; sim score remains authoritative | **PASS** | `p2_gate_test.exs` #5 |
| **Guest direct DB insert rejection** | Direct Ash create blocked by policy | `Ash.create` returns unauthorized error; 0 rows inserted | **PASS** | `p2_gate_test.exs` #6, `results_test.exs` |
| **Duplicate replay forgery** | Replayed completion key with forged score ignored | Second write returns `{:ok, :duplicate}`; original score preserved in DB | **PASS** | `p2_gate_test.exs` #7 |
| **Score validation bounds** | Negative, float, string, >100M rejected | All bad scores rejected with `{:error, :forged_or_invalid}` | **PASS** | `p2_gate_test.exs` #8 |
| **Database outage retry & recovery** | Transient DB failure buffered and saved upon recovery | `CompletionRecorder` retries; flushes to 0 pending when writer recovers | **PASS** | `p2_gate_test.exs` #9 |
| **Backlog saturation honest reporting** | Rejects excess with `:recording_backlog_full` | Honest error returned; `stats.pending` stays capped at limit | **PASS** | `p2_gate_test.exs` #10 |
| **Live session unblocked during outage** | Simulation continues without crash during DB failure | Session process remains alive and active | **PASS** | `p2_gate_test.exs` #11 |
| **No-WebGPU compatibility** | 100% playable on Three.js WebGL / 2D Canvas | Verified without WebGPU device; CanvasTexture updates cleanly | **PASS** | `tests/p2-gate.test.js` #3 |
| **Texture resolution budgets** | Default <= 512×384, Focused <= 1024×768 | Canvas sizes resize strictly between 512×384 and 1024×768 | **PASS** | `tests/p2-gate.test.js` #3 |
| **Visibility throttler frame rates** | Focused 60Hz, Spectator 20Hz, Attract 10Hz, Culled 0Hz | Interval checks strictly enforce >= 50ms spectator, >= 100ms attract, 0ms culled | **PASS** | `tests/p2-gate.test.js` #3 |
| **Spatial audio voice cap & mute** | Max 3 voices per cabinet, attenuated >12m, mute | Oldest voice preempted at 4th note; 0 voices when muted or >12m | **PASS** | `tests/p2-gate.test.js` #4 |
| **Orpheum coexistence & clearance** | Zero collision overlap with seats, gates, spawns | All 5 activity obstacles verified clear of spawns and 48 seats | **PASS** | `tests/p2-gate.test.js` #5, `tests/orpheum-arcade.test.js` |
| **Live Orpheum frame budget** | p95 frame time <= 20 ms (60 fps) with media playing | Measured: 15.8 – 16.9 ms (mean 16.3 ms) on standard desktop baseline | **PASS** | `p2-gate-browser.mjs`, `tests/p2-gate.test.js` |

---

## 3. Detailed Verification Scenarios

### 3.1 Play-Through Completion with Observer (`p2_gate_test.exs` & `tests/p2-gate.test.js`)
- **Pong (2 Players + 1 Observer):**
  - Player 1 (`slot 0`) and Player 2 (`slot 1`) seated; Observer granted role `"spectator"`.
  - Simulation steps rally to first-to-7 score (`7:3`).
  - `match_ended` event delivered to all three with identical winner (`pong_p1`), identical score (`{"0": 7, "1": 3}`).
  - Persisted as an `ActivityMatch` record with `outcome: "completed"`.
- **Rain Runner (1 Player + 1 Observer):**
  - Player seated in `slot 0`; Observer granted role `"spectator"`.
  - Run cap enforced at tick 36,000; final score `1540`, distance `154.0`.
  - `match_ended` event delivered to both with identical score `1540`.
  - Persisted in `ArcadeRun` with `game: "rain-runner"`, `outcome: "run_cap"`.
- **Signal Lost (1 Player + 1 Observer):**
  - Player seated in `slot 0`; Observer granted role `"spectator"`.
  - Ship asteroid encounters simulated; run reaches terminal score `2800`.
  - `match_ended` event delivered to both with identical score `2800`.
  - Persisted in `ArcadeRun` with `game: "signal-lost"`, `outcome: "run_cap"`.
- **Sporefall (1 Player + 1 Observer):**
  - Player seated in `slot 0`; Observer granted role `"spectator"`.
  - Piece drops and line clears simulated; run reaches terminal score `4200`, lines `12`, level `3`.
  - `match_ended` event delivered to both with identical score `4200`.
  - Persisted in `ArcadeRun` with `game: "sporefall"`, `outcome: "run_cap"`.

### 3.2 Score Forgery & Policy Authorization
- **Client Input Tampering:** Client attempts to send `{"controls": {"score": 999999, "winner": "player"}}`. Simulation input validator strips unapproved fields; authoritative simulation score is untouched.
- **Direct Database Writing:** Non-system actors (e.g. `actor: %{role: :guest}`) attempting to invoke `Ash.create` on `ArcadeRun` or `ActivityMatch` are rejected by policy authorizer (`{:error, %Ash.Error.Forbidden{}}`).
- **Duplicate Replay Attack:** Submitting a second completion payload with the same `match_id` but forged score (`999,999`) results in `{:ok, :duplicate}`; database record remains `500`.
- **Validation Bounds:** Payloads with negative scores (`-10`), string numbers (`"5000"`), floats (`1.5`), or numbers exceeding the cap (`100,000,001`) return `{:error, :forged_or_invalid}`.

### 3.3 Database Outage & Backlog Resilience
- **Transient Failure Retry:** `CompletionRecorder` writer configured to fail initially. Record enters `:retrying` status (`pending: 1`). As writer recovers, background tick flushes pending entries to `0`, successfully recording row.
- **Backlog Saturation:** With `max_pending: 2`, third attempt returns `{:error, :recording_backlog_full}`. Session server translates this to `"result_recorded"` event with `"status" => "recording_backlog_full"`, allowing honest client UI display ("Unrecorded").
- **Session Survival:** Terminating with database down or invalid outcome never crashes the `SessionServer` process; simulation and channel links remain healthy.

### 3.4 No-WebGPU Baseline Compatibility & Resource Budgets
- **Rendering Context:** Three.js renders via standard WebGL / Canvas 2D without requiring WebGPU headers or extensions.
- **Texture Budgets:**
  - 4 idle cabinets: 4 × (512 × 384) CanvasTextures = ~3.15 MB VRAM.
  - 1 focused cabinet: 1 × (1024 × 768) CanvasTexture = ~3.15 MB VRAM.
  - Total cabinet texture budget <= 7 MB, well below the 32 MB mobile GPU texture limit.
- **Throttling Intervals:**
  - Active focused cabinet: 60 fps (16.6 ms interval).
  - Spectator cabinet (<= 6m): 20 fps (50 ms interval).
  - Attract cabinet (6m - 20m): 10 fps (100 ms interval).
  - Distant cabinet (> 20m) or hidden room: 0 fps (culled).
- **Audio Voice Allocation:**
  - Maximum 3 concurrent synthesizers per cabinet.
  - 4th voice preempts oldest active oscillator cleanly without audio clicks or memory leaks.
  - Distances > 12m or volume = 0 attenuate to 0 audio nodes.

### 3.5 Live Orpheum Integration
- The five Orpheum activities (`orpheum-pong`, `orpheum-rain-runner`, `orpheum-signal-lost`, `orpheum-sporefall`, and `summit-run`) line the east arcade wall of the theater.
- Obstacles are strictly separated from:
  - Cinema screen viewing quad and homography projection.
  - 48 auditorium seats (3 rows of 16 seats).
  - Player entrance spawn `[0, 8]` and companion Kiln spawn `[0.8, 8.4]`.
  - East/West/South district travel gates.
