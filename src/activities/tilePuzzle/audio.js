/**
 * Bounded spatial tile-slide audio for the Paper Catacombs puzzle (Task 8.4).
 */

import * as THREE from 'three';

const FALLOFF_M = 16;

export function createTilePuzzleAudio({
  audioMixer = null,
  getPlayer = null,
  tablePosition = [5.2, 0, 1.0],
} = {}) {
  const table = new THREE.Vector3(
    tablePosition[0],
    tablePosition[1] || 0,
    tablePosition[2],
  );

  function getAudioContext() {
    return audioMixer?.context || (typeof window !== 'undefined' ? window.__afterlightAudioContext : null);
  }

  function gainForListener() {
    if (!getPlayer) return 1;
    const player = getPlayer();
    if (!player?.position) return 1;
    const p = new THREE.Vector3(player.position.x, player.position.y || 0, player.position.z);
    return Math.max(0, Math.min(1, 1 - p.distanceTo(table) / FALLOFF_M));
  }

  function beep(freq, duration, type = 'triangle', volume = 0.12) {
    const ctx = getAudioContext();
    if (!ctx) return;
    const gain = gainForListener();
    if (gain <= 0.01) return;
    try {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      g.gain.setValueAtTime(volume * gain, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration + 0.02);
    } catch {
      // Audio is optional.
    }
  }

  return {
    playSlide() {
      beep(420, 0.08, 'square', 0.08);
    },
    playSwap() {
      beep(280, 0.1, 'triangle', 0.1);
    },
    playReset() {
      beep(180, 0.16, 'sawtooth', 0.08);
    },
    playSolved() {
      beep(523, 0.18, 'sine', 0.12);
      setTimeout(() => beep(659, 0.22, 'sine', 0.12), 90);
      setTimeout(() => beep(784, 0.28, 'sine', 0.1), 180);
    },
    dispose() {},
  };
}
