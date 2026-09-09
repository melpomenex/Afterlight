/**
 * Positional Web Audio effects for Rooftop Drone Racing (Phase 5, Task 7.3).
 *
 * Implements:
 *   - Quadcopter motor whine synthesized via modulated oscillators
 *   - Checkpoint pass chimes (ascending bell tones)
 *   - Boundary/drone collision thumps with velocity scaling
 *   - Race finish fanfare
 *   - Positional distance falloff based on player avatar proximity
 */

import * as THREE from 'three';

export function createDroneAudio({
  audioMixer = null,
  getPlayer = null,
  activityPosition = [-3.0, 0, 3.5],
} = {}) {
  const stationPosVec = new THREE.Vector3(
    activityPosition[0],
    activityPosition[1] || 0,
    activityPosition[2]
  );

  let lastHitTime = 0;
  let motorOsc = null;
  let motorGain = null;
  let motorLfo = null;
  let motorRunning = false;

  function getAudioContext() {
    return audioMixer?.context || (typeof window !== 'undefined' ? window.__afterlightAudioContext : null);
  }

  function getEffectiveGain() {
    if (!getPlayer) return 1.0;
    const player = getPlayer();
    if (!player?.position) return 1.0;

    const pPos = new THREE.Vector3(player.position.x, player.position.y || 0, player.position.z);
    const dist = pPos.distanceTo(stationPosVec);
    // Falloff over 30 meters across the rooftop airspace
    return Math.max(0, Math.min(1.0, 1.0 - dist / 30.0));
  }

  function startMotor() {
    const ctx = getAudioContext();
    if (!ctx || motorRunning) return;

    try {
      motorOsc = ctx.createOscillator();
      motorGain = ctx.createGain();
      motorLfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();

      motorOsc.type = 'triangle';
      motorOsc.frequency.setValueAtTime(140, ctx.currentTime);

      // LFO for rotor blade fluctuation (4 blades at ~28 Hz)
      motorLfo.type = 'sine';
      motorLfo.frequency.setValueAtTime(28, ctx.currentTime);
      lfoGain.gain.setValueAtTime(15, ctx.currentTime);

      motorLfo.connect(motorOsc.frequency);

      const gain = getEffectiveGain();
      motorGain.gain.setValueAtTime(0.04 * gain, ctx.currentTime);

      motorOsc.connect(motorGain);
      motorGain.connect(ctx.destination);

      motorOsc.start();
      motorLfo.start();
      motorRunning = true;
    } catch {
      // AudioContext may be suspended or unavailable
    }
  }

  function updateMotor(throttle = 0, speed = 0) {
    if (!motorRunning) {
      if (throttle > 0.05 || speed > 0.5) startMotor();
      else return;
    }
    const ctx = getAudioContext();
    if (!ctx || !motorOsc || !motorGain) return;

    try {
      const gain = getEffectiveGain();
      const baseFreq = 140 + throttle * 220 + Math.min(speed, 20) * 10;
      motorOsc.frequency.setTargetAtTime(baseFreq, ctx.currentTime, 0.05);

      const targetGain = (0.02 + throttle * 0.06) * gain;
      motorGain.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.05);
    } catch {}
  }

  function stopMotor() {
    if (!motorRunning) return;
    try {
      if (motorOsc) {
        motorOsc.stop();
        motorOsc.disconnect();
        motorOsc = null;
      }
      if (motorLfo) {
        motorLfo.stop();
        motorLfo.disconnect();
        motorLfo = null;
      }
      if (motorGain) {
        motorGain.disconnect();
        motorGain = null;
      }
    } catch {}
    motorRunning = false;
  }

  return {
    updateMotor,
    stopMotor,

    playCheckpoint(isLap = false) {
      const ctx = getAudioContext();
      if (!ctx) return;
      const gain = getEffectiveGain();
      if (gain <= 0.01) return;

      try {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sine';
        const startFreq = isLap ? 784 : 659; // G5 or E5
        const endFreq = isLap ? 1046 : 880; // C6 or A5
        osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + 0.12);

        const vol = (isLap ? 0.25 : 0.18) * gain;
        gainNode.gain.setValueAtTime(vol, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.26);
      } catch {}
    },

    playCollision(intensity = 1.0) {
      const now = performance.now();
      if (now - lastHitTime < 50) return;
      lastHitTime = now;

      const ctx = getAudioContext();
      if (!ctx) return;
      const gain = getEffectiveGain();
      if (gain <= 0.01) return;

      try {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.08);

        const vol = Math.min(0.35, 0.1 + intensity * 0.2) * gain;
        gainNode.gain.setValueAtTime(vol, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.11);
      } catch {}
    },

    playFinish() {
      const ctx = getAudioContext();
      if (!ctx) return;
      const gain = getEffectiveGain();
      if (gain <= 0.01) return;

      try {
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.07);

          gainNode.gain.setValueAtTime(0.18 * gain, ctx.currentTime + idx * 0.07);
          gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.07 + 0.4);

          osc.connect(gainNode);
          gainNode.connect(ctx.destination);

          osc.start(ctx.currentTime + idx * 0.07);
          osc.stop(ctx.currentTime + idx * 0.07 + 0.42);
        });
      } catch {}
    },

    dispose() {
      stopMotor();
    },
  };
}
