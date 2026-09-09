/**
 * Spatial pad tones for the Mycelial Choir. Note events drive local synth only.
 */

import * as THREE from 'three';
import { LIGHT_MUSIC_PADS } from '../../../shared/lightMusicModel.js';

export function createLightMusicAudio({
  audioMixer = null,
  getPlayer = null,
  stationPosition = [0, 0, 2],
} = {}) {
  const station = new THREE.Vector3(stationPosition[0], stationPosition[1] || 0, stationPosition[2]);
  let muted = false;
  const active = new Set();

  function ctx() {
    return audioMixer?.context || (typeof window !== 'undefined' ? window.__afterlightAudioContext : null);
  }

  function gain() {
    if (muted) return 0;
    if (!getPlayer) return 1;
    const p = getPlayer();
    if (!p?.position) return 1;
    const here = new THREE.Vector3(p.position.x, p.position.y || 0, p.position.z);
    return Math.max(0, Math.min(1, 1 - here.distanceTo(station) / 18));
  }

  return {
    setMuted(v) { muted = !!v; },
    playPad(pad) {
      const ac = ctx();
      const g = gain();
      if (!ac || g <= 0.01) return;
      try {
        const midi = LIGHT_MUSIC_PADS[pad]?.midi ?? 60;
        const osc = ac.createOscillator();
        const gn = ac.createGain();
        osc.type = 'sine';
        osc.frequency.value = 440 * 2 ** ((midi - 69) / 12);
        gn.gain.setValueAtTime(0.0001, ac.currentTime);
        gn.gain.exponentialRampToValueAtTime(0.12 * g, ac.currentTime + 0.02);
        gn.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.45);
        osc.connect(gn);
        gn.connect(audioMixer?.buses?.effects ?? ac.destination);
        osc.start();
        osc.stop(ac.currentTime + 0.5);
        active.add(osc);
        osc.onended = () => active.delete(osc);
      } catch {}
    },
    playComplete() {
      this.playPad(0);
      this.playPad(2);
    },
    noteOff() {
      for (const osc of active) {
        try { osc.stop(); } catch {}
      }
      active.clear();
    },
    dispose() {
      this.noteOff();
    },
  };
}
