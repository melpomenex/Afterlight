/**
 * Downhill Mayhem host runtime
 * (integrate-multiplayer-downhill-mayhem-arcade 5.1/5.7/5.8).
 *
 * Owns a `THREE.Scene`, a `PerspectiveCamera`, the game world, riders, HUD
 * subtree, effects, audio voices and input interpretation. It does NOT create a
 * renderer, canvas, RAF loop, socket, resize listener or resize observer; the
 * host injects the renderer and drives `update`/`present`/`resize`. `dispose()`
 * is idempotent and never disposes the injected renderer or closes an injected
 * AudioContext.
 *
 * Authority modes:
 *  - `local`  — standalone: runs `shared/downhill/rules.js` fixed-step at 30 Hz
 *               with deterministic `shared/downhill/ai.js` fill.
 *  - `remote` — hosted: renders the authoritative field delivered through
 *               `applySnapshot`; `update(dt, true)` may also run the same local
 *               rules for offline/demo presentation only.
 */

import * as THREE from 'three';

import { loadCourse, courseConfig, mulberry32, terrainLabel, FINISH_S } from '../game/course.js';
import { createRendering } from '../game/rendering.js';
import { buildWorld } from '../game/world.js';
import {
  createRiderViz, updateRiderVisual, recolorRider, disposeRiderViz, JERSEY_POOL, RIVAL_NAMES,
} from '../game/riders.js';
import { createAudio, MUSIC_THEMES } from '../game/audio.js';
import { createHud, ordinal, fmtTime } from '../game/hud.js';
import { createEffects } from '../game/effects.js';
import { createInputAdapter } from '../game/input-adapter.js';
import {
  initialRiderState, neutralControls, stepField, DIFFS, START_LATS, DT, TICK_HZ, RULES_VERSION,
} from '../../../../shared/downhill/rules.js';
import { aiControl } from '../../../../shared/downhill/ai.js';

const RIDER_COUNT = 6;
const COUNT_DUR = 3.2;
const RESULTS_DELAY = 0.9;
const FORCE_FINISH_AFTER = 45;

function shuffleSeeded(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
  return arr;
}

