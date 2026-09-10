/**
 * Downhill Mayhem HUD (integrate-multiplayer-downhill-mayhem-arcade 5.5). Builds
 * its own DOM subtree under an explicit `root` (lobby/title, countdown, racing,
 * results). Consumes no global element ids; the shell/host owns the root and the
 * CSS. Ported from the source `initHud`/`updateHud`/`showResults`.
 */

import { clamp, FINISH_S } from './course.js';
import { TRICKS } from '../../../../shared/downhill/rules.js';

export function ordinal(n) {
  return n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');
}
export function fmtTime(t) {
  if (t == null) return '—';
  const m = Math.floor(t / 60), s = t - m * 60;
  return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2);
}

const TEMPLATE = `
  <div class="dm-hud" hidden>
    <div class="dm-pos"><span class="dm-big">6th</span><span class="dm-small"> /6</span></div>
    <div class="dm-gap"></div>
    <div class="dm-timer">0:00.00</div>
    <div class="dm-mode"></div>
    <div class="dm-target"></div>
    <div class="dm-speed"><span class="dm-num">0</span><br><span class="dm-unit">km/h</span></div>
    <div class="dm-boost">
      <div class="dm-label">BOOST</div>
      <div class="dm-bar"><div class="dm-fill"></div></div>
    </div>
    <div class="dm-prog"><div class="dm-flag">🏁</div></div>
    <div class="dm-trick" hidden><div class="dm-fill"></div></div>
    <div class="dm-count" hidden></div>
    <div class="dm-hint">W pedal · S brake/backflip · A D steer · SPACE hop · Z X C tricks · SHIFT boost · E punch · F kick · R restart · ESC title</div>
  </div>
  <div class="dm-title">
    <div class="dm-logo"><span class="dm-l1">DOWNHILL</span><span class="dm-l2">MAYHEM</span></div>
    <div class="dm-tag">Race 5 rivals down two kilometres of mountain. Tricks charge your boost. Fists settle the rest.</div>
    <div class="dm-best"></div>
    <div class="dm-chal"></div>
    <div class="dm-sel dm-mountain"></div>
    <div class="dm-sel dm-diff"></div>
    <div class="dm-sel dm-daily"></div>
    <div class="dm-press">PRESS ENTER</div>
  </div>
  <div class="dm-results" hidden>
    <div class="dm-respanel">
      <div class="dm-restitle">RESULTS</div>
      <div class="dm-resmode"></div>
      <div class="dm-reschal" hidden></div>
      <div class="dm-ressub"></div>
      <table class="dm-restable"></table>
      <div class="dm-resagain">R — RACE AGAIN · ESC — TITLE</div>
    </div>
  </div>
`;

function noop() {}

