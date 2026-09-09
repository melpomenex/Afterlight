/**
 * Positional Web Audio effects for Air Hockey (Phase 4, Task 6.2).
 *
 * Implements:
 *   - Striker puck impacts with velocity-dependent pitch and volume
 *   - Aluminum rail bounce impacts
 *   - Celebratory goal buzzer and fanfare
 *   - Refractory deduplication window (40ms) to prevent audio flooding
 */

import * as THREE from 'three';

export function createAirHockeyAudio({
  audioMixer = null,
  getPlayer = null,
  tablePosition = [5.8, 0, 7.0],
} = {}) {
  const tablePosVec = new THREE.Vector3(tablePosition[0], tablePosition[1] || 0, tablePosition[2]);
  let lastHitTime = 0;
  let lastBounceTime = 0;

  function getAudioContext() {
    return audioMixer?.context || (typeof window !== 'undefined' ? window.__afterlightAudioContext : null);
  }

  function getEffectiveGain() {
    if (!getPlayer) return 1.0;
    const player = getPlayer();
    if (!player?.position) return 1.0;

    const pPos = new THREE.Vector3(player.position.x, player.position.y || 0, player.position.z);
    const dist = pPos.distanceTo(tablePosVec);
    // Falloff over 15 meters
    return Math.max(0, Math.min(1.0, 1.0 - dist / 15.0));
  }

  return {
    playPuckHit(speed = 10.0) {
      const now = performance.now();
      if (now - lastHitTime < 40) return;
      lastHitTime = now;

      const ctx = getAudioContext();
      if (!ctx) return;

      const gain = getEffectiveGain();
      if (gain <= 0.01) return;

      try {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        // Frequency scales with hit speed: 380 Hz to 650 Hz
        const freq = 380 + Math.min(speed, 25.0) * 10.0;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.4, ctx.currentTime + 0.06);

        const volume = Math.min(1.0, 0.3 + (speed / 25.0) * 0.7) * gain * 0.35;
        gainNode.gain.setValueAtTime(volume, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.07);
      } catch {
        // AudioContext may be suspended or unavailable
      }
    },

    playRailBounce(speed = 10.0) {
      const now = performance.now();
      if (now - lastBounceTime < 40) return;
      lastBounceTime = now;

      const ctx = getAudioContext();
      if (!ctx) return;

      const gain = getEffectiveGain();
      if (gain <= 0.01) return;

      try {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        // Metallic higher frequency tone
        const freq = 600 + Math.min(speed, 20.0) * 8.0;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.5, ctx.currentTime + 0.04);

        const volume = Math.min(1.0, 0.2 + (speed / 25.0) * 0.5) * gain * 0.25;
        gainNode.gain.setValueAtTime(volume, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      } catch {
        // AudioContext suspended or unavailable
      }
    },

    playGoal() {
      const ctx = getAudioContext();
      if (!ctx) return;

      const gain = getEffectiveGain();
      if (gain <= 0.01) return;

      try {
        // Electronic buzzer chord
        const notes = [440, 554.37, 659.25]; // A major
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.05);

          const vol = gain * 0.22;
          g.gain.setValueAtTime(vol, ctx.currentTime + idx * 0.05);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

          osc.connect(g);
          g.connect(ctx.destination);

          osc.start(ctx.currentTime + idx * 0.05);
          osc.stop(ctx.currentTime + 0.5);
        });
      } catch {
        // AudioContext suspended
      }
    },
  };
}
