/**
 * Spatial cast / bite / reel / release tones for shoreline fishing.
 */

import * as THREE from 'three';

export function createFishingAudio({
  audioMixer = null,
  getPlayer = null,
  dockPosition = [6, 0, 3],
} = {}) {
  const dock = new THREE.Vector3(dockPosition[0], dockPosition[1] || 0, dockPosition[2]);

  function getAudioContext() {
    return audioMixer?.context || (typeof window !== 'undefined' ? window.__afterlightAudioContext : null);
  }

  function gainFor() {
    if (!getPlayer) return 1;
    const player = getPlayer();
    if (!player?.position) return 1;
    const dist = new THREE.Vector3(player.position.x, player.position.y || 0, player.position.z).distanceTo(dock);
    return Math.max(0, Math.min(1, 1 - dist / 22));
  }

  function tone(freq, dur, type = 'sine', vol = 0.12) {
    const ctx = getAudioContext();
    const g = gainFor();
    if (!ctx || g <= 0.01) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(vol * g, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur + 0.02);
    } catch {}
  }

  return {
    playCast() { tone(220, 0.22, 'triangle', 0.1); },
    playBite() { tone(160, 0.12, 'square', 0.08); },
    playReel() { tone(340, 0.18, 'sine', 0.09); },
    playRelease() { tone(520, 0.28, 'sine', 0.1); },
    dispose() {},
  };
}
