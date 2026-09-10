/**
 * Downhill Mayhem audio (integrate-multiplayer-downhill-mayhem-arcade 5.6).
 * `AudioSys` ported from the frozen source into a factory that accepts an
 * INJECTED `{ context, destination }`. When the host supplies a context the
 * game never closes it (`ownsContext === false`); only the standalone shell
 * creates and owns its own AudioContext.
 *
 * All synthesized; no external assets. `dispose()` stops the music scheduler and
 * only closes a context this instance created.
 */

import { clamp, FINISH_S } from './course.js';
import { PEDAL_VMAX } from '../../../../shared/downhill/rules.js';

export const MUSIC_THEMES = {
  classic: {
    bpm: 136, bassType: 'square', bassVol: 0.30, hatHP: 6000, fill: 'chirp',
    kicks: [0, 10], snares: [4, 12],
    bass: { 0: 55, 3: 55, 6: 65.41, 8: 55, 11: 82.41, 14: 73.42, 16: 55, 19: 49, 22: 65.41, 24: 82.41, 27: 73.42, 30: 98 },
  },
  timber: {
    bpm: 128, bassType: 'triangle', bassVol: 0.34, hatHP: 4600, fill: 'tom',
    kicks: [0, 6, 10], snares: [4, 12],
    bass: { 0: 41.2, 3: 41.2, 6: 49, 8: 41.2, 11: 61.74, 14: 55, 16: 41.2, 19: 36.71, 22: 49, 24: 61.74, 27: 55, 30: 73.42 },
  },
  rock: {
    bpm: 148, bassType: 'sawtooth', bassVol: 0.22, hatHP: 7000, fill: 'riser',
    kicks: [0, 7, 10], snares: [4, 12, 13],
    bass: { 0: 55, 2: 55, 4: 65.41, 6: 55, 8: 82.41, 10: 82.41, 11: 98, 14: 73.42, 16: 55, 18: 55, 20: 65.41, 22: 55, 24: 110, 26: 98, 27: 82.41, 30: 73.42 },
  },
};

