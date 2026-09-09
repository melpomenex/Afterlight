/**
 * Quiet table audio for Afterlight house chess: wood click, capture,
 * check chime, and a soft mate/resign cadence. Spatial falloff only.
 */

import * as THREE from 'three';

export function createChessAudio({
  audioMixer = null,
  getPlayer = null,
  tablePosition = [6.4, 0, 1.2],
} = {}) {
  const tablePos = new THREE.Vector3(tablePosition[0], tablePosition[1] || 0, tablePosition[2]);

  function getAudioContext() {
    return audioMixer?.context || (typeof window !== 'undefined' ? window.__afterlightAudioContext : null);
  }

  function getEffectiveGain() {
    if (!getPlayer) return 1.0;
    const player = getPlayer();
    if (!player?.position) return 1.0;
    const pPos = new THREE.Vector3(player.position.x, player.position.y || 0, player.position.z);
    const dist = pPos.distanceTo(tablePos);
    return Math.max(0, Math.min(1.0, 1.0 - dist / 16.0));
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
      osc.stop(ctx.currentTime + duration);
    } catch {
      // AudioContext may be suspended.
    }
  }

  return {
    playMove(captured = false) {
      if (captured) {
        tone(220, 0.09, 'triangle', 0.16);
        tone(140, 0.12, 'sine', 0.1);
      } else {
        tone(420, 0.05, 'triangle', 0.1);
      }
    },
    playSelect() {
      tone(640, 0.04, 'sine', 0.06);
    },
    playCheck() {
      tone(520, 0.08, 'sine', 0.1);
      tone(780, 0.1, 'sine', 0.08);
    },
    playMate() {
      tone(330, 0.16, 'triangle', 0.14);
      tone(247, 0.22, 'sine', 0.1);
    },
    playDraw() {
      tone(300, 0.14, 'sine', 0.08);
    },
    playIllegal() {
      tone(160, 0.08, 'square', 0.05);
    },
    playResign() {
      tone(196, 0.18, 'triangle', 0.1);
    },
    dispose() {},
  };
}
