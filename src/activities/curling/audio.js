/**
 * Bounded spatial curling audio: launch scrape, rumble, knock, sweep, score.
 */

import * as THREE from 'three';

export function createCurlingAudio({
  audioMixer = null,
  getPlayer = null,
  rinkPosition = [0, 0, 1.5],
} = {}) {
  const rink = new THREE.Vector3(rinkPosition[0], rinkPosition[1] || 0, rinkPosition[2]);

  function getAudioContext() {
    return audioMixer?.context || (typeof window !== 'undefined' ? window.__afterlightAudioContext : null);
  }

  function gainForListener() {
    if (!getPlayer) return 1;
    const player = getPlayer();
    if (!player?.position) return 1;
    const dist = new THREE.Vector3(player.position.x, player.position.y || 0, player.position.z).distanceTo(rink);
    return Math.max(0, Math.min(1, 1 - dist / 22));
  }

  function blip(freq, dur, vol, type = 'sine') {
    const ctx = getAudioContext();
    const g = gainForListener();
    if (!ctx || g < 0.01) return;
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
      osc.stop(ctx.currentTime + dur);
    } catch {
      /* audio optional */
    }
  }

  return {
    playLaunch(power = 0.6) {
      blip(140 + power * 80, 0.18, 0.08, 'triangle');
    },
    playSweep() {
      blip(420, 0.06, 0.03, 'sawtooth');
    },
    playCollision() {
      blip(220, 0.09, 0.07, 'square');
    },
    playScore() {
      blip(520, 0.2, 0.06, 'sine');
      blip(780, 0.28, 0.04, 'sine');
    },
    playForfeit() {
      blip(180, 0.3, 0.05, 'triangle');
    },
    dispose() {},
  };
}
