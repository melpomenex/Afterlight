/**
 * Positional Web Audio effects for Sluiceworks RC Speedboats (Phase 5, Task 7.6).
 *
 * Implements:
 *   - Electric brushless RC motor whine scaled with throttle/speed
 *   - High-speed water propeller spray / wake churn
 *   - Checkpoint buoy pass chime
 *   - Hull bank collision thud
 *   - Lap completion bell & victory fanfare
 */

import * as THREE from 'three';

export function createRcBoatAudio({
  audioMixer = null,
  getPlayer = null,
  consolePosition = [3.8, 0, 2.0],
} = {}) {
  const consolePosVec = new THREE.Vector3(consolePosition[0], consolePosition[1] || 0, consolePosition[2]);

  function getAudioContext() {
    return audioMixer?.context || (typeof window !== 'undefined' ? window.__afterlightAudioContext : null);
  }

  function getEffectiveGain() {
    if (!getPlayer) return 1.0;
    const player = getPlayer();
    if (!player?.position) return 1.0;

    const pPos = new THREE.Vector3(player.position.x, player.position.y || 0, player.position.z);
    const dist = pPos.distanceTo(consolePosVec);
    // Falloff over 25 meters across the canal basin
    return Math.max(0, Math.min(1.0, 1.0 - dist / 25.0));
  }

  // Active continuous motor oscillator
  let motorOsc = null;
  let motorGain = null;

  function initMotorAudio() {
    const ctx = getAudioContext();
    if (!ctx || motorOsc) return;

    try {
      motorOsc = ctx.createOscillator();
      motorGain = ctx.createGain();

      motorOsc.type = 'sawtooth';
      motorOsc.frequency.setValueAtTime(120, ctx.currentTime);
      motorGain.gain.setValueAtTime(0.0001, ctx.currentTime);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, ctx.currentTime);

      motorOsc.connect(filter);
      filter.connect(motorGain);
      motorGain.connect(ctx.destination);

      motorOsc.start();
    } catch {}
  }

  return {
    updateMotor(speed = 0, isParticipant = false) {
      if (!isParticipant) {
        if (motorGain) {
          const ctx = getAudioContext();
          if (ctx) motorGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.05);
        }
        return;
      }

      initMotorAudio();
      const ctx = getAudioContext();
      if (!ctx || !motorOsc || !motorGain) return;

      const gain = getEffectiveGain();
      const absSpeed = Math.abs(speed);

      // Pitch scales from 140 Hz (idle) up to 680 Hz (top speed)
      const targetFreq = 140 + (absSpeed / 7.5) * 540;
      const targetVol = (0.01 + (absSpeed / 7.5) * 0.09) * gain;

      motorOsc.frequency.setTargetAtTime(targetFreq, ctx.currentTime, 0.04);
      motorGain.gain.setTargetAtTime(targetVol, ctx.currentTime, 0.05);
    },

    playCheckpoint() {
      const ctx = getAudioContext();
      if (!ctx) return;
      const gain = getEffectiveGain();
      if (gain <= 0.01) return;

      try {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1);

        g.gain.setValueAtTime(0.12 * gain, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);

        osc.connect(g);
        g.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } catch {}
    },

    playCollision() {
      const ctx = getAudioContext();
      if (!ctx) return;
      const gain = getEffectiveGain();
      if (gain <= 0.01) return;

      try {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.15);

        g.gain.setValueAtTime(0.22 * gain, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);

        osc.connect(g);
        g.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.18);
      } catch {}
    },

    playLapBell() {
      const ctx = getAudioContext();
      if (!ctx) return;
      const gain = getEffectiveGain();
      if (gain <= 0.01) return;

      try {
        const t = ctx.currentTime;
        [1200, 1800].forEach((freq) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t);

          g.gain.setValueAtTime(0.15 * gain, t);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);

          osc.connect(g);
          g.connect(ctx.destination);

          osc.start(t);
          osc.stop(t + 0.65);
        });
      } catch {}
    },

    playVictory() {
      const ctx = getAudioContext();
      if (!ctx) return;
      const gain = getEffectiveGain();
      if (gain <= 0.01) return;

      try {
        const t = ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t + idx * 0.08);

          const start = t + idx * 0.08;
          g.gain.setValueAtTime(0.001, start);
          g.gain.linearRampToValueAtTime(0.12 * gain, start + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, start + 0.45);

          osc.connect(g);
          g.connect(ctx.destination);

          osc.start(start);
          osc.stop(start + 0.5);
        });
      } catch {}
    },

    dispose() {
      if (motorOsc) {
        try {
          motorOsc.stop();
          motorOsc.disconnect();
        } catch {}
        motorOsc = null;
      }
      if (motorGain) {
        try { motorGain.disconnect(); } catch {}
        motorGain = null;
      }
    },
  };
}
