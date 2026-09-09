/**
 * Skip / splash / sink tones for shoreline stones.
 */

import * as THREE from 'three';

export function createSkippingAudio({
  audioMixer = null,
  getPlayer = null,
  shorePosition = [-5.5, 0, 4],
} = {}) {
  const shore = new THREE.Vector3(shorePosition[0], shorePosition[1] || 0, shorePosition[2]);

  function ctx() {
    return audioMixer?.context || (typeof window !== 'undefined' ? window.__afterlightAudioContext : null);
  }

  function gainFor() {
    if (!getPlayer) return 1;
    const player = getPlayer();
    if (!player?.position) return 1;
    const dist = new THREE.Vector3(player.position.x, player.position.y || 0, player.position.z).distanceTo(shore);
    return Math.max(0, Math.min(1, 1 - dist / 22));
  }

  function blip(freq, dur, vol = 0.1) {
    const audio = ctx();
    const g = gainFor();
    if (!audio || g <= 0.01) return;
    try {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, audio.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.6, audio.currentTime + dur);
      gain.gain.setValueAtTime(vol * g, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + dur);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start();
      osc.stop(audio.currentTime + dur + 0.02);
    } catch {}
  }

  return {
    playLaunch(power = 0.6) { blip(180 + power * 90, 0.2, 0.12); },
    playSkip() { blip(420, 0.08, 0.07); },
    playSink() { blip(110, 0.16, 0.09); },
    dispose() {},
  };
}
