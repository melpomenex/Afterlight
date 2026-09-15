/**
 * Chat Appearance Settings Dialog with Interactive Live Preview.
 *
 * Lets players customize visual presets, density, font sizes, layouts,
 * background treatments, and world theme bindings, showing an immediate
 * live preview of changes before closing.
 */

import {
  PRESET_DEFINITIONS,
  DEFAULT_CHAT_PREFERENCES,
} from './chatPreferences.js';

export class AppearanceModal {
  constructor(prefsManager, { onClose = null } = {}) {
    this.prefsManager = prefsManager;
    this.onClose = onClose;
    this.dialog = null;
    this.previewBox = null;

    this.#buildDOM();
    this.#bindEvents();
  }

  // --- Public API -----------------------------------------------------------

  open() {
    if (!this.dialog) return;
    this.#syncForm();
    this.#updatePreview();
    if (!this.dialog.open) {
      if (typeof this.dialog.showModal === 'function') {
        this.dialog.showModal();
      } else {
        this.dialog.setAttribute('open', '');
      }
    }
  }

  close() {
    if (!this.dialog) return;
    if (this.dialog.open) {
      if (typeof this.dialog.close === 'function') {
        this.dialog.close();
      } else {
        this.dialog.removeAttribute('open');
      }
    }
    this.onClose?.();
  }

  // --- DOM Construction -----------------------------------------------------

  #buildDOM() {
    this.dialog = document.createElement('dialog');
    this.dialog.id = 'chat-appearance-dialog';
    this.dialog.className = 'game-modal chat-appearance-modal';
    this.dialog.setAttribute('aria-label', 'Chat Appearance Settings');

    const headerTag = document.createElement('div');
    headerTag.className = 'modal-header-tag micro';
    headerTag.textContent = 'CUSTOMIZATION';
    this.dialog.appendChild(headerTag);

    const title = document.createElement('h2');
    title.textContent = 'Chat Appearance';
    this.dialog.appendChild(title);

    const sub = document.createElement('p');
    sub.className = 'modal-sub';
    sub.textContent = 'Personalize your reading, messaging, and visual environment.';
    this.dialog.appendChild(sub);

    const grid = document.createElement('div');
    grid.className = 'chat-appearance-grid';

    // Left controls column
    const controlsCol = document.createElement('div');
    controlsCol.className = 'chat-appearance-controls';

    // 1. Preset
    const presetGroup = document.createElement('div');
    presetGroup.className = 'chat-pref-group';
    const presetLabel = document.createElement('label');
    presetLabel.className = 'chat-pref-label';
    presetLabel.htmlFor = 'chat-pref-preset';
    presetLabel.textContent = 'Theme Preset';
    presetGroup.appendChild(presetLabel);

    this.presetSelect = document.createElement('select');
    this.presetSelect.id = 'chat-pref-preset';
    this.presetSelect.className = 'chat-pref-select';
    for (const [id, def] of Object.entries(PRESET_DEFINITIONS)) {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = def.label;
      this.presetSelect.appendChild(opt);
    }
    presetGroup.appendChild(this.presetSelect);

    this.presetDesc = document.createElement('span');
    this.presetDesc.id = 'chat-pref-preset-desc';
    this.presetDesc.className = 'chat-pref-help';
    presetGroup.appendChild(this.presetDesc);
    controlsCol.appendChild(presetGroup);

    // 2. Layout
    const layoutGroup = document.createElement('div');
    layoutGroup.className = 'chat-pref-group';
    const layoutLabel = document.createElement('label');
    layoutLabel.className = 'chat-pref-label';
    layoutLabel.textContent = 'Message Layout';
    layoutGroup.appendChild(layoutLabel);

