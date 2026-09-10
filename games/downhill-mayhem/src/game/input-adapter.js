/**
 * Downhill Mayhem input adapter (integrate-multiplayer-downhill-mayhem-arcade
 * 2.3/6.2). Keyboard, gamepad and touch are translated into the game's control
 * intent shape plus a small set of menu actions. The adapter holds no DOM
 * listeners of its own in hosted mode: the shell/host routes events in through
 * `handleKeyDown`/`handleKeyUp` and `pollGamepad`.
 *
 * Action presses are buffered for 0.25 s (source behavior) so a tap a frame
 * early still lands.
 */

import { neutralControls } from '../../../../shared/downhill/rules.js';

const KEYMAP = {
  KeyW: 'pedal', ArrowUp: 'pedal', KeyS: 'brake', ArrowDown: 'brake',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'boost', ShiftRight: 'boost',
};

function nowSeconds() {
  return (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
}

export function createInputAdapter() {
  const keys = {};
  const press = { hop: 0, punch: 0, kick: 0, trick: null, trickAt: 0, enter: false };
  const padHeld = { left: false, right: false, pedal: false, brake: false, boost: false };
  const padPrev = {};
  let boostLatch = false;
  const PAD_DEAD = 0.35;

  const fresh = (t) => t > 0 && nowSeconds() - t < 0.25;

  function queue(action) {
    if (!action) return;
    const t = nowSeconds();
    if (action === 'hop') press.hop = t;
    else if (action === 'punch') press.punch = t;
    else if (action === 'kick') press.kick = t;
    else if (action === 'enter') press.enter = true;
    else if (action === 'nohander' || action === 'superman' || action === 'heel' || action === 'backflip') {
      press.trick = action; press.trickAt = t;
    }
  }

  /**
   * Route a trusted keydown. Returns a menu-action string (`enter`, `restart`,
   * `title`, `mute`, `crt`, `ghost`, `help`, `daily`, `classic`,
   * `mountain-left`, `mountain-right`, `diff-up`, `diff-down`) or null.
   */
  function handleKeyDown(e) {
    if (!e) return null;
    const code = e.code;
    if (code && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code) && e.preventDefault) e.preventDefault();
    const held = KEYMAP[code];
    if (held) keys[held] = true;
    if (e.repeat) return null;

    if (code === 'Space') { queue('hop'); return null; }
    if (code === 'KeyE') { queue('punch'); return null; }
    if (code === 'KeyF') { queue('kick'); return null; }
    if (code === 'KeyZ') { queue('nohander'); return null; }
    if (code === 'KeyX') { queue('superman'); return null; }
    if (code === 'KeyC') return 'classic'; // heel clicker / title mode swap
    if ((code === 'KeyS' || code === 'ArrowDown')) { queue('backflip'); return 'brake'; }
    if (code === 'Enter') { press.enter = true; return 'enter'; }
    if (code === 'KeyR') return 'restart';
    if (code === 'Escape') return 'title';
    if (code === 'Backspace') { if (e.preventDefault) e.preventDefault(); return 'title'; }
    if (code === 'KeyG') return 'ghost';
    if (code === 'KeyM') return 'mute';
    if (code === 'KeyT') return 'crt';
    if (code === 'KeyH') return 'help';
    if (code === 'KeyD') return 'daily';
    if (code === 'ArrowLeft') return 'mountain-left';
    if (code === 'ArrowRight') return 'mountain-right';
    if (code === 'ArrowUp') return 'diff-up';
    if (code === 'ArrowDown') return 'diff-down';
    return null;
  }

  function handleKeyUp(e) {
    if (!e) return;
    const held = KEYMAP[e.code];
    if (held) keys[held] = false;
  }

  /** Poll a standard-mapping gamepad; consumes edges into the press queue. */
  function pollGamepad() {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
    const pads = navigator.getGamepads();
    let gp = null;
    for (const p of pads) { if (p && p.connected && p.mapping === 'standard') { gp = p; break; } }
    if (!gp) for (const p of pads) { if (p && p.connected) { gp = p; break; } }
    if (!gp) {
      for (const a in padHeld) if (padHeld[a]) { padHeld[a] = false; keys[a] = false; }
      return;
    }
    const btn = (i) => { const b = gp.buttons[i]; return !!b && (b.pressed || b.value > 0.5); };
    const ax = (i) => (gp.axes.length > i ? gp.axes[i] : 0);
    const pullBack = btn(6) || btn(13) || ax(1) > 0.6;
    const hold = {
      left: ax(0) < -PAD_DEAD || btn(14),
      right: ax(0) > PAD_DEAD || btn(15),
      pedal: btn(7) || btn(12),
      brake: pullBack,
      boost: btn(5),
    };
    for (const a in hold) { if (hold[a] !== padHeld[a]) { padHeld[a] = hold[a]; keys[a] = hold[a]; } }
    const edge = (k, is) => { const was = padPrev[k] || false; padPrev[k] = is; return is && !was; };
    const cross = edge('b0', btn(0)), circle = edge('b1', btn(1)), square = edge('b2', btn(2)),
      tri = edge('b3', btn(3)), l1 = edge('b4', btn(4)), share = edge('b8', btn(8)),
      opts = edge('b9', btn(9)), r3 = edge('b11', btn(11)), pad = edge('b17', btn(17)),
      back = edge('back', pullBack);
    if (cross) { queue('hop'); press.enter = true; }
    if (square) queue('punch');
    if (circle) queue('kick');
    if (l1) queue('nohander');
    if (tri) queue('superman');
    if (r3 || pad) queue('heel');
    if (opts) press.enter = true;
    if (back) queue('backflip');
  }

  /** Consume the current held/edge state into a normalized control. */
  function consumeControls(active) {
    const inp = neutralControls();
    const touch = typeof window !== 'undefined' && window.__dmTouchPedal;
    inp.pedal = active && (keys.pedal || touch) ? 1 : 0;
    inp.brake = active && keys.brake ? 1 : 0;
    inp.steer = active ? ((keys.right ? 1 : 0) - (keys.left ? 1 : 0)) : 0;
    inp.boost = active && !!keys.boost;
    if (active && fresh(press.hop)) { inp.hop = true; press.hop = 0; }
    if (active && fresh(press.punch)) { inp.punch = true; press.punch = 0; }
    if (active && fresh(press.kick)) { inp.kick = true; press.kick = 0; }
    if (active && fresh(press.trickAt)) { inp.trick = press.trick; press.trick = null; press.trickAt = 0; }
    return inp;
  }

  function takeEnter() { const on = !!press.enter; press.enter = false; return on; }

  function neutralize() {
    for (const k in keys) keys[k] = false;
    for (const k in padHeld) padHeld[k] = false;
    for (const k in padPrev) padPrev[k] = false;
    press.hop = press.punch = press.kick = 0;
    press.trick = null; press.trickAt = 0; press.enter = false;
  }

  return {
    keys,
    press,
    handleKeyDown,
    handleKeyUp,
    pollGamepad,
    consumeControls,
    takeEnter,
    queue,
    neutralize,
    setKey(name, value) { keys[name] = !!value; },
    toggleBoostLatch() { boostLatch = !boostLatch; keys.boost = boostLatch; return boostLatch; },
    get boostLatch() { return boostLatch; },
  };
}
