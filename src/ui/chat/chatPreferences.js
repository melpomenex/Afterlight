/**
 * Chat Appearance & Personalization Manager.
 *
 * Owns:
 * - Preference schema, normalization, and validation
 * - 6 authored visual presets (Afterlight, Minimal, Glass, Terminal, Cozy, Cinematic)
 * - Dimensions: layout, density, font size, background, timestamps, avatars, grouping
 * - Active World theme token bindings ('match-world')
 * - Semantic CSS variable application onto .chat-panel
 * - LocalStorage persistence and reactive subscriber notifications
 */

export const PREFERENCE_KEY = 'afterlight-chat-preferences';

export const DEFAULT_CHAT_PREFERENCES = Object.freeze({
  preset: 'afterlight',
  layout: 'comfortable',       // 'comfortable' | 'compact' | 'bubble'
  density: 'default',          // 'compact' | 'default' | 'spacious'
  fontSize: 'normal',          // 'small' | 'normal' | 'large'
  background: 'translucent',   // 'solid' | 'translucent' | 'glass' | 'transparent' | 'match-world'
  timestamps: 'always',        // 'always' | 'hover' | 'hidden'
  showAvatars: true,
  groupConsecutive: true,
  panelWidth: 'default',       // 'narrow' | 'default' | 'wide'
});

export const PRESET_DEFINITIONS = Object.freeze({
  afterlight: {
    label: 'Afterlight',
    description: 'Warm industrial copper, brass accents, and subtle patina (default).',
    layout: 'comfortable',
    density: 'default',
    fontSize: 'normal',
    background: 'translucent',
    timestamps: 'always',
    showAvatars: true,
    fontFamily: 'inherit',
    tokens: {
      accent: '#cfbc8b',
      border: '#c8b78288',
      surface: 'rgba(23, 38, 38, 0.88)',
      text: '#cfd8cc',
      textMuted: '#8b998b',
      bubbleBg: 'rgba(32, 53, 52, 0.65)',
      bubbleSelfBg: 'rgba(54, 76, 68, 0.8)',
      mentionBg: 'rgba(207, 188, 139, 0.15)',
      backdropFilter: 'blur(10px)',
    },
  },
  minimal: {
    label: 'Minimal',
    description: 'Clean, low-contrast slate palette with compact line spacing.',
    layout: 'compact',
    density: 'compact',
    fontSize: 'normal',
    background: 'solid',
    timestamps: 'hover',
    showAvatars: false,
    fontFamily: 'inherit',
    tokens: {
      accent: '#8fa89b',
      border: 'rgba(75, 94, 86, 0.45)',
      surface: '#152120',
      text: '#b8c5be',
      textMuted: '#6f8279',
      bubbleBg: '#1c2c2b',
      bubbleSelfBg: '#233836',
      mentionBg: 'rgba(143, 168, 155, 0.15)',
      backdropFilter: 'none',
    },
  },
  glass: {
    label: 'Glass',
    description: 'Refined frosted glass surface with luminous edges.',
    layout: 'comfortable',
    density: 'default',
    fontSize: 'normal',
    background: 'glass',
    timestamps: 'always',
    showAvatars: true,
    fontFamily: 'inherit',
    tokens: {
      accent: '#9ad9c5',
      border: 'rgba(154, 217, 197, 0.35)',
      surface: 'rgba(16, 29, 30, 0.55)',
      text: '#e2ece7',
      textMuted: '#94aba2',
      bubbleBg: 'rgba(28, 48, 48, 0.45)',
      bubbleSelfBg: 'rgba(38, 68, 64, 0.6)',
      mentionBg: 'rgba(154, 217, 197, 0.2)',
      backdropFilter: 'blur(16px)',
    },
  },
  terminal: {
    label: 'Terminal',
    description: 'Retro amber phosphors and Space Mono typography.',
    layout: 'compact',
    density: 'compact',
    fontSize: 'normal',
    background: 'solid',
    timestamps: 'always',
    showAvatars: false,
    fontFamily: "'Space Mono', monospace",
    tokens: {
      accent: '#ffb443',
      border: 'rgba(255, 180, 67, 0.4)',
      surface: '#111816',
      text: '#ffcf70',
      textMuted: '#b38234',
      bubbleBg: 'rgba(25, 20, 10, 0.8)',
      bubbleSelfBg: 'rgba(45, 33, 15, 0.9)',
      mentionBg: 'rgba(255, 180, 67, 0.25)',
      backdropFilter: 'none',
    },
  },
  cozy: {
    label: 'Cozy',
    description: 'Warm hearth ember tones and spacious speech bubbles.',
    layout: 'bubble',
    density: 'spacious',
    fontSize: 'normal',
    background: 'translucent',
    timestamps: 'always',
    showAvatars: true,
    fontFamily: 'inherit',
    tokens: {
      accent: '#f4b266',
      border: 'rgba(179, 119, 59, 0.45)',
      surface: 'rgba(32, 24, 20, 0.88)',
      text: '#f5e4cb',
      textMuted: '#aa8c72',
      bubbleBg: 'rgba(46, 33, 26, 0.75)',
      bubbleSelfBg: 'rgba(74, 50, 36, 0.85)',
      mentionBg: 'rgba(244, 178, 102, 0.2)',
      backdropFilter: 'blur(8px)',
    },
  },
  cinematic: {
    label: 'Cinematic',
    description: 'High-contrast dark stage styling optimized for stream viewing.',
    layout: 'comfortable',
    density: 'default',
    fontSize: 'large',
    background: 'solid',
    timestamps: 'hover',
    showAvatars: true,
    fontFamily: 'inherit',
    tokens: {
      accent: '#e6d8b6',
      border: '#2c3b3a',
      surface: '#0d1617',
      text: '#f4f4ec',
      textMuted: '#849692',
      bubbleBg: '#152122',
      bubbleSelfBg: '#1f3334',
      mentionBg: 'rgba(230, 216, 182, 0.2)',
      backdropFilter: 'none',
    },
  },
});