    this.layoutSeg = document.createElement('div');
    this.layoutSeg.id = 'chat-pref-layout';
    this.layoutSeg.className = 'chat-segmented';
    this.layoutSeg.setAttribute('role', 'radiogroup');
    for (const val of ['comfortable', 'compact', 'bubble']) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chat-seg-btn';
      btn.dataset.val = val;
      btn.textContent = val.charAt(0).toUpperCase() + val.slice(1);
      this.layoutSeg.appendChild(btn);
    }
    layoutGroup.appendChild(this.layoutSeg);
    controlsCol.appendChild(layoutGroup);

    // 3. Density
    const densityGroup = document.createElement('div');
    densityGroup.className = 'chat-pref-group';
    const densityLabel = document.createElement('label');
    densityLabel.className = 'chat-pref-label';
    densityLabel.textContent = 'Density';
    densityGroup.appendChild(densityLabel);

    this.densitySeg = document.createElement('div');
    this.densitySeg.id = 'chat-pref-density';
    this.densitySeg.className = 'chat-segmented';
    this.densitySeg.setAttribute('role', 'radiogroup');
    for (const val of ['compact', 'default', 'spacious']) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chat-seg-btn';
      btn.dataset.val = val;
      btn.textContent = val.charAt(0).toUpperCase() + val.slice(1);
      this.densitySeg.appendChild(btn);
    }
    densityGroup.appendChild(this.densitySeg);
    controlsCol.appendChild(densityGroup);

    // 4. Font Size
    const fontGroup = document.createElement('div');
    fontGroup.className = 'chat-pref-group';
    const fontLabel = document.createElement('label');
    fontLabel.className = 'chat-pref-label';
    fontLabel.textContent = 'Font Size';
    fontGroup.appendChild(fontLabel);

    this.fontSeg = document.createElement('div');
    this.fontSeg.id = 'chat-pref-font';
    this.fontSeg.className = 'chat-segmented';
    this.fontSeg.setAttribute('role', 'radiogroup');
    for (const val of ['small', 'normal', 'large']) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chat-seg-btn';
      btn.dataset.val = val;
      btn.textContent = val.charAt(0).toUpperCase() + val.slice(1);
      this.fontSeg.appendChild(btn);
    }
    fontGroup.appendChild(this.fontSeg);
    controlsCol.appendChild(fontGroup);

    // 5. Background
    const bgGroup = document.createElement('div');
    bgGroup.className = 'chat-pref-group';
    const bgLabel = document.createElement('label');
    bgLabel.className = 'chat-pref-label';
    bgLabel.htmlFor = 'chat-pref-bg';
    bgLabel.textContent = 'Background Style';
    bgGroup.appendChild(bgLabel);

    this.bgSelect = document.createElement('select');
    this.bgSelect.id = 'chat-pref-bg';
    this.bgSelect.className = 'chat-pref-select';
    const bgOptions = [
      { val: 'translucent', label: 'Translucent Patina' },
      { val: 'solid', label: 'Solid Slate' },
      { val: 'glass', label: 'Frosted Glass' },
      { val: 'transparent', label: 'High Transparency' },
      { val: 'match-world', label: 'Match Active World (◈ Ambient)' },
    ];
    for (const opt of bgOptions) {
      const o = document.createElement('option');
      o.value = opt.val;
      o.textContent = opt.label;
      this.bgSelect.appendChild(o);
    }
    bgGroup.appendChild(this.bgSelect);
    controlsCol.appendChild(bgGroup);

    // 6. Timestamps
    const timeGroup = document.createElement('div');
    timeGroup.className = 'chat-pref-group';
    const timeLabel = document.createElement('label');
    timeLabel.className = 'chat-pref-label';
    timeLabel.htmlFor = 'chat-pref-timestamps';
    timeLabel.textContent = 'Timestamps';
    timeGroup.appendChild(timeLabel);

    this.timeSelect = document.createElement('select');
    this.timeSelect.id = 'chat-pref-timestamps';
    this.timeSelect.className = 'chat-pref-select';
    for (const opt of [{ val: 'always', label: 'Always Visible' }, { val: 'hover', label: 'On Hover' }, { val: 'hidden', label: 'Hidden' }]) {
      const o = document.createElement('option');
      o.value = opt.val;
      o.textContent = opt.label;
      this.timeSelect.appendChild(o);
    }
    timeGroup.appendChild(this.timeSelect);
    controlsCol.appendChild(timeGroup);

    // 7. Checkboxes
    const checkGroup = document.createElement('div');
    checkGroup.className = 'chat-pref-checkboxes';

    const avLabel = document.createElement('label');
    avLabel.className = 'chat-pref-check-label';
    this.avatarsCheck = document.createElement('input');
    this.avatarsCheck.type = 'checkbox';
    this.avatarsCheck.id = 'chat-pref-avatars';
    avLabel.appendChild(this.avatarsCheck);
    const avSpan = document.createElement('span');
    avSpan.textContent = 'Show player initials / avatar badges';
    avLabel.appendChild(avSpan);
    checkGroup.appendChild(avLabel);

    const grpLabel = document.createElement('label');
    grpLabel.className = 'chat-pref-check-label';
    this.groupingCheck = document.createElement('input');
    this.groupingCheck.type = 'checkbox';
    this.groupingCheck.id = 'chat-pref-grouping';
    grpLabel.appendChild(this.groupingCheck);
    const grpSpan = document.createElement('span');
    grpSpan.textContent = 'Group consecutive messages from same user';
    grpLabel.appendChild(grpSpan);
    checkGroup.appendChild(grpLabel);

    controlsCol.appendChild(checkGroup);
    grid.appendChild(controlsCol);

    // Right preview column
    const previewCol = document.createElement('div');
    previewCol.className = 'chat-appearance-preview-col';
    const previewLabel = document.createElement('span');
    previewLabel.className = 'micro';
    previewLabel.style.color = '#c4b582';
    previewLabel.style.marginBottom = '6px';
    previewLabel.style.display = 'block';
    previewLabel.textContent = 'LIVE PREVIEW';
    previewCol.appendChild(previewLabel);

    const previewWrap = document.createElement('div');
    previewWrap.className = 'chat-preview-wrapper';

    this.previewBox = document.createElement('div');
    this.previewBox.id = 'chat-preview-box';
    this.previewBox.className = 'chat-panel chat-preview-box';

    const previewToggle = document.createElement('div');
    previewToggle.className = 'chat-toggle';
    const previewToggleMicro = document.createElement('span');
    previewToggleMicro.className = 'micro';
    previewToggleMicro.textContent = 'TOWN CHANNEL #afterlight';
    previewToggle.appendChild(previewToggleMicro);
    this.previewBox.appendChild(previewToggle);

    const previewLog = document.createElement('div');
    previewLog.className = 'chat-log';
    previewLog.id = 'chat-preview-log';

    const addMockGroup = (sender, initial, time, lines, isSelf = false) => {
      const g = document.createElement('div');
      g.className = `chat-group${isSelf ? ' self' : ''}`;
      g.dataset.sender = sender;

      const gh = document.createElement('div');
      gh.className = 'chat-group-header';
      const av = document.createElement('span');
      av.className = 'chat-avatar-badge';
      av.textContent = initial;
      gh.appendChild(av);

      const nk = document.createElement('span');
      nk.className = 'chat-nick';
      nk.textContent = sender;
      gh.appendChild(nk);

      const tm = document.createElement('span');
      tm.className = 'chat-time';
      tm.textContent = time;
      gh.appendChild(tm);
      g.appendChild(gh);

      for (const text of lines) {
        const ln = document.createElement('div');
        ln.className = `chat-line${isSelf ? ' self' : ''}`;
        const b = document.createElement('span');
        b.className = 'chat-body';
        b.textContent = text;
        ln.appendChild(b);
        g.appendChild(ln);
      }
      previewLog.appendChild(g);
    };

    addMockGroup('KilnBot', 'KB', '12:40', ['Heading to The Orpheum? 👋']);
    addMockGroup('Nova', 'NV', '12:41', ['Yeah, pool table in 5 mins!', 'Bringing popcorn 🍿']);
    addMockGroup('You', 'ME', '12:42', ['Count me in! ✨'], true);

    this.previewBox.appendChild(previewLog);
    previewWrap.appendChild(this.previewBox);
    previewCol.appendChild(previewWrap);
    grid.appendChild(previewCol);
    this.dialog.appendChild(grid);

    // Modal footer
    const footer = document.createElement('div');
    footer.className = 'modal-footer';
    footer.style.display = 'flex';
    footer.style.justifyContent = 'space-between';
    footer.style.marginTop = '24px';

    this.resetBtn = document.createElement('button');
    this.resetBtn.type = 'button';
    this.resetBtn.id = 'chat-pref-reset';
    this.resetBtn.className = 'btn-secondary';
    this.resetBtn.textContent = 'Reset to defaults';
    footer.appendChild(this.resetBtn);

    this.doneBtn = document.createElement('button');
    this.doneBtn.type = 'button';
    this.doneBtn.id = 'chat-pref-done';
    this.doneBtn.className = 'action-btn';
    this.doneBtn.textContent = 'Done';
    footer.appendChild(this.doneBtn);

    this.dialog.appendChild(footer);
    document.body?.appendChild(this.dialog);
  }

  #bindEvents() {
    this.dialog.addEventListener('cancel', (e) => {
      e.preventDefault();
      this.close();
    });

    this.doneBtn.addEventListener('click', () => this.close());
    this.resetBtn.addEventListener('click', () => {
      this.prefsManager.resetToDefaults();
      this.#syncForm();
      this.#updatePreview();
    });

    // Preset selection
    this.presetSelect.addEventListener('change', () => {
      this.prefsManager.applyPreset(this.presetSelect.value);
      this.#syncForm();
      this.#updatePreview();
    });

    // Segmented controls helper
    const setupSegmented = (container, prefKey) => {
      container.addEventListener('click', (e) => {
        const btn = e.target.closest('.chat-seg-btn');
        if (!btn) return;
        const val = btn.dataset.val;
        this.prefsManager.setPreferences({ [prefKey]: val });
        this.#syncForm();
        this.#updatePreview();
      });
    };

    setupSegmented(this.layoutSeg, 'layout');
    setupSegmented(this.densitySeg, 'density');
    setupSegmented(this.fontSeg, 'fontSize');

    // Background select
    this.bgSelect.addEventListener('change', (e) => {
      this.prefsManager.setPreferences({ background: e.target.value });
      this.#updatePreview();
    });

    // Timestamps select
    this.timeSelect.addEventListener('change', (e) => {
      this.prefsManager.setPreferences({ timestamps: e.target.value });
      this.#updatePreview();
    });

    // Checkboxes
    this.avatarsCheck.addEventListener('change', (e) => {
      this.prefsManager.setPreferences({ showAvatars: e.target.checked });
      this.#updatePreview();
    });

    this.groupingCheck.addEventListener('change', (e) => {
      this.prefsManager.setPreferences({ groupConsecutive: e.target.checked });
      this.#updatePreview();
    });
  }

  #syncForm() {
    const p = this.prefsManager.getPreferences();

    if (this.presetSelect) this.presetSelect.value = p.preset;
    if (this.presetDesc && PRESET_DEFINITIONS[p.preset]) {
      this.presetDesc.textContent = PRESET_DEFINITIONS[p.preset].description;
    }

    const syncSegmented = (container, val) => {
      if (!container) return;
      container.querySelectorAll('.chat-seg-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.val === val);
      });
    };

    syncSegmented(this.layoutSeg, p.layout);
    syncSegmented(this.densitySeg, p.density);
    syncSegmented(this.fontSeg, p.fontSize);

    if (this.bgSelect) this.bgSelect.value = p.background;
    if (this.timeSelect) this.timeSelect.value = p.timestamps;
    if (this.avatarsCheck) this.avatarsCheck.checked = p.showAvatars;
    if (this.groupingCheck) this.groupingCheck.checked = p.groupConsecutive;
  }

  #updatePreview() {
    if (!this.previewBox) return;
    this.prefsManager.applyToElement(this.previewBox);
  }
}
