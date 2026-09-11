/**
 * Positional Web Audio effects for 8-ball billiards (Task 5.3; Spec social-billiards).
 *
 * Provides synthesized physical audio for:
 *   - cue_strike: sharp leather-on-resin crack modulated by power
 *   - ball_hit: crisp phenolic ball-to-ball impact scaled by collision speed
 *   - rail_bounce: rubber cushion thud
 *   - pocket_drop: ball dropping into pocket
 *   - foul: distinct chime/tone for fouls/scratches
 *
 * Guarantees:
 *   - Deduplication: pair collisions have a >= 40ms refractory window
 *   - Positional attenuation: realistic distance falloff relative to player
 *   - Safe under headless tests and audio context suspension
 */

export function createPoolAudio({
  audioMixer = null,
  getPlayer = null,
  tablePosition = [-8.6, 0, -4.5],
} = {}) {
  const tableX = tablePosition[0];
  const tableZ = tablePosition.length === 3 ? tablePosition[2] : tablePosition[1];

  // Refractory map for collision deduplication
  const recentHits = new Map();
  const DEDUPE_WINDOW_MS = 45;

  /**
   * Computes distance attenuation factor [0..1] relative to listener.
   */
  function getDistanceFactor() {
    const player = getPlayer?.();
    if (!player || !player.position) return 1.0;

    const dx = player.position.x - tableX;
    const dz = player.position.z - tableZ;
    const dist = Math.sqrt(dx * dx + dz * dz);
    return Math.max(0, 1 - dist / 14); // Audibility extends to 14 meters in the lounge
  }

  function getContext() {
    try {
      const ac = audioMixer?.context || (typeof AudioContext === 'function' ? new AudioContext() : null);
      if (!ac || ac.state === 'suspended') return null;
      return ac;
    } catch {
      return null;
    }
  }

  function connectOutput(node) {
    if (audioMixer?.buses?.effects) {
      node.connect(audioMixer.buses.effects);
    } else {
      const ac = getContext();
      if (ac?.destination) node.connect(ac.destination);
    }
  }

  return {
    /**
     * Plays cue stick striking cue ball.
     * @param {number} [power=0.5] 0.0 to 1.0
     */
    playCueStrike(power = 0.5) {
      const dist = getDistanceFactor();
      if (dist <= 0.02) return;

      const ac = getContext();
      if (!ac) return;

      try {
        const now = ac.currentTime;
        const p = Math.max(0.0, Math.min(1.0, Number(power) || 0.5));
        const osc = ac.createOscillator();
        const gain = ac.createGain();

        // Dynamic frequency snap and bass descent scaling with power
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(450 + p * 350, now);
        osc.frequency.exponentialRampToValueAtTime(50 + (1.0 - p) * 30, now + 0.04 + p * 0.03);

        const volume = (0.2 + p * 0.5) * dist;
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05 + p * 0.03);

        osc.connect(gain);
        connectOutput(gain);

        osc.start(now);
        osc.stop(now + 0.05 + p * 0.03);
      } catch {}
    },

    /**
     * Plays phenolic ball-to-ball impact sound with speed scaling and deduplication.
     * @param {number} ballA
     * @param {number} ballB
     * @param {number} relativeSpeed in m/s
     */
    playBallHit(ballA, ballB, relativeSpeed = 1.0) {
      const nowMs = performance.now();
      const minId = Math.min(ballA, ballB);
      const maxId = Math.max(ballA, ballB);
      const key = `${minId}_${maxId}`;

      // Deduplication check
      const lastHit = recentHits.get(key) || 0;
      if (nowMs - lastHit < DEDUPE_WINDOW_MS) return;
      recentHits.set(key, nowMs);

      // Clean old entries
      if (recentHits.size > 64) {
        for (const [k, t] of recentHits.entries()) {
          if (nowMs - t > 500) recentHits.delete(k);
        }
      }

      const dist = getDistanceFactor();
      if (dist <= 0.02) return;

      const ac = getContext();
      if (!ac) return;

      try {
        const now = ac.currentTime;
        const osc = ac.createOscillator();
        const gain = ac.createGain();

        // Crisp high-frequency resin click
        osc.type = 'sine';
        const normSpeed = Math.min(3.0, Math.max(0.1, relativeSpeed));
        osc.frequency.setValueAtTime(1400 + Math.random() * 200, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.025);

        const volume = Math.min(0.4, 0.08 + normSpeed * 0.12) * dist;
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

        osc.connect(gain);
        connectOutput(gain);

        osc.start(now);
        osc.stop(now + 0.03);
      } catch {}
    },

    /**
     * Plays rubber cushion rail thud.
     * @param {number} speed in m/s
     */
    playRailBounce(speed = 1.0) {
      const dist = getDistanceFactor();
      if (dist <= 0.02) return;

      const ac = getContext();
      if (!ac) return;

      try {
        const now = ac.currentTime;
        const osc = ac.createOscillator();
        const gain = ac.createGain();

        // Muted low rubber thud
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.06);

        const volume = Math.min(0.25, 0.05 + speed * 0.08) * dist;
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

        osc.connect(gain);
        connectOutput(gain);

        osc.start(now);
        osc.stop(now + 0.065);
      } catch {}
    },

    /**
     * Plays ball dropping into pocket.
     */
    playPocketDrop() {
      const dist = getDistanceFactor();
      if (dist <= 0.02) return;

      const ac = getContext();
      if (!ac) return;

      try {
        const now = ac.currentTime;
        const osc = ac.createOscillator();
        const gain = ac.createGain();

        // Hollow drop sound
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);

        gain.gain.setValueAtTime(0.22 * dist, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

        osc.connect(gain);
        connectOutput(gain);

        osc.start(now);
        osc.stop(now + 0.14);
      } catch {}
    },

    /**
     * Plays foul chime / notification.
     */
    playFoulTone() {
      const dist = getDistanceFactor();
      if (dist <= 0.02) return;

      const ac = getContext();
      if (!ac) return;

      try {
        const now = ac.currentTime;
        const osc = ac.createOscillator();
        const gain = ac.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.setValueAtTime(165, now + 0.1);

        gain.gain.setValueAtTime(0.18 * dist, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        connectOutput(gain);

        osc.start(now);
        osc.stop(now + 0.25);
      } catch {}
    },

    /**
     * Plays a batch of simulation events emitted by physics step.
     */
    playEvents(events) {
      if (!Array.isArray(events)) return;
      for (const ev of events) {
        if (!ev) continue;
        if (ev.type === 'ball_collision') {
          this.playBallHit(ev.ballA, ev.ballB, ev.relativeSpeed || 1.0);
        } else if (ev.type === 'rail_collision') {
          this.playRailBounce(ev.speed || 1.0);
        } else if (ev.type === 'pocket') {
          this.playPocketDrop();
        }
      }
    },
  };
}
