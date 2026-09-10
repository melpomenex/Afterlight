/**
 * Stale-deployment recovery for lazily imported modules.
 *
 * Afterlight ships content-hashed chunks (Vite) and is redeployed while
 * people keep long-lived tabs open in shared places. Every module that is
 * imported lazily after startup — the three arcade controllers, hls.js for
 * the theater, the realtime wire — is addressed by a hash that a new deploy
 * erases, and the host answers those URLs with the SPA fallback `index.html`
 * (`text/html`), so the import fails with the browser's generic "dynamically
 * imported module" TypeError and the cabinet silently does nothing.
 *
 * Vite's preload helper already turns those load failures into a cancelable
 * `vite:preloadError` event on window (the base import failure included), so
 * one listener installed at startup sees every lazy import in the game. The
 * listener never calls preventDefault(): the original rejection keeps
 * reaching the existing per-feature catch blocks. Instead it verifies that
 * the page really is stale — re-fetching the current document and comparing
 * the entry module it references against the one this session is running —
 * and only then asks the player to reload. A verified prompt is recorded per
 * build (session storage, tolerant of unavailable storage), so a declined
 * prompt never repeats for the same deployment and a reload can never loop:
 * after reloading, the running entry matches the deployed one again.
 *
 * Every environment touch (dialog elements, window, fetch, storage) is
 * injected, so headless tests drive this exact module with fakes.
 */

/** Session-storage key holding the entry build we already prompted for. */
export const UPDATE_PROMPT_STORAGE_KEY = 'afterlight-update-prompt-v1';

/** Upper bound for the staleness probe, so a hanging fetch never blocks. */
export const UPDATE_PROBE_TIMEOUT_MS = 4000;

// The three browser phrasings for "the network could not deliver this
// module". A module that loaded and then *threw* reads differently
// ("x is not a function", "Cannot read properties of …") and stays a real
// bug — those never open the prompt.
const MODULE_LOAD_ERROR_PATTERNS = [
  /dynamically imported module/i, // Chrome/Edge "Failed to fetch…", Firefox "error loading…"
  /importing a module script failed/i, // Safari
  /unable to preload css/i, // Vite preload helper, CSS dependencies
  /error loading module/i, // generic fallback phrasing
];

/**
 * True when the error looks like a module the network failed to deliver
 * (stale chunk, offline hiccup) rather than a module that evaluated and
 * threw. Deliberately a heuristic: the fetch-based staleness probe is the
 * real gate before any prompt appears.
 */
export function isModuleLoadError(error) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (!message) return false;
  return MODULE_LOAD_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

