/**
 * Downhill Mayhem standalone shell
 * (integrate-multiplayer-downhill-mayhem-arcade 13.1/13.2).
 *
 * This is the ONLY module that creates a WebGLRenderer and the ONLY module that
 * owns a requestAnimationFrame loop. It drives the same `game/*` modules and
 * `host/runtime.js` the hosted Afterlight path uses, with a LOCAL authoritative
 * simulation and deterministic local AI. Standalone-only features — PB/ghost
 * storage, challenge links and GoatCounter analytics — live here and never in
 * the hosted runtime.
 */

import * as THREE from 'three';

import { createDownhillMayhemRuntime } from './host/runtime.js';
import {
  generateCourseDocument, dailySeedFromDate, MOUNTAINS, terrainLabel, mulberry32,
} from './game/course.js';
import { DIFFS } from '../../../shared/downhill/rules.js';
import { aiControl } from '../../../shared/downhill/ai.js';

const TERRAIN_ORDER = ['classic', 'timber', 'rock'];

export function bootStandalone() {
  const wrap = document.getElementById('wrap');
  const fxCanvas = document.getElementById('fx');
  const hudHost = document.getElementById('dm-hud-host') || document.body;
  const fatal = document.getElementById('fatal');

  // Optional standalone analytics (skipped on file://, localhost and LANs).
  initAnalytics();

  if (typeof THREE === 'undefined' || !THREE.WebGLRenderer) {
    if (fatal) { fatal.hidden = false; fatal.textContent = 'DOWNHILL MAYHEM could not start its 3D engine.'; }
    return;
  }

  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.setSize(innerWidth, innerHeight);
  if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.id = 'gl';
  if (wrap) wrap.prepend(renderer.domElement);

  let runtime = null;
  let mode = 'classic';
  let difficulty = 'mayhem';
  let dailySeed = null;
  let challenge = parseChallenge();
  if (challenge) {
    mode = challenge.mode;
    difficulty = challenge.difficulty;
    if (mode === 'daily') dailySeed = challenge.seed;
  }
  let paused = false;
  let lastPB = null;
  let recorded = false;
  let best = {};
  let ghostRec = [];
  let ghostAccum = 0;
  const GHOST_DT = 0.1;

  // Standalone autoplay harness (13.2): deterministic local AI drives rider 0
  // through a full race for automated verification. Never part of the hosted
  // multiplayer path (the authority there is the server).
  let autopilotOn = false;
  let autopilotRng = null;
  const autopilotEvents = [];
  const autopilotState = { lastPunchOnHumanAt: -99 };
  const autopilotStats = { crashes: 0, aiKicks: 0 };

  const state = {
    get phase() { return runtime ? runtime.phase : 'boot'; },
    get raceTime() { return runtime ? runtime.raceTime : 0; },
    get mode() { return mode; },
    get difficulty() { return difficulty; },
    get riders() { return runtime ? runtime.riders : []; },
    get player() { return runtime ? runtime.riders[0] : null; },
  };

  function courseDocFor(m) {
    if (m === 'daily') { dailySeed = dailySeed || dailySeedFromDate(); return generateCourseDocument({ mountain: 'daily', dailySeed }); }
    return generateCourseDocument({ mountain: m });
  }

  function bestKey() {
    const suffix = (DIFFS[difficulty] || DIFFS.mayhem).suffix;
    const d = mode === 'daily' ? 'd' : 'c';
    const seed = mode === 'daily' ? dailySeed : (MOUNTAINS[mode] ? MOUNTAINS[mode].seed : '');
    return 'downhill-mayhem-best-' + d + seed + suffix;
  }
  function loadBest() {
    try { best = JSON.parse(localStorage.getItem(bestKey()) || '{}') || {}; } catch { best = {}; }
    lastPB = best.time ?? null;
  }
  function saveBest() { try { localStorage.setItem(bestKey(), JSON.stringify(best)); } catch { /* offline */ } }

  function challengeActive() { return !!challenge && challenge.mode === mode && challenge.difficulty === difficulty; }

  function refreshTitle() {
    if (!runtime) return;
    runtime.hud.showTitle({
      best: best.time ?? null,
      challengeActive: challengeActive(),
      challengeLabel: challenge ? fmtTimeShort(challenge.time) : '',
      mountain: mode,
      craftedMountain: mode === 'daily' ? (lastPB != null ? 'DAILY' : 'CLASSIC') : terrainLabel(mode),
      difficulty: (DIFFS[difficulty] || DIFFS.mayhem).label,
      dailyLabel: mode === 'daily' && dailySeed ? seedLabel(dailySeed) : '',
      onDaily: mode === 'daily',
    });
  }

  function buildRuntime() {
    if (runtime) { runtime.dispose(); runtime = null; }
    runtime = createDownhillMayhemRuntime({
      renderer,
      viewport: () => ({ width: innerWidth, height: innerHeight }),
      hudHost,
      courseDocument: courseDocFor(mode),
      authority: 'local',
      standalone: true,
      streakCanvas: fxCanvas,
      params: { difficulty, mode },
      matchSeed: mode === 'daily' ? (dailySeed >>> 0) : ((MOUNTAINS[mode] && MOUNTAINS[mode].seed) || 1),
    });
    loadBest();
    runtime.resetToLobby();
    refreshTitle();
    runtime.resize(innerWidth, innerHeight);
    // Readiness barrier: pose, validate the grid and render one hidden frame
    // before the first visible present. Synchronous here (no transaction).
    void runtime.prepare();
    runtime.setLocalControlProvider((r, ctx) => {
      if (!autopilotOn) return null;
      if (!autopilotRng) autopilotRng = mulberry32((Date.now() ^ 0x9e3779) >>> 0);
      const control = aiControl(ctx.course, r, {
        riders: ctx.riders,
        difficulty,
        elapsed: ctx.elapsed,
        reference: r,
        rng: autopilotRng,
        events: autopilotEvents,
        state: autopilotState,
        stats: autopilotStats,
        dt: ctx.dt,
      });
      control.boost = false; // harness parity with the original autoplay
      return control;
    });
  }

  function startRace() {
    recorded = false;
    ghostRec = [];
    ghostAccum = 0;
    runtime.startRace({ difficulty, mode });
    runtime.hud.setPhase('countdown');
  }

  function goTitle() {
    runtime.resetToLobby();
    refreshTitle();
  }

  function setMode(m) {
    if (!TERRAIN_ORDER.includes(m) && m !== 'daily') return;
    if (m === mode) return;
    mode = m;
    if (mode !== 'daily') dailySeed = null;
    buildRuntime();
  }

  function cycleMountain(dir) {
    const cur = mode === 'daily' ? 'classic' : mode;
    const i = TERRAIN_ORDER.indexOf(cur);
    setMode(TERRAIN_ORDER[(i + dir + TERRAIN_ORDER.length) % TERRAIN_ORDER.length]);
  }

  function setDifficulty(d) {
    if (!DIFFS[d] || d === difficulty) return;
    difficulty = d;
    if (runtime) runtime.setDifficulty(d);
    loadBest();
    refreshTitle();
  }
  function cycleDiff(dir) {
    const order = ['chill', 'mayhem', 'brutal'];
    const i = order.indexOf(difficulty);
    setDifficulty(order[(i + dir + order.length) % order.length]);
  }

  function parseChallenge() {
    try {
      const raw = new URLSearchParams(location.search).get('c');
      if (!raw) return null;
      let m;
      if ((m = raw.match(/^c-(\d+(?:\.\d+)?)$/))) return { seed: 20030723, time: +m[1], mode: 'classic', difficulty: 'mayhem' };
      if ((m = raw.match(/^d-(\d{8})-(\d+(?:\.\d+)?)$/))) return { seed: +m[1], time: +m[2], mode: 'daily', difficulty: 'mayhem' };
      if ((m = raw.match(/^x-(\d+)-(\d+(?:\.\d+)?)-(chill|mayhem|brutal)$/))) return { seed: +m[1], time: +m[2], difficulty: m[3], mode: terrainForSeed(+m[1]) };
      return null;
    } catch { return null; }
  }
  function terrainForSeed(seed) {
    for (const id in MOUNTAINS) if (MOUNTAINS[id].seed === seed) return id;
    return 'daily';
  }

  function onRaceFinished() {
    if (recorded) return;
    recorded = true;
    const p = runtime.riders[0];
    if (!p || !p.finished) return;
    const newPB = !best.time || p.finishTime < best.time;
    if (newPB) {
      best.time = p.finishTime;
      // (s, lat, y) at 10 Hz, quantized like the source ghost.
      best.ghost = ghostRec.map((v) => Math.round(v * 10) / 10);
      saveBest();
    }
    if (challengeActive()) {
      p.chalDiff = p.finishTime - challenge.time;
      runtime.effects.popup(p.chalDiff < 0 ? 'CHALLENGE BEATEN!' : 'CHALLENGE MISSED +' + p.chalDiff.toFixed(2) + 's', 'dm-pb');
    }
    // The runtime shows the results panel on its own delay.
    setTimeout(() => { if (runtime) runtime.hud.showResults({
      order: runtime.riders.slice().sort((a, b) => {
        if (a.finished && b.finished) return a.finishTime - b.finishTime;
        if (a.finished) return -1; if (b.finished) return 1;
        return b.s - a.s;
      }),
      player: p, modeLabel: modeLabel(), best: best.time ?? null, challenge: challengeActive() ? challenge : null,
    }); }, 950);
  }

  function modeLabel() {
    const parts = [terrainLabel(mode)];
    if (mode === 'daily' && dailySeed) parts.push(seedLabel(dailySeed));
    if (difficulty !== 'mayhem') parts.push((DIFFS[difficulty] || DIFFS.mayhem).label);
    return parts.join(' · ');
  }

  function handleAction(action) {
    if (!runtime) return;
    switch (action) {
      case 'enter':
        if (state.phase === 'lobby') startRace();
        else if (state.phase === 'results') startRace();
        break;
      case 'restart': if (state.phase !== 'lobby') startRace(); break;
      case 'title': if (state.phase !== 'lobby') goTitle(); break;
      case 'daily': if (state.phase === 'lobby') setMode('daily'); break;
      case 'classic':
        if (state.phase === 'lobby') setMode('classic');
        else runtime.queue('heel');
        break;
      case 'mountain-left': if (state.phase === 'lobby') cycleMountain(-1); break;
      case 'mountain-right': if (state.phase === 'lobby') cycleMountain(1); break;
      case 'diff-up': if (state.phase === 'lobby') cycleDiff(1); break;
      case 'diff-down': if (state.phase === 'lobby') cycleDiff(-1); break;
      case 'mute': runtime.setMuted(!runtime.audio.muted); break;
      default: break;
    }
  }

  // --- input wiring ----------------------------------------------------------
  const onKeyDown = (e) => {
    if (runtime && runtime.audio && !runtime.audio.started) runtime.audio.ensure();
    const action = runtime.input.handleKeyDown(e);
    if (action) handleAction(action);
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', (e) => runtime && runtime.input.handleKeyUp(e));
  window.addEventListener('blur', () => runtime && runtime.input.neutralize());
  document.addEventListener('visibilitychange', () => { paused = document.hidden; });

  // lightweight touch controls
  const bindHold = (id, on, off) => {
    const el = document.getElementById(id);
    if (!el) return;
    const start = (e) => { if (runtime) runtime.input.setKey(on, true); el.classList.add('on'); if (e && e.preventDefault) e.preventDefault(); };
    const end = () => { if (runtime) runtime.input.setKey(on, false); el.classList.remove('on'); };
    el.addEventListener('pointerdown', start);
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    void off;
  };
  bindHold('tLeft', 'left'); bindHold('tRight', 'right'); bindHold('tBrake', 'brake');
  const bindTap = (id, action) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('pointerdown', (e) => {
      if (e && e.preventDefault) e.preventDefault();
      if (!runtime) return;
      if (state.phase === 'lobby' || state.phase === 'results') handleAction('enter');
      else runtime.queue(action);
    });
  };
  bindTap('tJump', 'hop'); bindTap('tPunch', 'punch'); bindTap('tKick', 'kick');
  bindTap('tT1', 'nohander'); bindTap('tT2', 'superman'); bindTap('tT3', 'heel'); bindTap('tT4', 'backflip');
  const boostEl = document.getElementById('tBoost');
  if (boostEl) boostEl.addEventListener('pointerdown', (e) => { e.preventDefault(); if (runtime) runtime.input.toggleBoostLatch(); });

  window.addEventListener('resize', () => {
    renderer.setSize(innerWidth, innerHeight);
    if (runtime) runtime.resize(innerWidth, innerHeight);
  });

  // --- frame loop (the ONLY requestAnimationFrame in the game) ----------------
  let last = performance.now();
  let lastFinished = false;
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (dt <= 0) dt = 0.0001;
    if (!runtime) return;
    if (paused) { runtime.present(); return; }
    runtime.input.pollGamepad();
    runtime.update(dt, true);
    const p = runtime.riders[0];
    if (runtime.phase === 'racing' && p && !p.finished) {
      ghostAccum += dt;
      while (ghostAccum >= GHOST_DT) { ghostRec.push(p.s, p.lat, p.y); ghostAccum -= GHOST_DT; }
    }
    if (runtime.phase === 'finished' && !lastFinished) onRaceFinished();
    lastFinished = runtime.phase === 'finished';
    runtime.present();
  }

  buildRuntime();
  requestAnimationFrame(frame);

  // Standalone test/debug surface (mirrors the original `window.GAME` hook).
  window.GAME = {
    get state() { return state.phase; },
    get riders() { return runtime.riders; },
    get player() { return runtime.riders[0]; },
    get raceTime() { return runtime.raceTime; },
    get mode() { return mode; },
    get difficulty() { return difficulty; },
    get phase() { return state.phase; },
    get best() { return best; },
    get scene() { return runtime.scene; },
    get challenges() { return challenge; },
    startMode(m, d) { if (d) setDifficulty(d); setMode(m); startRace(); },
    fastForward(seconds) {
      const steps = Math.round(seconds * 60);
      for (let i = 0; i < steps; i++) {
        runtime.update(1 / 60, true);
        if (runtime.phase === 'finished') { onRaceFinished(); break; }
      }
    },
    // Autoplay/verification harness (13.2): the same hook shape the original
    // offline file exposed, so external harnesses keep working.
    test: {
      get autopilotOn() { return autopilotOn; },
      autopilot(on) { autopilotOn = Boolean(on); },
      placeAt(s, lat) {
        const p = runtime.riders[0];
        p.s = s;
        p.lat = lat;
        p.y = runtime.course.heightAt(s, lat);
        p.grounded = true;
        p.crashed = false;
        p.crashT = 0;
        p.trick = null;
        p.invuln = 0;
        p.airTime = 0;
        return p;
      },
      skipTo(s) {
        const p = runtime.riders[0];
        const lat = Math.max(-6, Math.min(6, p.lat));
        return window.GAME.test.placeAt(s, lat);
      },
      launch() {
        const p = runtime.riders[0];
        p.grounded = false;
        p.vy = 6.5;
        p.y += 0.3;
        p.airTime = 0.3;
        return p;
      },
      spawnRivalNear(index, ds = 2, dlat = 0.5) {
        const p = runtime.riders[0];
        const r = runtime.riders[index || 1];
        if (!r) return null;
        r.s = p.s + ds;
        r.lat = Math.max(-7, Math.min(7, p.lat + dlat));
        r.y = runtime.course.heightAt(r.s, r.lat);
        r.crashed = false;
        r.invuln = 0;
        r.grounded = true;
        r.finished = false;
        r.vs = p.vs;
        r.vlat = 0;
        r.vy = 0;
        return r;
      },
      setDifficulty(d) { setDifficulty(d); },
      startMode(m, d) { if (d) setDifficulty(d); setMode(m); startRace(); },
      riderNames() { return runtime.riders.filter((r) => !r.isPlayer).map((r) => r.def.name); },
      /**
       * Autoplay a full local race (countdown through results). Returns a
       * bounded summary; used by the standalone browser gate.
       */
      fullRace({ maxSeconds = 240 } = {}) {
        autopilotOn = true;
        try {
          if (runtime.phase === 'lobby' || runtime.phase === 'results') startRace();
          const steps = Math.round(maxSeconds * 60);
          for (let i = 0; i < steps; i++) {
            runtime.update(1 / 60, true);
            if (runtime.phase === 'results') break;
          }
        } finally {
          autopilotOn = false;
        }
        return {
          phase: runtime.phase,
          raceTime: runtime.raceTime,
          riders: runtime.riders.map((r) => ({
            slot: r.slot,
            isAI: r.isAI,
            finished: r.finished,
            timeMs: r.finished ? Math.round((r.finishTime ?? 0) * 1000) : null,
            s: r.s,
          })),
        };
      },
      fastForward(seconds) { window.GAME.fastForward(seconds); },
    },
  };
}

