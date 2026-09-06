import { EMOTES, emoteSector } from '../../shared/emotes.js';

export function createEmoteWheel({ canOpen, onOpen, onChoose }) {
  const overlay = document.createElement('div');
  overlay.className = 'emote-overlay';
  overlay.hidden = true;
  overlay.innerHTML = `<section class="emote-wheel" role="dialog" aria-label="Emotes" aria-describedby="emote-help"><div class="emote-center"><small>EXPRESS YOURSELF</small><strong aria-live="polite">Choose a feeling</strong><span class="emote-description">Move outward to choose</span><i class="emote-stick"></i></div>${EMOTES.map((e, i) => `<button class="emote-choice" style="--x:${Math.sin(i * Math.PI / 3) * 36}%;--y:${-Math.cos(i * Math.PI / 3) * 36}%" data-index="${i}" aria-label="${e.label}"><span>${e.icon}</span><b>${e.label}</b><small>${i + 1}</small></button>`).join('')}<p id="emote-help">Release V to perform · Center / Esc cancels<br>Or choose with 1–6 / arrow keys</p></section>`;
  document.body.append(overlay);
  const wheel = overlay.querySelector('.emote-wheel');
  const buttons = [...overlay.querySelectorAll('button')];
  let selected = -1, held = false, previousFocus;
  function select(index) {
    selected = index;
    buttons.forEach((b, i) => { b.classList.toggle('selected', i === index); b.setAttribute('aria-pressed', String(i === index)); });
    overlay.querySelector('strong').textContent = EMOTES[index]?.label || 'Choose a feeling';
    overlay.querySelector('.emote-description').textContent = EMOTES[index]?.hint || 'Center to cancel';
  }
  function close(commit = false) {
    if (overlay.hidden) return;
    const choice = EMOTES[selected];
    overlay.hidden = true;
    held = false;
    previousFocus?.focus({ preventScroll: true });
    if (commit && choice) onChoose(choice.id);
  }
  function open(isHeld = false) {
    if (!overlay.hidden || !canOpen()) return;
    onOpen();
    previousFocus = document.activeElement;
    held = isHeld;
    overlay.hidden = false;
    select(-1);
    overlay.querySelector('.emote-stick').style.transform = '';
    buttons[0].focus({ preventScroll: true });
  }
  overlay.addEventListener('pointermove', e => {
    const r = wheel.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
    select(emoteSector(x, y, r.width * .12));
    const length = Math.hypot(x, y) || 1;
    overlay.querySelector('.emote-stick').style.transform = `translate(${x / length * Math.min(16, length)}px, ${y / length * Math.min(16, length)}px)`;
  });
  overlay.addEventListener('click', e => {
    const button = e.target.closest('button');
    if (button) { select(Number(button.dataset.index)); close(true); }
    else close();
  });
  window.addEventListener('keydown', e => {
    const typing = e.target.closest('input,textarea,select,[contenteditable="true"]');
    if (overlay.hidden) {
      if (e.code === 'KeyV' && !e.repeat && !typing && !e.ctrlKey && !e.metaKey && !e.altKey && canOpen()) {
        e.preventDefault(); e.stopImmediatePropagation(); open(true);
      }
      return;
    }
    e.stopImmediatePropagation();
    if (e.code === 'Tab') {
      e.preventDefault(); select((selected + (e.shiftKey ? 5 : 1) + 6) % 6); buttons[selected].focus(); return;
    }
    e.preventDefault();
    if (e.code === 'Escape') close();
    else if (/^Digit[1-6]$/.test(e.code)) select(Number(e.code.slice(-1)) - 1);
    else if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.code)) select((selected + (['ArrowLeft', 'ArrowUp'].includes(e.code) ? 5 : 1) + 6) % 6);
    else if (e.code === 'Enter' || e.code === 'Space') close(true);
  }, true);
  window.addEventListener('keyup', e => {
    if (e.code === 'KeyV' && held) { e.preventDefault(); e.stopImmediatePropagation(); close(true); }
  }, true);
  window.addEventListener('blur', () => close());
  document.addEventListener('visibilitychange', () => { if (document.hidden) close(); });
  window.addEventListener('resize', () => close());
  return { open, close, get isOpen() { return !overlay.hidden; } };
}
