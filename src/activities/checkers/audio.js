/**
 * Soft table sounds for Rain Court draughts: wood tap, capture, crown, close.
 */

import * as THREE from 'three';

export function createCheckersAudio({
  audioMixer = null,
  getPlayer = null,
  tablePosition = [6.4, 0, 5.5],
} = {}) {
  const posVec = new THREE.Vector3(tablePosition[0], tablePosition[1] || 0, tablePosition[2]);

  function getAudioContext() {
    return audioMixer?.context || (typeof window !== 'undefined' ? window.__afterlightAudioContext : null);
  }

  function getEffectiveGain() {
    if (!getPlayer) return 1;
    const player = getPlayer();
    if (!player?.position) return 1;
    const dist = new THREE.Vector3(player.position.x, player.position.y || 0, player.position.z).distanceTo(posVec);
    return Math.max(0, Math.min(1, 1 - dist / 16));
  }

  function tone(freq, duration, type = 'sine', volume = 0.12) {
    const ctx = getAudioContext();
    if (!ctx) return;
    const gain = getEffectiveGain();
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
      // Audio is optional presentation.
    }
  }

  return {
    playMove(captures = 0, promoted = false) {
      tone(captures > 0 ? 210 : 340, 0.09, 'triangle', 0.1);
      if (captures > 0) tone(140, 0.12, 'square', 0.06);
      if (promoted) tone(520, 0.22, 'sine', 0.08);
    },
    playIllegal() {
      tone(90, 0.08, 'square', 0.05);
    },
    playEnded(result) {
      if (result === 'draw') {
        tone(300, 0.2, 'sine', 0.08);
        return;
      }
      tone(440, 0.18, 'triangle', 0.1);
      tone(330, 0.28, 'sine', 0.07);
    },
    dispose() {},
  };
}
