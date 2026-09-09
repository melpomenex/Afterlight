/**
 * Telescope HUD: shared object list, mark / highlight, noncompetitive leave.
 */

const HUD_STYLE = `
  position:fixed;left:18px;bottom:92px;z-index:24;width:300px;
  padding:12px 14px;background:rgba(10,18,28,.8);border:1px solid rgba(159,208,198,.28);
  border-radius:4px 14px 4px 14px;color:#e8f0f4;font:12px/1.4 "DM Sans",sans-serif;
`;

export function createTelescopeController({
  onSend = null,
  onLeave = null,
} = {}) {
  let enabled = false;
  let selectedId = 'vega';
  let hud = null;
  let listEl = null;
  let statusEl = null;
  let yawVal = 0;
  let pitchVal = 0.35;

  function createHud() {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') return;
    hud = document.createElement('div');
    hud.setAttribute('role', 'region');
    hud.setAttribute('aria-label', 'Night telescope');
    hud.style.cssText = HUD_STYLE;
    hud.style.display = 'none';
    hud.innerHTML = `
      <div style="letter-spacing:.12em;font:11px/1 'Space Mono',monospace;color:#9fd0c6;">DESERT CAMP · TELESCOPE</div>
      <div data-role="status" style="margin:.4rem 0 .55rem;color:#d6c496;">Find the same star. No winner.</div>
      <label style="display:block;margin:.25rem 0;">Look yaw
        <input data-role="yaw" type="range" min="-3.14" max="3.14" step="0.02" value="0" style="width:100%">
      </label>
      <label style="display:block;margin:.25rem 0;">Look pitch
        <input data-role="pitch" type="range" min="-0.4" max="1.2" step="0.02" value="0.35" style="width:100%">
      </label>
      <div data-role="list" style="max-height:9rem;overflow:auto;margin:.4rem 0;border-top:1px solid rgba(255,255,255,.08);"></div>
      <div style="display:flex;gap:8px;">
        <button type="button" data-role="mark" style="flex:1;padding:.45rem .6rem;background:#d6c496;border:0;color:#1b120c;border-radius:6px;">Mark</button>
        <button type="button" data-role="highlight" style="flex:1;padding:.45rem .6rem;background:transparent;border:1px solid #9fd0c6;color:#e8f0f4;border-radius:6px;">Highlight</button>
        <button type="button" data-role="leave" style="padding:.45rem .6rem;background:transparent;border:1px solid #8aa;color:#dfe;border-radius:6px;">Leave</button>
      </div>
    `;
    document.body.appendChild(hud);
    listEl = hud.querySelector('[data-role="list"]');
    statusEl = hud.querySelector('[data-role="status"]');

    hud.querySelector('[data-role="yaw"]').addEventListener('input', (e) => {
      yawVal = Number(e.target.value);
      onSend?.({ kind: 'look', yaw: yawVal, pitch: pitchVal });
    });
    hud.querySelector('[data-role="pitch"]').addEventListener('input', (e) => {
      pitchVal = Number(e.target.value);
      onSend?.({ kind: 'look', yaw: yawVal, pitch: pitchVal });
    });
    hud.querySelector('[data-role="mark"]').addEventListener('click', (e) => {
      e.stopPropagation();
      if (selectedId) onSend?.({ kind: 'mark', objectId: selectedId });
    });
    hud.querySelector('[data-role="highlight"]').addEventListener('click', (e) => {
      e.stopPropagation();
      if (selectedId) onSend?.({ kind: 'highlight', objectId: selectedId });
    });
    hud.querySelector('[data-role="leave"]').addEventListener('click', (e) => {
      e.stopPropagation();
      onLeave?.();
    });
  }

  createHud();

  return {
    get look() {
      return { yaw: yawVal, pitch: pitchVal };
    },

    enable() {
      enabled = true;
      if (hud) hud.style.display = 'block';
    },

    disable() {
      enabled = false;
      if (hud) hud.style.display = 'none';
    },

    update(simState) {
      if (!enabled || !simState || !listEl) return;
      const objects = simState.sky?.objects || [];
      const marks = simState.marks || {};
      listEl.innerHTML = '';
      for (const object of objects) {
        const row = document.createElement('button');
        row.type = 'button';
        const mark = marks[object.id];
        const tag = mark ? ` · marked` : '';
        row.textContent = `${object.name}${tag}`;
        row.style.cssText = `display:block;width:100%;text-align:left;background:${selectedId === object.id ? 'rgba(214,196,150,.18)' : 'transparent'};border:0;color:#e8f0f4;padding:.28rem 0;`;
        row.addEventListener('click', (e) => {
          e.stopPropagation();
          selectedId = object.id;
        });
        listEl.appendChild(row);
      }
      if (statusEl) {
        const markedIds = Object.keys(marks);
        statusEl.textContent = markedIds.length
          ? `Shared mark: ${markedIds[0]}. Leave whenever — no score.`
          : 'Find the same star. No winner.';
      }
    },

    dispose() {
      hud?.parentElement?.removeChild(hud);
      hud = null;
    },
  };
}