export function createHud({ root = null, doc = null } = {}) {
  const documentRef = doc || (typeof document !== 'undefined' ? document : null);
  if (!documentRef || !root) {
    return {
      els: null,
      setPhase: noop, setCountdown: noop, updateRacing: noop,
      showTitle: noop, showResults: noop, setHint: noop, dispose: noop,
    };
  }

  const wrap = documentRef.createElement('div');
  wrap.className = 'dm-hudroot';
  wrap.innerHTML = TEMPLATE;
  root.appendChild(wrap);

  const q = (sel) => wrap.querySelector(sel);
  const els = {
    wrap,
    hud: q('.dm-hud'),
    posBig: q('.dm-pos .dm-big'),
    gap: q('.dm-gap'),
    timer: q('.dm-timer'),
    mode: q('.dm-mode'),
    target: q('.dm-target'),
    speedNum: q('.dm-speed .dm-num'),
    boostFill: q('.dm-boost .dm-fill'),
    prog: q('.dm-prog'),
    trick: q('.dm-trick'),
    trickFill: q('.dm-trick .dm-fill'),
    count: q('.dm-count'),
    hint: q('.dm-hint'),
    title: q('.dm-title'),
    best: q('.dm-best'),
    chal: q('.dm-chal'),
    selMountain: q('.dm-mountain'),
    selDiff: q('.dm-diff'),
    selDaily: q('.dm-daily'),
    press: q('.dm-press'),
    results: q('.dm-results'),
    resTitle: q('.dm-restitle'),
    resMode: q('.dm-resmode'),
    resChal: q('.dm-reschal'),
    resSub: q('.dm-ressub'),
    resTable: q('.dm-restable'),
  };
  const dots = [];
  let hintVisible = true;

  return {
    els,
    setPhase(phase) {
      els.hud.hidden = phase === 'lobby' || phase === 'results';
      els.title.hidden = phase !== 'lobby';
      els.results.hidden = phase !== 'results';
      if (phase !== 'countdown') els.count.hidden = true;
      if (phase !== 'racing') els.trick.hidden = true;
    },
    setCountdown(digit) {
      if (digit == null) { els.count.hidden = true; return; }
      els.count.hidden = false;
      els.count.textContent = digit;
    },
    setHint(on) { hintVisible = !!on; els.hint.style.opacity = hintVisible ? '1' : '0'; },
    showTitle({ best = null, challengeActive = false, challengeLabel = '', mountain = '', difficulty = '', dailyLabel = '', craftedMountain = '', onDaily = false } = {}) {
      els.best.textContent = best != null ? ('YOUR BEST · ' + fmtTime(best)) : 'NO TIME SET YET';
      els.chal.textContent = challengeActive ? ('⚑ CHALLENGE — BEAT ' + challengeLabel)
        : (challengeLabel ? ('⚑ challenge waits · ' + challengeLabel) : '');
      els.chal.style.color = challengeActive ? '' : '#9aa0a8';
      els.selMountain.textContent = '⛰ MOUNTAIN  ◀ ' + craftedMountain + ' ▶  (← →)';
      els.selDiff.textContent = '🔥 DIFFICULTY  ◀ ' + difficulty + ' ▶  (↑ ↓)';
      els.selDaily.textContent = '📅 TODAY’S DAILY · ' + dailyLabel + (onDaily ? '  ▶ RACING' : '  (D)');
      els.press.textContent = challengeActive ? 'ENTER — ACCEPT CHALLENGE' : 'PRESS ENTER';
    },
    updateRacing({ player, riders, raceTime, racing, modeLabel = '', target = '', gapAhead = null, gapBehind = null, challengeActive = false }) {
      if (!els.hud || !player) return;
      els.speedNum.textContent = String(Math.round(player.vs * 3.6));
      els.posBig.textContent = ordinal(player.racePos || 1);
      els.timer.textContent = fmtTime(player.finished ? player.finishTime : (racing ? raceTime : 0));
      els.mode.textContent = modeLabel;
      els.target.textContent = target;
      if (racing && !player.finished && raceTime > 2) {
        if (player.racePos > 1 && gapAhead) {
          els.gap.textContent = '▲ ' + gapAhead.name + ' +' + gapAhead.seconds.toFixed(1) + 's';
        } else if (gapBehind) {
          els.gap.textContent = '▼ ' + gapBehind.name + ' +' + gapBehind.seconds.toFixed(1) + 's';
        } else els.gap.textContent = '';
      } else els.gap.textContent = '';
      els.boostFill.style.width = clamp(player.meter, 0, 100).toFixed(0) + '%';

      if (dots.length !== riders.length) {
        els.prog.innerHTML = '<div class="dm-flag">🏁</div>';
        dots.length = 0;
        for (const r of riders) {
          const d = documentRef.createElement('div');
          d.className = 'dm-dot' + (r.isHuman ? ' dm-me' : '');
          d.style.background = '#' + (r.color ?? r.def.color).toString(16).padStart(6, '0');
          els.prog.appendChild(d); dots.push(d);
        }
      }
      for (let i = 0; i < riders.length && i < dots.length; i++) {
        dots[i].style.top = (clamp(riders[i].s / FINISH_S, 0, 1) * 100) + '%';
      }
      if (player.trick) {
        const def = TRICKS[player.trick];
        els.trick.hidden = false;
        els.trickFill.style.width = (clamp(player.trickT / def.dur, 0, 1) * 100).toFixed(0) + '%';
      } else els.trick.hidden = true;
    },
    showResults({ order, player, modeLabel = '', best = null, challenge = null }) {
      els.title.hidden = true; els.hud.hidden = true; els.results.hidden = false;
      const winner = order[0];
      let html = '';
      order.forEach((r, i) => {
        const gap = (r.finished && winner.finished && r !== winner) ? '+' + (r.finishTime - winner.finishTime).toFixed(2) : '';
        html += '<tr' + (r.isHuman ? ' class="dm-me"' : '') + '><td>' + ordinal(i + 1) + '</td>' +
          '<td><span class="dm-chip" style="background:#' + (r.color ?? r.def.color).toString(16).padStart(6, '0') + '"></span>' + r.def.name + '</td>' +
          '<td>' + (r.finished ? fmtTime(r.finishTime) : '—') + '</td><td>' + gap + '</td></tr>';
      });
      els.resTable.innerHTML = html;
      els.resMode.textContent = modeLabel;
      els.resSub.textContent = player.finished
        ? ('You finished ' + ordinal(player.racePos) + ' — ' + fmtTime(player.finishTime) + (best != null ? ' · best ' + fmtTime(best) : ''))
        : 'DNF';
      if (challenge && player.chalDiff != null) {
        const won = player.chalDiff < 0;
        els.resChal.hidden = false;
        els.resChal.className = 'dm-reschal ' + (won ? 'dm-win' : 'dm-lose');
        els.resChal.textContent = won ? ('⚑ CHALLENGE BEATEN by ' + (-player.chalDiff).toFixed(2) + 's ✓')
          : ('⚑ CHALLENGE MISSED by +' + player.chalDiff.toFixed(2) + 's ✗');
      } else els.resChal.hidden = true;
    },
    dispose() {
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
      dots.length = 0;
    },
  };
}
