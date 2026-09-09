/**
 * Spatial piano voices from note events. Mute and note-off stop every oscillator.
 * Raw audio is never networked.
 */

import * as THREE from 'three';

const VOICE_CAP = 8;

export function createPianoAudio({
  audioMixer = null,
  getPlayer = null,
  getMuted = null,
  stationPosition = [-2.2, 0, 5.8],
} = {}) {
  const station = new THREE.Vector3(stationPosition[0], stationPosition[1] || 0, stationPosition[2]);
  let muted = false;
  const voices = new Map();

  function ctx() {
    return audioMixer?.context || (typeof window !== 'undefined' ? window.__afterlightAudioContext : null);
  }

  function silent() {
    if (muted) return true;
    if (typeof getMuted === 'function' && getMuted()) return true;
    const ac = ctx();
    if (!ac || ac.state === 'suspended') return true;
    if (typeof audioMixer?.status === 'function' && audioMixer.status() !== 'running') return true;
    return false;
  }

  function spatial() {
    if (!getPlayer) return 1;
    const p = getPlayer();
    if (!p?.position) return 1;
    const here = new THREE.Vector3(p.position.x, p.position.y || 0, p.position.z);
    return Math.max(0, Math.min(1, 1 - here.distanceTo(station) / 16));
  }

  function stopMidi(midi) {
    const voice = voices.get(midi);
    if (!voice) return;
    try { voice.osc.stop(); } catch {}
    try { voice.osc.disconnect(); } catch {}
    try { voice.gain.disconnect(); } catch {}
    voices.delete(midi);
  }

  function allOff() {
    for (const midi of [...voices.keys()]) stopMidi(midi);
  }

  return {
    setMuted(v) {
      muted = !!v;
      if (muted) allOff();
    },
    noteOn(midi) {
      if (silent()) return;
      const ac = ctx();
      if (!ac) return;
      stopMidi(midi);
      if (voices.size >= VOICE_CAP) {
        const oldest = voices.keys().next().value;
        stopMidi(oldest);
      }
      try {
        const osc = ac.createOscillator();
        const gn = ac.createGain();
        osc.type = 'triangle';
        osc.frequency.value = 440 * 2 ** ((midi - 69) / 12);
        const g = 0.08 * spatial();
        gn.gain.setValueAtTime(0.0001, ac.currentTime);
        gn.gain.exponentialRampToValueAtTime(Math.max(0.0002, g), ac.currentTime + 0.02);
        osc.connect(gn);
        gn.connect(audioMixer?.buses?.effects ?? ac.destination);
        osc.start();
        voices.set(midi, { osc, gain: gn });
      } catch {}
    },
    noteOff: stopMidi,
    allOff,
    dispose() { allOff(); },
  };
}