export function createDownhillMayhemRuntime(options = {}) {
  const {
    renderer = null,
    viewport = null,
    hudHost = null,
    audio = null,
    params = {},
    courseDocument = null,
    onFatal = null,
    onExitRequest = null,
    standalone = false,
    streakCanvas = null,
    matchSeed = 1,
  } = options;

  const localAuthority = options.authority ? options.authority === 'local' : !!standalone;

  if (!courseDocument) throw new Error('createDownhillMayhemRuntime requires a courseDocument');

  const course = loadCourse(courseDocument);
  const cfg = courseConfig(course);

  const rendering = createRendering({ viewport });
  const scene = rendering.scene;
  const camera = rendering.camera;

  const world = buildWorld({ course });
  scene.add(world.group);

  const riderGroup = new THREE.Group();
  scene.add(riderGroup);

  const input = createInputAdapter();
  const hud = createHud({ root: hudHost });
  const effects = createEffects({ root: hudHost });
  if (streakCanvas) effects.attachStreakCanvas(streakCanvas);

  const audioSys = createAudio({
    context: audio && audio.context ? audio.context : null,
    destination: audio && audio.destination ? audio.destination : null,
    ownsContext: !(audio && audio.context),
    getTheme: () => MUSIC_THEMES[mode] || MUSIC_THEMES.classic,
  });

  // --- simulation state ------------------------------------------------------
  const riders = [];
  for (let slot = 0; slot < RIDER_COUNT; slot++) {
    const r = initialRiderState(slot, { difficulty: 'mayhem', isAI: slot > 0, seed: matchSeed });
    r.viz = createRiderViz(r.def, riderGroup);
    r.color = r.def.color;
    riders.push(r);
  }
  let difficulty = params.difficulty || 'mayhem';
  let mode = params.mode || course.mountain || 'classic';
  let phase = 'lobby';
  let raceTime = 0;
  let countT = 0;
  let time = 0;
  let tick = 0;
  let accum = 0;
  let camFov = 74;
  let camSnap = true;
  let shake = 0;
  let resultsAt = -1;
  let resultsShown = false;
  let disposed = false;
  let prepared = false;
  const aiState = { lastPunchOnHumanAt: -99 };
  const stats = { topSpeed: 0, biggestAir: 0, tricksLanded: 0, decked: 0, bestCombo: 0, crashes: 0, aiKicks: 0 };
  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();

  function player() { return riders[0]; }

  function modeLabel() {
    const parts = [];
    if (mode !== 'classic') parts.push(mode === 'daily' ? 'DAILY' : terrainLabel(mode));
    if (difficulty !== 'mayhem') parts.push((DIFFS[difficulty] || DIFFS.mayhem).label);
    return parts.join(' · ');
  }

  function rngFor(slot) {
    return mulberry32((matchSeed ^ ((slot + 1) * 0x9e3779b1) ^ ((tick + 1) * 0x85ebca6b)) >>> 0);
  }

  function resetRiders() {
    const nameRng = mulberry32((matchSeed * 2654435761) >>> 0);
    const names = shuffleSeeded(RIVAL_NAMES.slice(), nameRng);
    const jerseys = shuffleSeeded(JERSEY_POOL.slice(), nameRng);
    let ni = 0;
    for (let slot = 0; slot < RIDER_COUNT; slot++) {
      const fresh = initialRiderState(slot, { difficulty, isAI: slot > 0, seed: matchSeed });
      const r = riders[slot];
      const viz = r.viz;
      Object.assign(r, fresh, { viz });
      r.s = 0;
      r.lat = START_LATS[slot % START_LATS.length];
      r.y = course.heightAt(r.s, r.lat);
      r.racePos = slot + 1;
      r.color = jerseys[slot];
      r.def = { ...fresh.def };
      if (slot > 0) r.def.name = names[ni++ % names.length];
      recolorRider(viz, r.color);
      r.crashSpinX = null; r.crashSpinY = null;
    }
  }

  function resetCamera() {
    camSnap = true; shake = 0; camFov = 74;
  }

  function startRace({ difficulty: d, mode: m, matchSeed: seed } = {}) {
    if (d && DIFFS[d]) difficulty = d;
    if (m) mode = m;
    if (seed != null) matchSeed = seed;
    resetRiders();
    phase = 'countdown';
    countT = 0; raceTime = 0; accum = 0; tick = 0;
    resultsAt = -1; resultsShown = false;
    for (const k of Object.keys(stats)) stats[k] = 0;
    resetCamera();
    hud.setPhase('countdown');
    input.neutralize();
    audioSys.ensure();
    return true;
  }

  function resetToLobby() {
    resetRiders();
    phase = 'lobby';
    countT = 0; raceTime = 0; accum = 0;
    resultsAt = -1; resultsShown = false;
    resetCamera();
    hud.setPhase('lobby');
    hud.showTitle({
      best: null,
      mountain: mode,
      craftedMountain: mode === 'daily' ? 'CLASSIC' : terrainLabel(mode),
      difficulty: (DIFFS[difficulty] || DIFFS.mayhem).label,
      dailyLabel: '',
    });
    input.neutralize();
  }

  function handleEvents(events, humanSlot = 0) {
    const p = player();
    for (const ev of events) {
      if (!ev) continue;
      switch (ev.type) {
        case 'crash': {
          if (ev.slot === humanSlot) {
            if (ev.cause === 'punched' || ev.cause === 'kicked') effects.hitFlash();
            if (ev.cause === 'tree') audioSys.treeSnd(1);
            else if (ev.cause === 'rock') audioSys.rockSnd(1);
            else audioSys.crashSnd(1, ev.cause === 'punched' || ev.cause === 'kicked');
            effects.popup(ev.cause === 'punched' ? 'PUNCHED!' : ev.cause === 'kicked' ? 'KICKED!'
              : ev.cause === 'tree' ? 'TREE!' : ev.cause === 'rock' ? 'ROCK!'
              : ev.cause === 'bail' ? 'BAILED MID-TRICK!' : ev.cause === 'hard' ? 'FLAT LANDING!'
              : ev.cause === 'wall' ? 'INTO THE WALL!' : 'CRASHED!', 'dm-bad');
            stats.crashes++;
            shake += 0.7;
          }
          break;
        }
        case 'strike': {
          if (!ev.landed) { audioSys.whoosh(); break; }
          const near = ev.slot === humanSlot || ev.targetSlot === humanSlot;
          if (near) { audioSys.strikeLand(1, ev.kind); }
          if (ev.slot === humanSlot) { stats.decked++; effects.popup(ev.kind === 'kick' ? 'BOOT!' : 'POW!', 'dm-pow'); }
          break;
        }
        case 'trick_complete': {
          if (ev.slot === humanSlot) { audioSys.blip(640 * Math.pow(1.13, ev.chain), 0.07, 0.22, 'triangle'); if (ev.chain > 1) effects.popup('COMBO ×' + ev.chain + '!', 'dm-small'); }
          break;
        }
        case 'landing': {
          if (ev.slot === humanSlot) {
            if (ev.grade) effects.popup(ev.grade, 'dm-small');
            if (ev.saved) audioSys.chime();
          }
          break;
        }
        case 'hop': if (ev.slot === humanSlot) audioSys.hopSnd(); break;
        case 'rough': if (ev.slot === humanSlot) shake = Math.max(shake, ev.zone === 1 ? 0.07 : 0.14); break;
        case 'finish': if (ev.slot === humanSlot) handleHumanFinish(); break;
        default: break;
      }
    }
    // Track a few result stats from live state.
    for (const r of riders) if (r.isHuman) stats.topSpeed = Math.max(stats.topSpeed, r.vs * 3.6);
    void p;
  }

  function handleHumanFinish() {
    const p = player();
    phase = 'finished';
    resultsAt = time + RESULTS_DELAY;
    audioSys.stopMusic();
    audioSys.jingle(p.finishTime <= 60);
    effects.popup(ordinal(p.racePos || 1) + ' PLACE!', '');
  }

  function stepOnce() {
    const p = player();
    const active = phase === 'racing' || phase === 'finished';
    const controls = {};
    controls[p.slot] = input.consumeControls(active && !p.crashed && !p.finished);
    const aiEvents = [];
    const rngCache = {};
    const ctx = {
      difficulty,
      elapsed: raceTime,
      finishS: course.finishS,
      aiControl: (c, r) => aiControl(c, r, {
        riders,
        difficulty,
        elapsed: raceTime,
        reference: p,
        rng: (rngCache[r.slot] || (rngCache[r.slot] = rngFor(r.slot))),
        events: aiEvents,
        state: aiState,
        stats,
        dt: DT,
      }),
    };
    const events = stepField(course, riders, controls, ctx);
    handleEvents(events.concat(aiEvents));
    tick++;
  }

  function advanceSim(dt) {
    accum += dt;
    let steps = 0;
    while (accum >= DT && steps < 4) { stepOnce(); accum -= DT; steps++; }
    if (steps === 4) accum = 0;
  }

  function applySnapshot(frame) {
    if (!frame || !Array.isArray(frame.riders)) return;
    for (const s of frame.riders) {
      const r = riders[s.slot];
      if (!r) continue;
      for (const k of ['s', 'lat', 'y', 'vs', 'vlat', 'vy', 'grounded', 'crashed', 'finished',
        'finishTime', 'racePos', 'steerPos', 'lean', 'pitch', 'airTime', 'trick', 'trickT',
        'meter', 'boosting', 'invuln', 'punchAnimT', 'kickAnimT', 'strikeSide', 'windupT', 'revengeT']) {
        if (s[k] !== undefined) r[k] = s[k];
      }
      if (s.name && r.def) r.def.name = s.name;
    }
    if (frame.phase) { phase = frame.phase; hud.setPhase(phase === 'finished' ? 'racing' : phase); }
    if (typeof frame.raceTime === 'number') raceTime = frame.raceTime;
  }

  function updateCamera(dt) {
    const p = player();
    const c = course.sampleTrack(p.s);
    const fwdX = Math.sin(c.h), fwdZ = Math.cos(c.h);
    const tmpV = new THREE.Vector3();
    course.worldPosition(p.s, p.lat, p.y, tmpV);
    const dist = 5.9 + Math.min(Math.max(p.vs * 0.03, 0), 0.9), h = 2.35;
    const dx = tmpV.x - fwdX * dist, dz = tmpV.z - fwdZ * dist;
    const gBehind = course.heightAt(Math.max(p.s - dist, -78), p.lat * 0.7);
    const dy = Math.max(tmpV.y + h, gBehind + 1.25);
    if (camSnap) { camPos.set(dx, dy, dz); camSnap = false; }
    else { const k = 1 - Math.exp(-dt * 7.5); camPos.x += (dx - camPos.x) * k; camPos.y += (dy - camPos.y) * k; camPos.z += (dz - camPos.z) * k; }
    const slopeAhead = (course.heightAt(p.s + 26, p.lat * 0.5) - course.heightAt(p.s + 5, p.lat * 0.5)) / 21;
    const lookDrop = Math.min(Math.max(slopeAhead, -0.34), 0.05) * 7;
    camLook.set(tmpV.x + fwdX * 5 - Math.cos(c.h) * p.vlat * 0.12, tmpV.y + 1.05 + lookDrop, tmpV.z + fwdZ * 5 + Math.sin(c.h) * p.vlat * 0.12);
    const targetFov = 74 + Math.min(Math.max(p.vs - 16, 0), 17) * 0.55 + (p.boosting ? 13 : 0);
    camFov += (targetFov - camFov) * Math.min(1, dt * 5);
    shake = Math.max(0, shake - dt * 1.8);
    const sh = shake * 0.28;
    camera.position.set(camPos.x + (Math.random() - 0.5) * sh, camPos.y + (Math.random() - 0.5) * sh, camPos.z + (Math.random() - 0.5) * sh);
    camera.lookAt(camLook.x, camLook.y + (Math.random() - 0.5) * sh, camLook.z);
    if (Math.abs(camera.fov - camFov) > 1e-4) { camera.fov = camFov; camera.updateProjectionMatrix(); }
    rendering.skyDome.position.copy(camera.position);
    rendering.mountains.position.set(camera.position.x, camera.position.y - 22, camera.position.z);
    rendering.updateSun(p.s / FINISH_S, cfg.coldEdge, cfg.warmEdge);
  }

  function updateHud(dt) {
    const p = player();
    const racing = phase === 'racing' || phase === 'finished' || phase === 'countdown';
    let gapAhead = null, gapBehind = null;
    if (phase === 'racing' && !p.finished && raceTime > 2) {
      if (p.racePos > 1) {
        const a = riders.find((o) => o.racePos === p.racePos - 1);
        if (a) gapAhead = { name: a.def.name, seconds: Math.max(0, (a.s - p.s) / Math.max(p.vs, 8)) };
      } else {
        const b = riders.find((o) => o.racePos === 2);
        if (b) gapBehind = { name: b.def.name, seconds: Math.max(0, (p.s - b.s) / Math.max(b.vs, 8)) };
      }
    }
    hud.updateRacing({
      player: p, riders, raceTime, racing, modeLabel: modeLabel(), target: '',
      gapAhead, gapBehind,
    });
    void dt;
  }

  const runtime = {
    get course() { return course; },
    get scene() { return scene; },
    get camera() { return camera; },
    get riders() { return riders; },
    get input() { return input; },
    get world() { return world; },
    get audio() { return audioSys; },
    get hud() { return hud; },
    get effects() { return effects; },
    get time() { return time; },
    get tick() { return tick; },
    get phase() { return phase; },
    get raceTime() { return raceTime; },
    get stats() { return stats; },
    get localAuthority() { return localAuthority; },
    get RULES_VERSION() { return RULES_VERSION; },

    ready: Promise.resolve(),

    isPrepared() { return prepared; },

    /**
     * Build/pose the world. The world is built at construction here (smaller
     * than Kart's), so this is a no-op pose barrier that validates the camera
     * and returns once the scene can render.
     */
    async prepare() {
      if (disposed) return;
      prepared = true;
      resetCamera();
      updateCamera(1 / 60);
    },

    enter() {
      if (disposed) return;
      resetToLobby();
    },

    startRace(opts) { return startRace(opts); },
    resetToLobby,

    setMode(m) { mode = m; },
    setDifficulty(d) { if (DIFFS[d]) difficulty = d; },
    setMuted(on) { audioSys.setMuted(on); },
    modeLabel,
    terrainLabel,

    /** Advance one frame. `authoritative` forces local stepping in remote mode. */
    update(dt, authoritative = false) {
      if (disposed) return;
      let step = Number.isFinite(dt) ? Math.min(Math.max(dt, 0), 0.05) : 0;
      if (step <= 0) step = 0.0001;
      time += step;

      if (phase === 'countdown') {
        countT += step;
        const remain = COUNT_DUR - countT;
        if (remain > 0) {
          const digit = remain <= 3 ? Math.ceil(remain) : null;
          hud.setCountdown(digit);
        } else {
          hud.setCountdown(null);
          phase = 'racing'; raceTime = 0;
          effects.popup('GO!', 'dm-go');
          audioSys.countBeep(true);
          audioSys.startMusic();
          hud.setPhase('racing');
        }
      }

      if (phase === 'racing' || phase === 'finished') {
        raceTime += step;
        if (localAuthority || authoritative) advanceSim(step);
        else if (phase === 'finished') { /* remote stays snapshot-driven */ }

        if (phase === 'finished') {
          if (raceTime > (player().finishTime ?? 0) + FORCE_FINISH_AFTER) {
            for (const r of riders) if (!r.finished) { r.finished = true; r.finishTime = raceTime; }
          }
          if (!resultsShown && resultsAt >= 0 && time >= resultsAt) {
            resultsShown = true;
            const order = riders.slice().sort((a, b) => {
              if (a.finished && b.finished) return a.finishTime - b.finishTime;
              if (a.finished) return -1; if (b.finished) return 1;
              return b.s - a.s;
            });
            order.forEach((r, i) => { r.racePos = i + 1; });
            phase = 'results';
            hud.setPhase('results');
            hud.showResults({ order, player: player(), modeLabel: modeLabel(), best: null });
          }
        }
      }

      if (phase !== 'lobby' && phase !== 'results') updateHud(step);
      for (const r of riders) updateRiderVisual(r, step, { course, time });
      updateCamera(step);
      const p = player();
      audioSys.update(step, p, phase === 'racing' || phase === 'finished');
      const streakOn = p.boosting || p.vs > 25 || p.draftT > 0.55;
      const intensity = p.boosting ? 1 : Math.max(Math.min((p.vs - 25) / 7, 0.7), p.draftT * 0.4);
      if (phase === 'lobby' || phase === 'results') effects.clearStreaks();
      else effects.drawStreaks(streakOn ? intensity : 0);
    },

    present() {
      if (disposed || !renderer || typeof renderer.render !== 'function') return;
      renderer.render(scene, camera);
    },

    resize(width, height) {
      if (disposed) return;
      rendering.setViewport(width, height);
      effects.resize(width, height);
    },

    buildHumanControls(active) { return input.consumeControls(active); },
    takeEnter() { return input.takeEnter(); },
    queue(action) { input.queue(action); },

    applySnapshot,
    applyEvent() { /* discrete events are folded by the controller */ },
    applyResult(frame) {
      if (frame && Array.isArray(frame.standings)) applySnapshot({ riders: frame.standings, raceTime: frame.raceTime });
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      input.neutralize();
      effects.dispose();
      hud.dispose();
      audioSys.dispose(); // never closes an injected context
      for (const r of riders) disposeRiderViz(r.viz);
      riders.length = 0;
      world.dispose();
      rendering.dispose();
      if (riderGroup.parent) riderGroup.parent.remove(riderGroup);
      prepared = false;
    },
    get disposed() { return disposed; },
  };

  // Pose the spawn so a host can render the runtime immediately, even before
  // `prepare()`/`enter()` is called.
  resetToLobby();
  updateCamera(1 / 60);

  void onFatal; void onExitRequest;
  return runtime;
}
