/**
 * Spatial dart thunk / bust / checkout tones. Local synth only.
 */

import * as THREE from 'three';

export function createDartsAudio({
  audioMixer = null,
  getPlayer = null,
  stationPosition = [8.4, 0, 3.6],
} = {}) {
  const station = new THREE.Vector3(stationPosition[0], stationPosition[1] || 0, stationPosition[2]);
  let muted = false;

  function ctx() {
    return audioMixer?.context || (typeof window !== 'undefined' ? window.__afterlightAudioContext : null);
  }

  function g() {
    if (muted) return 0;
    if (!getPlayer) return 1;
    const p = getPlayer();
    if (!p?.position) return 1;
    const here = new THREE.Vector3(p.position.x, p.position.y || 0, p.position.z);
    return Math.max(0, Math.min(1, 1 - here.distanceTo(station) / 20));
  }

  function beep(freq, dur, type = 'triangle') {
    const ac = ctx();
    const gain = g();
    if (!ac || gain <= 0.01) return;
    try {
      const osc = ac.createOscillator();
      const gn = ac.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gn.gain.setValueAtTime(0.12 * gain, ac.currentTime);
      gn.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
      osc.connect(gn);
      gn.connect(audioMixer?.buses?.effects ?? ac.destination);
      osc.start();
      osc.stop(ac.currentTime + dur);
    } catch {}
  }

  return {
    setMuted(v) { muted = !!v; },
    playThrow() { beep(220, 0.12, 'square'); },
    playBust() { beep(90, 0.28, 'sawtooth'); },
    playCheckout() { beep(523, 0.35); beep(784, 0.4); },
    dispose() {},
  };
}
