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
import { createVfx } from '../game/vfx.js';
import { createInputAdapter } from '../game/input-adapter.js';
import {
  initialRiderState, neutralControls, normalizeControls, stepField, DIFFS, START_LATS, DT, TICK_HZ, RULES_VERSION,
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
  let {
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
    initialWorldPresentation = null,
  } = options;

  const localAuthority = options.authority ? options.authority === 'local' : !!standalone;

  if (!courseDocument) throw new Error('createDownhillMayhemRuntime requires a courseDocument');

  const course = loadCourse(courseDocument);
  const cfg = courseConfig(course);

  const rendering = createRendering({ viewport, initialWorldPresentation });
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
  const vfx = createVfx({ scene, camera });

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
  let hiddenTarget = null;
  let resolveReady = null;
  let localControlProvider = null;
  const readyPromise = new Promise((resolve) => { resolveReady = resolve; });
  const aiState = { lastPunchOnHumanAt: -99 };
  const stats = { topSpeed: 0, biggestAir: 0, tricksLanded: 0, decked: 0, bestCombo: 0, crashes: 0, aiKicks: 0 };
  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  const playerWorld = new THREE.Vector3();
  const sprayDir = new THREE.Vector3();
  let sprayWasGrounded = true;
  let sprayWasCrashed = false;

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
    jerseys[0] = 0x1d2430;
    jerseys[1] = 0x2f66d0;
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
    camSnap = true; shake = 0; camFov = 71;
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
    // Standalone autoplay/verification harness (13.2) may inject a control
    // provider; it never exists in the hosted multiplayer path.
    const injected = typeof localControlProvider === 'function'
      ? localControlProvider(p, { course, riders, difficulty, elapsed: raceTime, dt: DT })
      : null;
    controls[p.slot] = injected
      ? normalizeControls(injected)
      : input.consumeControls(active && !p.crashed && !p.finished);
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
    const lookDrop = Math.min(Math.max(slopeAhead, -0.2), 0.04) * 1.6;
    camLook.set(tmpV.x + fwdX * 5 - Math.cos(c.h) * p.vlat * 0.12, tmpV.y + 1.3 + lookDrop, tmpV.z + fwdZ * 5 + Math.sin(c.h) * p.vlat * 0.12);
    const targetFov = 71 + Math.min(Math.max(p.vs - 16, 0), 17) * 0.45 + (p.boosting ? 12 : 0);
    camFov += (targetFov - camFov) * Math.min(1, dt * 5);
    shake = Math.max(0, shake - dt * 1.8);
    const sh = shake * 0.28;
    camera.position.set(camPos.x + (Math.random() - 0.5) * sh, camPos.y + (Math.random() - 0.5) * sh, camPos.z + (Math.random() - 0.5) * sh);
    camera.lookAt(camLook.x, camLook.y + (Math.random() - 0.5) * sh, camLook.z);
    if (Math.abs(camera.fov - camFov) > 1e-4) { camera.fov = camFov; camera.updateProjectionMatrix(); }
    course.worldPosition(p.s, p.lat, p.y, playerWorld);
    rendering.skyDome.position.copy(camera.position);
    rendering.mountains.position.copy(camera.position);
    if (rendering.glow) {
      rendering.glow.position.copy(camera.position).addScaledVector(rendering.sunDirection, 620);
      rendering.glow.lookAt(camera.position);
    }
    rendering.updateShadowFocus(playerWorld);
    rendering.updateSun(p.s / FINISH_S, cfg.coldEdge, cfg.warmEdge);
  }

  function updateVfx(dt) {
    const p = player();
    const racing = phase === 'racing' || phase === 'finished';
    const c = course.sampleTrack(p.s);
    sprayDir.set(Math.sin(c.h), 0, Math.cos(c.h));
    if (racing && p) {
      if (p.grounded && !p.crashed && p.vs > 6) {
        const amount = Math.min(3, Math.max(1, Math.round(p.vs * 0.09 * (p.boosting ? 1.8 : 1))));
        const rear = playerWorld.clone().addScaledVector(sprayDir, -0.6);
        rear.y += 0.2;
        vfx.emit(rear, sprayDir, amount, { speed: 1.3 + p.vs * 0.07, up: 0.7 + p.vs * 0.03, spread: 0.9, life: 0.5, size: 0.085 });
      }
      if (sprayWasGrounded && p.grounded === false && !p.crashed && p.vs > 6) {
        vfx.emit(playerWorld, sprayDir, 26, { speed: 2.2 + p.vs * 0.06, up: 3.0, spread: 2.2, life: 1.6, size: 0.3 });
      }
      if (!sprayWasGrounded && p.grounded) {
        vfx.emit(playerWorld, sprayDir, 16, { speed: 3.0, up: 2.3, spread: 2.4, life: 0.85, size: 0.15 });
      }
      if (!sprayWasCrashed && p.crashed) {
        vfx.emit(playerWorld, sprayDir, 22, { speed: 4.2, up: 3.0, spread: 3.2, life: 1.1, size: 0.17 });
      }
      sprayWasGrounded = p.grounded === true;
      sprayWasCrashed = p.crashed === true;
    }
    vfx.update(dt, { player: p });
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

  // --- readiness barrier (5.7) --------------------------------------------------

  /**
   * Every rider must sit on finite, valid course support before anything may
   * be presented. Throws a named error on invalid course/grid state.
   */
  function validateGrid() {
    if (!course || !Number.isFinite(course.finishS) || course.finishS <= 0) {
      throw new Error('invalid_course');
    }
    if (!Array.isArray(riders) || riders.length !== RIDER_COUNT) {
      throw new Error('invalid_grid');
    }
    for (const r of riders) {
      if (!Number.isFinite(r.s) || !Number.isFinite(r.lat) || !Number.isFinite(r.y)) {
        throw new Error('invalid_grid');
      }
      const support = course.heightAt(r.s, r.lat);
      if (!Number.isFinite(support)) throw new Error('invalid_support');
      r.y = support;
      if (r.grounded !== true) r.grounded = true;
    }
  }

  /**
   * Prepare material programs and render exactly one hidden frame into a
   * bounded offscreen target at the visible viewport's aspect. The visible
   * framebuffer and the caller-owned renderer policy are never permanently
   * touched: the previous target and camera aspect are restored in `finally`.
   */
  function renderHiddenFrame(targetRenderer, viewport) {
    if (!targetRenderer || typeof targetRenderer.render !== 'function') return false;
    const vw = Math.max(1, Number(viewport?.width) || 1280);
    const vh = Math.max(1, Number(viewport?.height) || 720);
    const aspect = Math.max(0.5, Math.min(3, vw / vh));
    const width = Math.max(64, Math.min(256, Math.round(vw / 4) || 192));
    const height = Math.max(1, Math.round(width / aspect));
    if (!hiddenTarget || hiddenTarget.width !== width || hiddenTarget.height !== height) {
      hiddenTarget?.dispose?.();
      hiddenTarget = new THREE.WebGLRenderTarget(width, height, { depthBuffer: true, stencilBuffer: false });
    }
    const prevTarget = typeof targetRenderer.getRenderTarget === 'function'
      ? targetRenderer.getRenderTarget()
      : null;
    const prevAspect = camera.aspect;
    try {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      if (typeof targetRenderer.compile === 'function') targetRenderer.compile(scene, camera);
      if (typeof targetRenderer.setRenderTarget === 'function') targetRenderer.setRenderTarget(hiddenTarget);
      targetRenderer.render(scene, camera);
    } finally {
      camera.aspect = prevAspect;
      camera.updateProjectionMatrix();
      if (typeof targetRenderer.setRenderTarget === 'function') {
        targetRenderer.setRenderTarget(prevTarget ?? null);
      }
    }
    return true;
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

    ready: readyPromise,

    isPrepared() { return prepared; },

    /**
     * Readiness barrier (5.7): validate the grid/support, explicitly pose the
     * lobby camera, prepare material programs and render one hidden
     * full-aspect frame before anything may be presented. The runtime never
     * creates a renderer; when one is injected the caller may wrap this work
     * in a renderer transaction (`runTransaction`) so host state is restored
     * before any await.
     */
    async prepare({ signal = null, runTransaction = null, viewport: viewportOverride = null } = {}) {
      if (disposed) return { ok: false, reason: 'disposed' };
      if (prepared) return { ok: true, shared: true };

      const readViewport = () => {
        if (viewportOverride) {
          const v = typeof viewportOverride === 'function' ? viewportOverride() : viewportOverride;
          if (v && v.width > 0 && v.height > 0) return v;
        }
        const v = typeof viewport === 'function' ? viewport() : viewport;
        if (v && v.width > 0 && v.height > 0) return v;
        return { width: 1280, height: 720 };
      };

      const task = () => {
        if (signal && signal.aborted) throw new Error('aborted');
        validateGrid();
        resetCamera();
        updateCamera(1 / 60);
        renderHiddenFrame(renderer, readViewport());
      };

      try {
        if (typeof runTransaction === 'function') await runTransaction(task);
        else task();
      } catch (error) {
        if (signal && signal.aborted) return { ok: false, reason: 'aborted' };
        throw error;
      }

      if (disposed) return { ok: false, reason: 'disposed' };
      prepared = true;
      resolveReady?.();
      return { ok: true, shared: false };
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
      updateVfx(step);
      const p = player();
      audioSys.update(step, p, phase === 'racing' || phase === 'finished');
      const streakOn = p.boosting || p.vs > 25 || p.draftT > 0.55;
      const intensity = p.boosting ? 1 : Math.max(Math.min((p.vs - 25) / 7, 0.7), p.draftT * 0.4);
      if (phase === 'lobby' || phase === 'results') effects.clearStreaks();
      else effects.drawStreaks(streakOn ? intensity : 0);
    },

    present() {
      // Readiness barrier (5.7): before the hidden full frame has rendered,
      // presenting must be a strict no-op so the host can never expose an
      // unposed or partially built world.
      if (disposed || !prepared || !renderer || typeof renderer.render !== 'function') return;
      renderer.render(scene, camera);
    },

    resize(width, height) {
      if (disposed) return;
      rendering.setViewport(width, height);
      effects.resize(width, height);
      vfx.resize(width, height);
    },

    buildHumanControls(active) { return input.consumeControls(active); },
    takeEnter() { return input.takeEnter(); },
    queue(action) { input.queue(action); },

    /**
     * Standalone autoplay/verification seam (13.2). Passing `null` restores
     * the input adapter; the provider returns a shared-rules control object.
     */
    setLocalControlProvider(provider) {
      localControlProvider = typeof provider === 'function' ? provider : null;
    },

    /** Deterministic capture seam: replay a takeoff plume at a course point. */
    emitPlumeAt(s, lat) {
      const c = course.sampleTrack(s);
      sprayDir.set(Math.sin(c.h), 0, Math.cos(c.h));
      for (const [ds, n, size, spread] of [[-2, 22, 0.6, 1.8], [-1, 30, 0.72, 1.9], [0, 34, 0.8, 2.0], [1, 26, 0.62, 1.8], [2, 18, 0.5, 1.5]]) {
        course.worldPosition(s + ds, lat, course.heightAt(s + ds, lat) + 0.1, playerWorld);
        vfx.emit(playerWorld, sprayDir, n, { speed: 2.2, up: 3.3, spread, life: 2.2, size });
      }
      vfx.update(0, { player: player() });
    },

    applySnapshot,
    applyEvent() { /* discrete events are folded by the controller */ },
    applyResult(frame) {
      if (frame && Array.isArray(frame.standings)) applySnapshot({ riders: frame.standings, raceTime: frame.raceTime });
    },

    setAmbientProfile(profile) {
      if (disposed) return;
      rendering.setAmbientProfile(profile);
    },
    getAmbientProfile() {
      return rendering.getCurrentAmbientProfile();
    },
    setWorldPresentation(presentation) {
      if (disposed) return;
      rendering.setAmbientProfile(presentation);
    },
    getWorldPresentation() {
      return rendering.getCurrentAmbientProfile();
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
      vfx.dispose();
      rendering.dispose();
      hiddenTarget?.dispose?.();
      hiddenTarget = null;
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