export function createAudio({ context = null, destination = null, ownsContext = null, getTheme = null } = {}) {
  const sys = {
    ctx: null, master: null, muted: false, started: false,
    wind: null, windF: null, dirt: null, dirtF: null, boost: null, pedalT: 0,
    limiter: null, musicGain: null, noiseBuf: null,
    music: { on: false, timer: null, step: 0, next: 0 }, intense: false, theme: null,
    uiTicks: 0, lastImpact: '',
    _ownsContext: ownsContext == null ? !context : !!ownsContext,
    _externalContext: context || null,
    _destination: destination || null,
    _disposers: [],

    ensure() {
      if (this.started) {
        if (this.ctx && this.ctx.state === 'suspended' && this.ctx.resume) this.ctx.resume().catch(() => {});
        return;
      }
      try {
        let ctx = this._externalContext;
        if (!ctx) {
          const AC = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
          if (!AC) return;
          ctx = new AC();
        }
        this.ctx = ctx;
        this.master = ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.8;
        const lim = ctx.createDynamicsCompressor();
        lim.threshold.value = -1; lim.knee.value = 0; lim.ratio.value = 20;
        lim.attack.value = 0.003; lim.release.value = 0.1;
        this.limiter = lim;
        const out = this._destination || ctx.destination;
        this.master.connect(lim); lim.connect(out);
        const len = Math.floor(ctx.sampleRate * 1.5);
        const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        this.noiseBuf = buf;
        const mk = (type, freq) => {
          const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
          const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
          const g = ctx.createGain(); g.gain.value = 0;
          src.connect(f); f.connect(g); g.connect(this.master); src.start();
          return { g, f };
        };
        const w = mk('lowpass', 600); this.wind = w.g; this.windF = w.f;
        const dd = mk('lowpass', 240); this.dirt = dd.g; this.dirtF = dd.f;
        const bb = mk('bandpass', 1400); this.boost = bb.g;
        this.musicGain = ctx.createGain(); this.musicGain.gain.value = 1.0; this.musicGain.connect(this.master);
        this.started = true;
        if (ctx.state === 'suspended' && ctx.resume) ctx.resume().catch(() => {});
      } catch (e) { this.started = false; }
    },

    setMuted(on) {
      this.muted = !!on;
      if (this.master) this.master.gain.value = this.muted ? 0 : 0.8;
    },
    toggleMute() { this.setMuted(!this.muted); },

    env(g, t0, a, peak, dur) {
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(peak, t0 + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    },
    blip(freq, dur, vol, type) {
      if (!this.started) return; const c = this.ctx, t = c.currentTime;
      const o = c.createOscillator(); o.type = type || 'square'; o.frequency.value = freq;
      const g = c.createGain(); o.connect(g); g.connect(this.master);
      this.env(g, t, 0.005, vol, dur); o.start(t); o.stop(t + dur + 0.02);
    },
    noiseHit(freq, dur, vol) {
      if (!this.started) return; const c = this.ctx, t = c.currentTime;
      const s = c.createBufferSource(); s.buffer = this.noiseBuf;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq;
      const g = c.createGain(); s.connect(f); f.connect(g); g.connect(this.master);
      this.env(g, t, 0.004, vol, dur); s.start(t); s.stop(t + dur + 0.02);
    },
    thump(freq, dur, vol) {
      if (!this.started) return; const c = this.ctx, t = c.currentTime;
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(freq, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * 0.4), t + dur);
      const g = c.createGain(); o.connect(g); g.connect(this.master);
      this.env(g, t, 0.004, vol, dur); o.start(t); o.stop(t + dur + 0.02);
    },
    whoosh() { this.noiseHit(1300, 0.13, 0.3); },
    tell() { this.noiseHit(340, 0.16, 0.22); this.blip(180, 0.12, 0.12, 'sawtooth'); },
    uiTick(fwd) {
      this.ensure(); this.uiTicks++;
      this.noiseHit(fwd ? 1400 : 900, 0.03, 0.34);
      this.blip(fwd ? 720 : 520, 0.05, 0.16, 'square');
      this.thump(fwd ? 150 : 120, 0.06, 0.18);
    },
    strikeLand(vol, kind) {
      this.lastImpact = kind === 'kick' ? 'kick' : 'punch';
      if (kind === 'kick') { this.thump(58, 0.30, 1.05 * vol); this.noiseHit(420, 0.16, 0.55 * vol); this.noiseHit(950, 0.05, 0.28 * vol); }
      else { this.thump(85, 0.22, 0.95 * vol); this.noiseHit(700, 0.12, 0.5 * vol); this.noiseHit(1400, 0.05, 0.3 * vol); }
    },
    treeSnd(vol) {
      this.lastImpact = 'tree';
      this.blip(210, 0.07, 0.34 * vol, 'triangle'); this.noiseHit(900, 0.06, 0.4 * vol);
      this.noiseHit(3400, 0.25, 0.16 * vol); this.thump(75, 0.25, 0.5 * vol);
      setTimeout(() => this.blip(340, 0.045, 0.16 * vol, 'triangle'), 30);
    },
    rockSnd(vol) {
      this.lastImpact = 'rock';
      this.noiseHit(2400, 0.045, 0.5 * vol); this.noiseHit(1300, 0.10, 0.42 * vol);
      this.blip(2900, 0.03, 0.10 * vol, 'square'); this.thump(95, 0.16, 0.62 * vol);
    },
    crashSnd(vol, keepTag) {
      if (!keepTag) this.lastImpact = 'fall';
      this.thump(70, 0.35, 0.9 * vol); this.noiseHit(500, 0.3, 0.5 * vol); this.noiseHit(2200, 0.12, 0.25 * vol);
    },
    chime() { this.blip(880, 0.09, 0.25, 'triangle'); setTimeout(() => this.blip(1320, 0.14, 0.28, 'triangle'), 70); },
    jingle(pb) {
      const n = pb ? [523, 659, 784, 1046, 1318, 1568] : [523, 659, 784, 1046];
      n.forEach((f, i) => setTimeout(() => this.blip(f, 0.16, 0.3, 'square'), i * (pb ? 105 : 130)));
    },
    posUp() { this.blip(620, 0.06, 0.2, 'square'); setTimeout(() => this.blip(930, 0.08, 0.22, 'square'), 70); },
    posDown() { this.blip(520, 0.06, 0.18, 'square'); setTimeout(() => this.blip(350, 0.09, 0.2, 'square'), 70); },
    countBeep(go) { this.blip(go ? 900 : 600, go ? 0.4 : 0.12, 0.35, 'square'); },
    hopSnd() { this.noiseHit(700, 0.08, 0.18); },
    pedalTick() { this.blip(2200, 0.015, 0.06, 'square'); },

    oscAt(t, f0, f1, dur, vol, type) {
      const c = this.ctx, o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t);
      if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      o.connect(g); g.connect(this.musicGain);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.start(t); o.stop(t + dur + 0.03);
    },
    noiseAt(t, freq, dur, vol) {
      const c = this.ctx, s = c.createBufferSource(); s.buffer = this.noiseBuf;
      const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = freq;
      const g = c.createGain(); s.connect(f); f.connect(g); g.connect(this.musicGain);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.start(t); s.stop(t + dur + 0.03);
    },
    playStep(i, t, abs) {
      const th = this.theme || MUSIC_THEMES.classic, hot = this.intense;
      if (th.kicks.indexOf(i % 16) >= 0) this.oscAt(t, 120, 42, 0.13, 0.6, 'sine');
      if (th.snares.indexOf(i % 16) >= 0) { this.noiseAt(t, 1800, 0.09, 0.34); this.oscAt(t, 190, 120, 0.06, 0.16, 'triangle'); }
      if (i % 2 === 0) this.noiseAt(t, th.hatHP, 0.03, (i % 4 === 2) ? 0.10 : 0.16);
      else if (hot) this.noiseAt(t, th.hatHP + 1000, 0.025, 0.09);
      const b = th.bass[i];
      if (b) this.oscAt(t, hot ? b * 2 : b, hot ? b * 2 : b, 0.16, th.bassVol, th.bassType);
      if (!hot && abs % 64 === 56) {
        if (th.fill === 'tom') this.oscAt(t, 160, 95, 0.22, 0.22, 'sine');
        else if (th.fill === 'riser') this.noiseAt(t, 900, 0.3, 0.10);
        else this.oscAt(t, 440, 660, 0.18, 0.10, 'triangle');
      }
    },
    startMusic() {
      if (!this.started || this.music.on) return;
      this.theme = getTheme ? getTheme() : MUSIC_THEMES.classic;
      const m = this.music; m.on = true; m.step = 0; m.next = this.ctx.currentTime + 0.06;
      m.timer = setInterval(() => {
        const c = this.ctx, SPB = 60 / this.theme.bpm / 4;
        let guard = 0;
        while (m.next < c.currentTime + 0.12 && guard++ < 64) { this.playStep(m.step % 32, m.next, m.step); m.step++; m.next += SPB; }
      }, 25);
    },
    stopMusic() { const m = this.music; m.on = false; if (m.timer) { clearInterval(m.timer); m.timer = null; } },

    update(dt, p, racing) {
      if (!this.started) return;
      const v = clamp(p.vs / 33, 0, 1);
      const duck = this.music.on ? 0.55 : 1;
      this.wind.gain.value = (0.006 + v * v * 0.07) * duck;
      this.windF.frequency.value = 260 + v * 2100 + p.draftT * 380;
      this.intense = racing && !p.finished && p.s > FINISH_S - 400;
      this.dirt.gain.value = (p.grounded && !p.crashed && racing) ? 0.03 + v * 0.20 + p.driftT * 0.28 : 0.0;
      if (this.dirt.gain.value > 0 && this.dirtF) this.dirtF.frequency.value = 240 + p.driftT * 650;
      this.boost.gain.value = p.boosting ? 0.09 : Math.max(0, this.boost.gain.value - dt * 2);
      if (p.inp && p.inp.pedal > 0 && p.grounded && p.vs < PEDAL_VMAX && p.vs > 0.5 && racing) {
        this.pedalT -= dt; if (this.pedalT <= 0) { this.pedalTick(); this.pedalT = 0.5 / (0.4 + p.vs * 0.12); }
      }
    },

    dispose() {
      this.stopMusic();
      for (const d of this._disposers) { try { d(); } catch { /* ignore */ } }
      this._disposers.length = 0;
      if (this.started && this._ownsContext && this.ctx && typeof this.ctx.close === 'function') {
        try { this.ctx.close(); } catch { /* ignore */ }
      }
      this.started = false;
      this.ctx = null;
      this.master = null;
      this.wind = this.dirt = this.boost = null;
      this.noiseBuf = null;
    },
  };
  return sys;
}