// Attribute matching that stays honest about attribute names: `type` and
// `src` must start an attribute (not trail `data-`), quoting may be double,
// single or none.
const TYPE_MODULE_ATTR = /(?:^|[\s"'/])type\s*=\s*(?:"module"|'module'|module\b)/i;
const SRC_ATTR = /(?:^|[\s"'/])src\s*=\s*["']?([^"'\s>]+)/i;

/**
 * Extract the entry module's `src` from a document's HTML: the first
 * `<script type="module" src=…>` tag, whatever the attribute order is.
 * Inline module scripts and classic scripts are ignored. Returns null when
 * the document references no module entry (nothing to compare against).
 */
export function extractEntryModuleSrc(html) {
  const tags = typeof html === 'string' ? html.match(/<script\b[^>]*>/gi) || [] : [];
  for (const tag of tags) {
    if (!TYPE_MODULE_ATTR.test(tag)) continue;
    const src = SRC_ATTR.exec(tag);
    if (src) return src[1];
  }
  return null;
}

/** Resolve a script src against the page URL; null when it cannot be parsed. */
function normalizeSrc(src, pageHref) {
  try {
    return new URL(src, pageHref).href;
  } catch {
    return null;
  }
}

const defaultStorage = () =>
  typeof sessionStorage !== 'undefined' ? sessionStorage : null;

/** Entry build already prompted for this session, or null. Never throws. */
function readPromptedBuild(storage = defaultStorage()) {
  try {
    return storage?.getItem(UPDATE_PROMPT_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

/** Record the prompted build. Returns false when storage is unavailable. */
function writePromptedBuild(entrySrc, storage = defaultStorage()) {
  try {
    storage?.setItem(UPDATE_PROMPT_STORAGE_KEY, entrySrc);
    return true;
  } catch {
    return false;
  }
}

/**
 * The stale-deployment prompt. `install()` attaches the `vite:preloadError`
 * listener; `reportModuleLoadFailure(error)` exists for call sites that catch
 * an import rejection themselves.
 *
 * onOpen/onClose are lifecycle hooks owned by main.js (pause gameplay, clear
 * held keys / hand them back), exactly like the Places selector and settings
 * dialogs.
 */
export function createUpdatePrompt({
  // Native <dialog> element (or a compatible fake in tests).
  dialog,
  // Buttons inside the dialog: reload now / keep this version for now.
  reloadButton,
  laterButton,
  // Environment: window (location, fetch default, event target).
  window = globalThis,
  // Injectable fetch for the staleness probe (tests); defaults to window.fetch.
  fetchImpl = null,
  // Injectable session storage (tests); defaults to the global, and a
  // missing/unwritable storage only makes the guard session-local.
  storage = defaultStorage(),
  // Lifecycle hooks owned by main.js.
  onOpen = null,
  onClose = null,
} = {}) {
  const boundFetch = fetchImpl || ((...args) => window.fetch(...args));
  // Storage can be unavailable; the guard still needs to hold for the
  // session, so a declined prompt is also remembered in memory.
  let promptedBuild = readPromptedBuild(storage);
  let checkInFlight = null;
  let wired = false;

  function runningEntrySrc() {
    try {
      const script = window.document.querySelector('script[type="module"][src]');
      const src = script?.getAttribute('src');
      return src ? normalizeSrc(src, window.location.href) : null;
    } catch {
      return null;
    }
  }

  /**
   * Re-fetch the current document (never a cache) and compare its entry
   * module against the one this session runs. True only on a confirmed
   * deployment mismatch — never on a network failure or unparseable page.
   */
  async function probeStaleDeployment() {
    const current = runningEntrySrc();
    if (!current) return false;
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeout = setTimeout(() => controller?.abort(), UPDATE_PROBE_TIMEOUT_MS);
    try {
      const response = await boundFetch(window.location.href, {
        cache: 'no-store',
        credentials: 'same-origin',
        signal: controller?.signal,
      });
      if (!response?.ok) return false;
      const html = await response.text();
      const deployed = extractEntryModuleSrc(html);
      if (!deployed) return false;
      const deployedHref = normalizeSrc(deployed, window.location.href);
      return Boolean(deployedHref) && deployedHref !== current;
    } catch {
      // Offline, blocked or aborted probe: never claim an update.
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  function prompt() {
    if (!dialog || typeof dialog.showModal !== 'function') return;
    if (!wired) {
      wired = true;
      // Reload picks up the new deployment; progress and the current place
      // are restored from the save.
      reloadButton?.addEventListener('click', () => {
        try {
          window.location.reload();
        } catch {
          /* a fake window in tests may not implement reload */
        }
      });
      // Later (and Escape, via the native cancel) keeps the session alive;
      // lazy features stay broken until the next reload, so the prompt is
      // not repeated for this build.
      laterButton?.addEventListener('click', () => dialog.close());
      dialog.addEventListener('close', () => {
        if (typeof dialog.open === 'boolean' && dialog.open) return;
        onClose?.();
      });
    }
    const build = runningEntrySrc();
    if (build) {
      promptedBuild = build;
      writePromptedBuild(build, storage);
    }
    onOpen?.();
    dialog.showModal();
  }

  /** Report an import failure; prompts only on a verified stale deployment. */
  function reportModuleLoadFailure(error) {
    if (error !== undefined && error !== null && !isModuleLoadError(error)) return;
    if (dialog?.open) return;
    const build = runningEntrySrc();
    if (!build || build === promptedBuild) return;
    if (!checkInFlight) {
      checkInFlight = probeStaleDeployment()
        .then((stale) => {
          if (stale) prompt();
        })
        .catch(() => {})
        .finally(() => {
          checkInFlight = null;
        });
    }
    return checkInFlight;
  }

  // Shared handler reference so dispose() removes exactly what install()
  // registered.
  const listener = (event) => reportModuleLoadFailure(event?.payload);

  /** Attach the global listener. Returns this prompt for chaining. */
  function install() {
    window.addEventListener?.('vite:preloadError', listener);
    return api;
  }

  /** Remove the listener (tests). */
  function dispose() {
    window.removeEventListener?.('vite:preloadError', listener);
  }

  const api = { install, dispose, reportModuleLoadFailure };
  return api;
}