export const WORLD_THEME_TOKENS = Object.freeze({
  coastal: {
    accent: '#5fe0cc',
    border: 'rgba(95, 224, 204, 0.35)',
    surface: 'rgba(14, 34, 38, 0.88)',
    bubbleBg: 'rgba(20, 48, 54, 0.65)',
    bubbleSelfBg: 'rgba(28, 70, 78, 0.8)',
    mentionBg: 'rgba(95, 224, 204, 0.18)',
  },
  rainforest: {
    accent: '#7ddb90',
    border: 'rgba(125, 219, 144, 0.35)',
    surface: 'rgba(16, 36, 26, 0.88)',
    bubbleBg: 'rgba(22, 48, 36, 0.65)',
    bubbleSelfBg: 'rgba(32, 72, 52, 0.8)',
    mentionBg: 'rgba(125, 219, 144, 0.18)',
  },
  alpine: {
    accent: '#88c9f9',
    border: 'rgba(136, 201, 249, 0.35)',
    surface: 'rgba(18, 30, 42, 0.88)',
    bubbleBg: 'rgba(26, 44, 62, 0.65)',
    bubbleSelfBg: 'rgba(38, 64, 90, 0.8)',
    mentionBg: 'rgba(136, 201, 249, 0.18)',
  },
  desert: {
    accent: '#f5c469',
    border: 'rgba(245, 196, 105, 0.35)',
    surface: 'rgba(36, 28, 18, 0.88)',
    bubbleBg: 'rgba(52, 40, 26, 0.65)',
    bubbleSelfBg: 'rgba(76, 58, 36, 0.8)',
    mentionBg: 'rgba(245, 196, 105, 0.18)',
  },
  redwood: {
    accent: '#e08b5f',
    border: 'rgba(224, 139, 95, 0.35)',
    surface: 'rgba(34, 22, 18, 0.88)',
    bubbleBg: 'rgba(50, 32, 26, 0.65)',
    bubbleSelfBg: 'rgba(74, 46, 36, 0.8)',
    mentionBg: 'rgba(224, 139, 95, 0.18)',
  },
  cloud: {
    accent: '#b8a2f8',
    border: 'rgba(184, 162, 248, 0.35)',
    surface: 'rgba(26, 22, 40, 0.88)',
    bubbleBg: 'rgba(38, 32, 58, 0.65)',
    bubbleSelfBg: 'rgba(56, 46, 84, 0.8)',
    mentionBg: 'rgba(184, 162, 248, 0.18)',
  },
});