function fmtTimeShort(t) {
  const m = Math.floor(t / 60), s = t - m * 60;
  return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2);
}
function seedLabel(s) {
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return months[(Math.floor(s / 100) % 100) - 1] + ' ' + (s % 100);
}

/** Cookieless, standalone-only milestone counting (never in the hosted path). */
function initAnalytics() {
  try {
    const ENDPOINT = 'https://downhill-mayhem.goatcounter.com/count';
    const seen = {}, queue = [];
    let timer = null, tries = 0;
    const isLocal = () => {
      try {
        if (location.protocol === 'file:') return true;
        const h = location.hostname;
        if (!h || h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1') return true;
        if (h.slice(-6) === '.local') return true;
        return /^192\.168\./.test(h) || /^10\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h);
      } catch { return true; }
    };
    const LOCAL = isLocal();
    if (!LOCAL) {
      const s = document.createElement('script');
      s.async = true; s.src = 'https://gc.zgo.at/count.js';
      s.setAttribute('data-goatcounter', ENDPOINT);
      s.onerror = () => { queue.length = 0; };
      (document.head || document.documentElement).appendChild(s);
    }
    const flush = () => {
      const gc = window.goatcounter;
      if (!gc || typeof gc.count !== 'function') return false;
      while (queue.length) { try { gc.count({ path: queue.shift(), event: true }); } catch { /* must never surface */ } }
      return true;
    };
    window.TRACK = (name) => {
      if (!name || seen[name]) return;
      seen[name] = 1;
      (window.TRACKED || (window.TRACKED = [])).push(name);
      if (LOCAL) return;
      queue.push(name);
      if (flush() || timer) return;
      timer = setInterval(() => { if (flush() || ++tries >= 15) { clearInterval(timer); timer = null; } }, 1000);
    };
  } catch { window.TRACK = () => {}; }
}
