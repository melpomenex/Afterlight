/**
 * Positional Web Audio effects for Foosball (Phase 4, Task 6.4).
 *
 * Implements:
 * - Sharp wood/plastic player figure kick impulse
 * - Resonant ball-to-rail and corner ramp bounce
 * - Goal celebration chime / bell
 * - Rod slide whoosh
 * - Distance attenuation and 40ms refractory deduplication
 */

import * as THREE from 'three';

export function createFoosballAudio({
  audioMixer = null,
  getPlayer = null,
  tablePosition = [-5.8, 0, 7.0],
} = {}) {
  const tablePosVec = new THREE.Vector3(tablePosition[0], tablePosition[1] || 0, tablePosition[2]);
  let lastKickTime = 0;
  let lastBounceTime = 0;
  let lastSlideTime = 0;

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
    playKick(speed = 10.0) {
      const now = performance.now();
      if (now - lastKickTime < 40) return;
      lastKickTime = now;

      const ctx = getAudioContext();
      if (!ctx) return;

      const gain = getEffectiveGain();
      if (gain <= 0.01) return;

      try {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        // Punchy thwack with pitch drop: 320Hz -> 80Hz
        const baseFreq = 220 + Math.min(180, speed * 12);
        osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.06);

        const vol = Math.min(0.8, (speed / 15.0) * 0.5 + 0.2) * gain;
        gainNode.gain.setValueAtTime(vol, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.06);
      } catch {
        // AudioContext may be suspended or blocked by autoplay policy
      }
    },

    playRailBounce(speed = 8.0) {
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

        // Crisp wooden boundary click: 520Hz -> 180Hz
        osc.frequency.setValueAtTime(520, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.04);

        const vol = Math.min(0.6, (speed / 15.0) * 0.35 + 0.15) * gain;
        gainNode.gain.setValueAtTime(vol, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.04);
      } catch {}
    },

    playRodSlide() {
      const now = performance.now();
      if (now - lastSlideTime < 80) return;
      lastSlideTime = now;

      const ctx = getAudioContext();
      if (!ctx) return;

      const gain = getEffectiveGain();
      if (gain <= 0.01) return;

      try {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(190, ctx.currentTime + 0.05);

        gainNode.gain.setValueAtTime(0.12 * gain, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      } catch {}
    },

    playGoal() {
      const ctx = getAudioContext();
      if (!ctx) return;

      const gain = getEffectiveGain();
      if (gain <= 0.01) return;

      try {
        // Cheerful ascending chime: C5, E5, G5, C6
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.07);

          gainNode.gain.setValueAtTime(0.4 * gain, ctx.currentTime + idx * 0.07);
          gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.07 + 0.35);

          osc.connect(gainNode);
          gainNode.connect(ctx.destination);

          osc.start(ctx.currentTime + idx * 0.07);
          osc.stop(ctx.currentTime + idx * 0.07 + 0.35);
        });
      } catch {}
    },
  };
}