export class ChatPreferencesManager {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    this.subscribers = new Set();
    this.activeWorld = null;
    this.prefs = this.load();
  }

  load() {
    try {
      const raw = this.storage?.getItem?.(PREFERENCE_KEY);
      if (!raw) return { ...DEFAULT_CHAT_PREFERENCES };
      const parsed = JSON.parse(raw);
      return this.#normalize(parsed);
    } catch {
      return { ...DEFAULT_CHAT_PREFERENCES };
    }
  }

  save() {
    try {
      this.storage?.setItem?.(PREFERENCE_KEY, JSON.stringify(this.prefs));
    } catch {}
  }

  getPreferences() {
    return { ...this.prefs };
  }

  setPreferences(partial = {}) {
    this.prefs = this.#normalize({ ...this.prefs, ...partial });
    this.save();
    this.#notify();
    return this.prefs;
  }

  set(key, value) {
    return this.setPreferences({ [key]: value });
  }

  applyPreset(presetId) {
    const preset = PRESET_DEFINITIONS[presetId];
    if (!preset) return this.prefs;

    return this.setPreferences({
      preset: presetId,
      layout: preset.layout,
      density: preset.density,
      fontSize: preset.fontSize,
      background: preset.background,
      timestamps: preset.timestamps,
      showAvatars: preset.showAvatars,
    });
  }

  resetToDefaults() {
    this.prefs = { ...DEFAULT_CHAT_PREFERENCES };
    this.save();
    this.#notify();
    return this.prefs;
  }

  setWorld(worldId) {
    if (this.activeWorld === worldId) return;
    this.activeWorld = worldId;
    if (this.prefs.background === 'match-world') {
      this.#notify();
    }
  }

  subscribe(fn) {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  #notify() {
    for (const fn of this.subscribers) {
      try { fn(this.prefs); } catch {}
    }
  }

  #normalize(p) {
    const validPresets = Object.keys(PRESET_DEFINITIONS);
    const validLayouts = ['comfortable', 'compact', 'bubble'];
    const validDensities = ['compact', 'default', 'spacious'];
    const validFontSizes = ['small', 'normal', 'large'];
    const validBackgrounds = ['solid', 'translucent', 'glass', 'transparent', 'match-world'];
    const validTimestamps = ['always', 'hover', 'hidden'];
    const validWidths = ['narrow', 'default', 'wide'];

    return {
      preset: validPresets.includes(p?.preset) ? p.preset : DEFAULT_CHAT_PREFERENCES.preset,
      layout: validLayouts.includes(p?.layout) ? p.layout : DEFAULT_CHAT_PREFERENCES.layout,
      density: validDensities.includes(p?.density) ? p.density : DEFAULT_CHAT_PREFERENCES.density,
      fontSize: validFontSizes.includes(p?.fontSize) ? p.fontSize : DEFAULT_CHAT_PREFERENCES.fontSize,
      background: validBackgrounds.includes(p?.background) ? p.background : DEFAULT_CHAT_PREFERENCES.background,
      timestamps: validTimestamps.includes(p?.timestamps) ? p.timestamps : DEFAULT_CHAT_PREFERENCES.timestamps,
      showAvatars: typeof p?.showAvatars === 'boolean' ? p.showAvatars : DEFAULT_CHAT_PREFERENCES.showAvatars,
      groupConsecutive: typeof p?.groupConsecutive === 'boolean' ? p.groupConsecutive : DEFAULT_CHAT_PREFERENCES.groupConsecutive,
      panelWidth: validWidths.includes(p?.panelWidth) ? p.panelWidth : DEFAULT_CHAT_PREFERENCES.panelWidth,
    };
  }

  /**
   * Applies CSS variables and layout classes to the specified element (defaults to #chat-panel).
   */
  applyToElement(el) {
    if (!el) return;
    const p = this.prefs;
    const preset = PRESET_DEFINITIONS[p.preset] || PRESET_DEFINITIONS.afterlight;

    // Determine token values
    let tokens = { ...preset.tokens };
    if (p.background === 'match-world' && this.activeWorld && WORLD_THEME_TOKENS[this.activeWorld]) {
      const worldTok = WORLD_THEME_TOKENS[this.activeWorld];
      tokens = { ...tokens, ...worldTok };
    }

    if (p.background === 'solid') {
      tokens.backdropFilter = 'none';
      tokens.surface = '#142323';
    } else if (p.background === 'transparent') {
      tokens.backdropFilter = 'none';
      tokens.surface = 'rgba(16, 28, 28, 0.35)';
    }

    // Set CSS variables
    const s = el.style;
    const setProp = (k, v) => {
      if (typeof s?.setProperty === 'function') s.setProperty(k, v);
      else if (s) s[k] = v;
    };
    setProp('--chat-accent', tokens.accent);
    setProp('--chat-border', tokens.border);
    setProp('--chat-surface', tokens.surface);
    setProp('--chat-text', tokens.text);
    setProp('--chat-muted', tokens.textMuted);
    setProp('--chat-bubble-bg', tokens.bubbleBg);
    setProp('--chat-bubble-self-bg', tokens.bubbleSelfBg);
    setProp('--chat-mention-bg', tokens.mentionBg);
    setProp('--chat-backdrop-filter', tokens.backdropFilter);
    setProp('--chat-font-family', preset.fontFamily);

    // Density and font size metrics
    if (p.fontSize === 'small') setProp('--chat-font-size', '11.5px');
    else if (p.fontSize === 'large') setProp('--chat-font-size', '14.5px');
    else setProp('--chat-font-size', '13px');

    if (p.density === 'compact') {
      setProp('--chat-line-gap', '2px');
      setProp('--chat-pad-y', '2px');
      setProp('--chat-pad-x', '6px');
    } else if (p.density === 'spacious') {
      setProp('--chat-line-gap', '8px');
      setProp('--chat-pad-y', '6px');
      setProp('--chat-pad-x', '10px');
    } else {
      setProp('--chat-line-gap', '4px');
      setProp('--chat-pad-y', '4px');
      setProp('--chat-pad-x', '8px');
    }

    // Panel width classes
    el.classList.remove('chat-width-narrow', 'chat-width-default', 'chat-width-wide');
    el.classList.add(`chat-width-${p.panelWidth}`);

    // Mode classes
    el.classList.remove('layout-comfortable', 'layout-compact', 'layout-bubble');
    el.classList.add(`layout-${p.layout}`);

    el.classList.remove('density-compact', 'density-default', 'density-spacious');
    el.classList.add(`density-${p.density}`);

    el.classList.remove('font-small', 'font-normal', 'font-large');
    el.classList.add(`font-${p.fontSize}`);

    el.classList.remove('timestamps-always', 'timestamps-hover', 'timestamps-hidden');
    el.classList.add(`timestamps-${p.timestamps}`);

    el.classList.toggle('hide-avatars', !p.showAvatars);
  }
}
