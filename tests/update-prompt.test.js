/**
 * Tests for the stale-deployment update prompt (src/ui/updatePrompt.js).
 *
 * The pure helpers (module-load-error classification, entry-module
 * extraction) are exercised directly; the prompt flow is exercised through
 * injected fake window/dialog/storage/fetch — no browser, no source-string
 * matching against the game.
 *
 * The scenario under test is real: a redeploy erases the content-hashed
 * chunk a long-lived tab still references, the host serves the SPA fallback
 * as text/html, and the dynamic import dies with the browser's generic
 * "dynamically imported module" TypeError.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  UPDATE_PROMPT_STORAGE_KEY,
  createUpdatePrompt,
  extractEntryModuleSrc,
  isModuleLoadError,
} from '../src/ui/updatePrompt.js';

// --- classification ---------------------------------------------------------

test('isModuleLoadError recognizes every browser phrasing of a failed module fetch', () => {
  // Firefox (the error the production report showed):
  assert.equal(isModuleLoadError(new TypeError('error loading dynamically imported module: https://game.example/assets/controller-CXlUUOAj.js')), true);
  // Chrome/Edge:
  assert.equal(isModuleLoadError(new TypeError('Failed to fetch dynamically imported module: https://game.example/assets/controller-CXlUUOAj.js')), true);
  // Safari:
  assert.equal(isModuleLoadError(new TypeError('Importing a module script failed.')), true);
  // Vite preload helper (CSS dependencies):
  assert.equal(isModuleLoadError(new Error('Unable to preload CSS for ./kart-royale/controller.js')), true);
});

test('isModuleLoadError rejects module evaluation errors — those stay real bugs', () => {
  assert.equal(isModuleLoadError(new TypeError("Cannot read properties of undefined (reading 'createKartRoyaleController')")), false);
  assert.equal(isModuleLoadError(new ReferenceError('createScene is not defined')), false);
  assert.equal(isModuleLoadError('something exploded'), false);
  assert.equal(isModuleLoadError(null), false);
  assert.equal(isModuleLoadError(undefined), false);
});

// --- entry-module extraction -----------------------------------------------

test('extractEntryModuleSrc finds the module entry whatever the attribute order', () => {
  assert.equal(
    extractEntryModuleSrc('<script type="module" crossorigin src="/assets/index-CfwsFrlk.js"></script>'),
    '/assets/index-CfwsFrlk.js',
  );
  assert.equal(
    extractEntryModuleSrc('<script src="/assets/index-CfwsFrlk.js" type="module"></script>'),
    '/assets/index-CfwsFrlk.js',
  );
});

test('extractEntryModuleSrc ignores classic and inline module scripts', () => {
  const html = [
    '<script src="/vendor.js"></script>',
    '<script type="module">import "./local.js";</script>',
    '<script type="module" src="/assets/index-pe9-ofb-.js"></script>',
  ].join('');
  assert.equal(extractEntryModuleSrc(html), '/assets/index-pe9-ofb-.js');
  assert.equal(extractEntryModuleSrc('<script>console.log(1)</script>'), null);
  assert.equal(extractEntryModuleSrc('not html at all'), null);
});

// --- prompt flow -----------------------------------------------------------

function fakeElement() {
  const listeners = new Map();
  return {
    listeners,
    open: false,
    showModalCalls: 0,
    showModal() {
      this.open = true;
      this.showModalCalls += 1;
    },
    close() {
      this.open = false;
      this.emit('close');
    },
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    emit(type) {
      for (const fn of listeners.get(type) || []) fn();
    },
    click() {
      this.emit('click');
    },
  };
}

function fakeWindow({ runningSrc = '/assets/index-old.js', fetchImpl, reload = () => {} } = {}) {
  const events = new Map();
  const win = {
    location: { href: 'https://game.example/theater?room=theater', reload },
    document: {
      querySelector: (selector) =>
        selector === 'script[type="module"][src]'
          ? { getAttribute: () => runningSrc }
          : null,
    },
    addEventListener: (type, fn) => {
      if (!events.has(type)) events.set(type, []);
      events.get(type).push(fn);
    },
    removeEventListener: (type, fn) => {
      const list = events.get(type) || [];
      const i = list.indexOf(fn);
      if (i >= 0) list.splice(i, 1);
    },
    dispatch(type, payload) {
      for (const fn of events.get(type) || []) fn({ payload });
    },
    events,
  };
  win.fetch = (...args) => fetchImpl(...args);
  return win;
}

function htmlDocument(entrySrc) {
  return `<!doctype html><html><head><script type="module" crossorigin src="${entrySrc}"></script></head><body></body></html>`;
}

const okResponse = (text) => ({ ok: true, text: async () => text });

function makeHarness(overrides = {}) {
  const dialog = fakeElement();
  const reloadButton = fakeElement();
  const laterButton = fakeElement();
  const storage = new Map();
  const storageShim = {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, v),
  };
  const calls = { open: 0, close: 0, reload: 0, fetches: [] };
  const win = fakeWindow({
    runningSrc: overrides.runningSrc ?? '/assets/index-old.js',
    fetchImpl: overrides.fetchImpl ?? (async (url, init) => {
      calls.fetches.push({ url, init });
      return okResponse(htmlDocument(overrides.deployedSrc ?? '/assets/index-new.js'));
    }),
    reload: () => {
      calls.reload += 1;
    },
  });
  const prompt = createUpdatePrompt({
    dialog,
    reloadButton,
    laterButton,
    window: win,
    fetchImpl: (...args) => win.fetch(...args),
    storage: storageShim,
    onOpen: () => {
      calls.open += 1;
    },
    onClose: () => {
      calls.close += 1;
    },
  }).install();
  return { prompt, dialog, reloadButton, laterButton, storage, storageShim, calls, win };
}

const staleLoadError = () =>
  new TypeError('error loading dynamically imported module: https://game.example/assets/controller-CXlUUOAj.js');

test('a confirmed stale deployment opens the prompt once, pausing gameplay', async () => {
  const h = makeHarness();
  h.win.dispatch('vite:preloadError', staleLoadError());
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(h.dialog.showModalCalls, 1);
  assert.equal(h.calls.open, 1);
  assert.equal(h.calls.fetches.length, 1);
  assert.equal(h.calls.fetches[0].init.cache, 'no-store', 'the probe must bypass caches');
  // The prompted build is persisted so a future failure for this build —
  // even in a fresh factory over the same storage — never re-prompts.
  assert.equal(
    h.storage.get(UPDATE_PROMPT_STORAGE_KEY),
    'https://game.example/assets/index-old.js',
  );
  // A second failure for the same build never re-prompts.
  h.win.dispatch('vite:preloadError', staleLoadError());
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(h.dialog.showModalCalls, 1);
  assert.equal(h.calls.fetches.length, 1, 'the guarded build is not probed again');
});

test('a matching deployment (fresh session) never prompts', async () => {
  const h = makeHarness({ deployedSrc: '/assets/index-old.js' });
  await h.prompt.reportModuleLoadFailure(staleLoadError());
  assert.equal(h.dialog.showModalCalls, 0);
  assert.equal(h.calls.open, 0);
});

test('a failed probe never claims an update', async () => {
  const h = makeHarness({
    fetchImpl: async () => {
      throw new Error('offline');
    },
  });
  await h.prompt.reportModuleLoadFailure(staleLoadError());
  assert.equal(h.dialog.showModalCalls, 0);
});

test('a non-module error (evaluation bug) is not probed at all', async () => {
  const h = makeHarness();
  await h.prompt.reportModuleLoadFailure(new TypeError("Cannot read properties of undefined (reading 'dispose')"));
  assert.equal(h.calls.fetches.length, 0);
  assert.equal(h.dialog.showModalCalls, 0);
});

test('reload reloads; staying closes and hands the keyboard back once', async () => {
  const h = makeHarness();
  await h.prompt.reportModuleLoadFailure(staleLoadError());
  assert.equal(h.dialog.showModalCalls, 1);
  h.reloadButton.click();
  assert.equal(h.calls.reload, 1);
  h.laterButton.click();
  assert.equal(h.dialog.open, false);
  assert.equal(h.calls.close, 1);
  assert.equal(h.calls.reload, 1, 'staying never reloads');
});

test('dispose removes the listener', async () => {
  const h = makeHarness();
  h.prompt.dispose();
  h.win.dispatch('vite:preloadError', staleLoadError());
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(h.calls.fetches.length, 0);
});

test('entry sources are compared by resolved URL, not raw text', async () => {
  const h = makeHarness({
    runningSrc: 'https://game.example/assets/index-old.js',
    deployedSrc: '/assets/index-old.js',
  });
  await h.prompt.reportModuleLoadFailure(staleLoadError());
  // The document references the identical absolute URL via a relative path.
  assert.equal(h.dialog.showModalCalls, 0);
});

test('relative entry sources in the running page resolve against the location', async () => {
  const h = makeHarness({ runningSrc: '/assets/index-old.js' });
  await h.prompt.reportModuleLoadFailure(staleLoadError());
  assert.equal(h.dialog.showModalCalls, 1);
});
