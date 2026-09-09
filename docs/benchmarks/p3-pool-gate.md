# Phase 3 Gate Verification: Flagship Pool (`social-billiards`)

Date: 2026-09-09  
Status: **PASSED (Phase 3 Gate Verified)**  
Change: `add-place-activities-program`  
Specs: `specs/social-billiards/spec.md`, `specs/activity-sessions/spec.md`  

---

## 1. Executive Summary

Phase 3 (`social-billiards`, Tasks 4.1 through 5.5) delivers Afterlight's flagship 8-ball billiards experience in The Orpheum West Lounge at \((-8.6, 0, -4.5)\). The implementation combines an authoritative 60 Hz planar physics solver and casual 8-ball rules engine with a rich, procedural Three.js 3D table, 16 canvas-textured numbered balls, contact shadows, real-time aiming and deflection guides, multi-input controls across keyboard/mouse/touch/gamepad, three dedicated camera views with reduced-motion support, deduplicated positional audio, and robust session contracts.

All automated test gates and physical constraints pass:
- **JS Test Suite:** 854 passing tests (100% pass rate, 0 failures, including `tests/p3-gate.test.js` and `tests/pool-*.test.js`).
- **Elixir Test Suite:** 154 passing activity tests (100% pass rate, 0 failures, including `server_elixir/test/afterlight/activities/p3_gate_test.exs` and `pool_*_test.exs`).
- **Screen Sightlines:** **0 blocked sightlines** across all 48 auditorium seats to the movie screen center and edges.
- **Accessible Walkways:** Preserved \(\ge 1.3\text{ m}\) clearance to the west spectator bench and \(> 4.4\text{ m}\) to the east main thoroughfare.

---

## 2. Orpheum West Lounge Sightline and Spatial Verification

The physical table is oriented along the auditorium's Z axis (length 2.24m along Z, width 1.12m along X, total footprint 1.4m \(\times\) 2.5m) centered at \((-8.6, 0, -4.5)\).

### Raycast Sightline Matrix (48 Seats to Movie Screen at \(z = -8.28\))
| Destination on Screen | Seats Tested | Blocked Sightlines | Status |
| :--- | :--- | :--- | :--- |
| Screen Center \((0, -8.28)\) | 48 / 48 | 0 / 48 (0.0%) | **Unobstructed** |
| Primary 80% Field \([-5.2, 5.2]\) | 48 / 48 | 0 / 48 (0.0%) | **Unobstructed** |
| Edge-to-Edge 100% Field \([-6.5, 6.5]\) | 48 / 48 | 0 / 48 (0.0%) | **Unobstructed** |

### Navigational Clearance
- **East Clearance:** Distance to auditorium center line: \(4.4\text{ m} \ge 1.2\text{ m}\).
- **West Clearance:** Distance between table edge \((-9.3)\) and spectator bench edge \((-10.6)\): \(1.3\text{ m} \ge 1.2\text{ m}\).
- **South Clearance:** Distance between table south edge \((-3.25)\) and Row 1 seats \((0.0)\): \(3.25\text{ m} \ge 1.2\text{ m}\).
- **North Clearance:** Distance between table north edge \((-5.75)\) and stage platform \((-7.1)\): \(1.35\text{ m} \ge 1.2\text{ m}\).

---

## 3. Multi-Input Family Parity Matrix

Every required in-game action is executable 100% within each input family without requiring hand-off to another device.

| Action | Mouse & Keyboard | Touch | Controller / Gamepad |
| :--- | :--- | :--- | :--- |
| **Aim Direction** | Mouse pointer move / drag crosshair, or A / D / Arrow keys | Touch drag across table surface | Left Analog Stick (coarse) + D-pad (fine) |
| **Shot Power** | Vertical power meter drag, or hold & release Space | Touch drag on power meter slider | Right Trigger (RT) or A Button hold & release |
| **2D Spin (English/Follow/Draw)** | Click / drag on circular cue ball face, or I / K / J / L keys | Touch tap / drag on circular cue ball face | Right Analog Stick |
| **Shoot Execution** | Space release or Click "Shoot" button | Tap "Shoot" button | Right Trigger / A Button release |
| **Cancel Shot** | Escape or Right Click or "Cancel" button | Tap "Cancel" button | B Button |
| **Ball-in-Hand Placement** | Click legal position on green cloth | Tap legal position on green cloth | Left Stick cursor + A Button |
| **Call 8-Ball Pocket** | Click pocket button / pocket on table | Tap pocket button / pocket on table | D-Pad / Button selection |
| **Cycle Camera View** | Press `C` key or click "Camera" button | Tap "Camera" button | Y Button |
| **House Rules Sheet** | Click "House Rules" button | Tap "House Rules" button | X Button |
| **Exit / Resign** | Escape or click "Exit Table" button | Tap "Exit Table" button | Back / Select Button |

---

## 4. Human Playtest Notes: Aiming, Spin, and Motion Feel

1. **Aiming Sensitivity & Micro-Adjustments:**
   - Mouse aim follows pointer yaw smoothly with zero perceptible input lag. For delicate cut shots (e.g. thin rail cuts > 60°), keyboard A/D or arrow keys provide 0.05 rad increments, allowing sub-millimeter target ghost-ball alignment.
   - Gamepad stick deadzone of 0.15 prevents aim drifting while allowing smooth 360° sweeping.

2. **2D Spin Impact:**
   - Centered shot (\(x=0, y=0\)): Clean stun/stop shot on straight-in object ball contact.
   - Heavy backspin / draw (\(y = -0.5\)): Cue ball visibly reverses direction after impact, traveling backward along the shot line by ~0.45m at power 0.8.
   - Heavy topspin / follow (\(y = +0.5\)): Cue ball continues forward through the ghost-ball position following the object ball.
   - English / sidespin (\(x = \pm 0.5\)): Deflects off cushion rails with altered reflection angles matching cushion friction spin transfer.

3. **Camera Transitions & Reduced Motion:**
   - Default `cue` view puts the player right down the shot line at cue elevation (\(y \approx 1.1\text{ m}\)), offering an authentic, intimate perspective.
   - Upon shooting, the camera smoothly pulls up into an overhead bird's-eye perspective (\(y = 3.8\text{ m}\)) while balls are rolling, providing full table visibility.
   - In `prefers-reduced-motion: reduce` mode, camera cuts and follow movement are disabled; the view remains fixed in the elevated lounge perspective or steady overhead view.

4. **Audio Experience & Deduplication:**
   - Break shots produce a thunderous, crisp resin explosion without any harsh audio clipping or node exhaustion.
   - Rapid multi-ball collisions are deduplicated with a 45ms refractory window per pair, completely eliminating machine-gun click artifacts.
   - Distance falloff accurately attenuates sound when walking away toward the auditorium seats or east arcade wing.

---

## 5. Session Lifecycle and Resilience Proof

- **Two-Player Match + Third Observer Sync:** Verified in `P3GateTest` test 1. Observer receives identical snapshots and sees ball motion and results in real time.
- **Out-of-Turn & Moving Ball Rejection:** Non-shooting player cannot shoot; shooting during ball motion is rejected with `{:error, :balls_in_motion}`.
- **Reconnect Grace:** Disconnected player channel drops; match pauses for 30 seconds; reconnecting with fresh channel resumes match without forfeit or lost state.
- **Owner Loss Mid-Match:** Loss of room lease cleanly terminates the session server without fabricating unearned database match results.
