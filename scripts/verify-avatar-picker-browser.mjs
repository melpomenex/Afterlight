/**
 * Browser verification gate for Avatar Persona Picker UI.
 *
 * Verifies in real Chromium:
 * 1. Opens the Visitor Pass profile modal.
 * 2. Renders all 24 avatars in the grid.
 * 3. Category filtering (Humanoid, Heavy, Floating).
 * 4. Search filtering (by name/tag).
 * 5. Avatar card click to select, updating showcase banner and active card.
 * 6. Clean console with zero errors.
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';

const DRIVER_PORT = 9700 + Math.floor(Math.random() * 200);
const DRIVER = `http://127.0.0.1:${DRIVER_PORT}`;
const PREVIEW_PORT = 4174;
const APP_URL = `http://localhost:${PREVIEW_PORT}/?room=theater&debug=1`;

let driverProc = null;
let serverProc = null;
let sessionId = null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...args) => console.log('[avatar-picker-browser-gate]', ...args);

async function startServer() {
  log(`Starting preview server on port ${PREVIEW_PORT}...`);
  serverProc = spawn('npx', ['vite', 'preview', '--port', String(PREVIEW_PORT), '--strictPort'], {
    stdio: 'pipe',
  });
  serverProc.stderr.on('data', (d) => process.stderr.write(d));

  const t0 = Date.now();
  while (Date.now() - t0 < 15000) {
    try {
      const res = await fetch(`http://localhost:${PREVIEW_PORT}/`);
      if (res.ok) {
        log('Preview server is ready.');
        return;
      }
    } catch {}
    await sleep(250);
  }
  throw new Error('Vite preview server failed to start within 15s');
}

async function startDriver() {
  const binary = fs.existsSync('/usr/sbin/chromedriver') ? '/usr/sbin/chromedriver' : '/snap/bin/chromium.chromedriver';
  log(`Starting chromedriver (${binary}) on port ${DRIVER_PORT}...`);
  driverProc = spawn(binary, [`--port=${DRIVER_PORT}`, '--whitelisted-ips=127.0.0.1'], {
    stdio: 'ignore',
  });

  const t0 = Date.now();
  while (Date.now() - t0 < 10000) {
    try {
      const res = await fetch(`${DRIVER}/status`);
      if (res.ok) {
        log('Chromedriver is ready.');
        return;
      }
    } catch {}
    await sleep(200);
  }
  throw new Error('Chromedriver failed to start within 10s');
}

async function req(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${DRIVER}${path}`, opts);
  const json = await res.json();
  if (json.value && json.value.error) {
    throw new Error(`WebDriver error: ${json.value.error}: ${json.value.message}`);
  }
  return json.value;
}

async function executeScript(script, args = []) {
  return req('POST', `/session/${sessionId}/execute/sync`, {
    script,
    args,
  });
}

async function stopAll() {
  if (sessionId) {
    try {
      await req('DELETE', `/session/${sessionId}`);
    } catch {}
  }
  if (driverProc) driverProc.kill('SIGTERM');
  if (serverProc) serverProc.kill('SIGTERM');
}

async function runPickerBrowserGate() {
  try {
    await startServer();
    await startDriver();

    log('Creating browser session...');
    const sessionRes = await req('POST', '/session', {
      capabilities: {
        alwaysMatch: {
          browserName: 'chrome',
          'goog:chromeOptions': {
            args: [
              '--headless=new',
              '--no-sandbox',
              '--disable-dev-shm-usage',
              '--disable-gpu',
              '--window-size=1280,800',
              '--use-gl=angle',
              '--use-angle=swiftshader',
            ],
          },
        },
      },
    });
    sessionId = sessionRes.sessionId;
    log('Session created:', sessionId);

    log(`Navigating to ${APP_URL}...`);
    await req('POST', `/session/${sessionId}/url`, { url: APP_URL });
    await sleep(3000);

    // Step 1: Open profile modal by clicking EDIT on HUD
    log('Opening profile modal...');
    await executeScript(`
      const editBtn = document.getElementById('btn-edit-nick');
      if (editBtn) editBtn.click();
    `);
    await sleep(500);

    const isModalOpen = await executeScript(`
      const dialog = document.getElementById('profile-dialog');
      return dialog && dialog.open;
    `);
    log('Modal open state:', isModalOpen);
    if (!isModalOpen) throw new Error('Profile dialog did not open on btn-edit-nick click');

    // Step 2: Verify all 24 avatars rendered in grid
    const initialCardCount = await executeScript(`
      const grid = document.getElementById('avatar-picker-grid');
      return grid ? grid.querySelectorAll('.avatar-card').length : 0;
    `);
    log('Initial avatar cards rendered in grid:', initialCardCount);
    if (initialCardCount !== 24) {
      throw new Error(`Expected 24 avatar cards in grid, found ${initialCardCount}`);
    }

    // Step 3: Test category filter
    log('Testing category filter: floating...');
    await executeScript(`
      const floatingBtn = document.querySelector('[data-filter="floating"]');
      if (floatingBtn) floatingBtn.click();
    `);
    await sleep(200);

    const floatingCardCount = await executeScript(`
      const grid = document.getElementById('avatar-picker-grid');
      return grid ? grid.querySelectorAll('.avatar-card').length : 0;
    `);
    log('Floating avatar cards count:', floatingCardCount);
    if (floatingCardCount !== 2) {
      throw new Error(`Expected 2 floating avatars, got ${floatingCardCount}`);
    }

    // Reset filter to all
    log('Resetting category filter to all...');
    await executeScript(`
      const allBtn = document.querySelector('[data-filter="all"]');
      if (allBtn) allBtn.click();
    `);
    await sleep(200);

    // Step 4: Test search input
    log('Testing search input: "skeleton"...');
    await executeScript(`
      const search = document.getElementById('avatar-search-input');
      if (search) {
        search.value = 'skeleton';
        search.dispatchEvent(new Event('input'));
      }
    `);
    await sleep(200);

    const searchCount = await executeScript(`
      const grid = document.getElementById('avatar-picker-grid');
      return grid ? grid.querySelectorAll('.avatar-card').length : 0;
    `);
    log('Search result card count:', searchCount);
    if (searchCount !== 1) {
      throw new Error(`Expected 1 card for "skeleton", got ${searchCount}`);
    }

    // Clear search input
    log('Clearing search input...');
    await executeScript(`
      const search = document.getElementById('avatar-search-input');
      if (search) {
        search.value = '';
        search.dispatchEvent(new Event('input'));
      }
    `);
    await sleep(200);

    // Step 5: Click an avatar card to select it
    log('Selecting "neon-jellyfish" avatar card...');
    const selectResult = await executeScript(`
      const card = document.querySelector('[data-avatar-id="neon-jellyfish"]');
      if (!card) return { error: 'Card not found' };
      card.click();
      return {
        cardSelected: card.classList.contains('selected'),
        name: document.getElementById('profile-avatar-name')?.textContent,
        status: document.getElementById('profile-status-msg')?.textContent,
        thumb: document.getElementById('profile-active-thumb')?.src,
      };
    `);
    log('Select result:', selectResult);

    if (!selectResult.cardSelected) {
      throw new Error('Selected avatar card did not receive .selected class');
    }
    if (selectResult.name !== 'Neon Jellyfish') {
      throw new Error(`Expected active showcase name "Neon Jellyfish", got "${selectResult.name}"`);
    }
    if (!selectResult.status.includes('Neon Jellyfish')) {
      throw new Error(`Expected status to mention "Neon Jellyfish", got "${selectResult.status}"`);
    }

    // Step 6: Verify console logs
    log('Checking console error logs...');
    const logs = await req('POST', `/session/${sessionId}/se/log`, { type: 'browser' });
    const severeErrors = (logs || []).filter(
      (l) => l.level === 'SEVERE' && !l.message?.includes('favicon') && !l.message?.includes('WebSocket connection to')
    );
    if (severeErrors.length > 0) {
      log('Console severe errors found:', severeErrors);
      throw new Error(`Browser console reported ${severeErrors.length} severe error(s)`);
    }
    log('Clean console: 0 errors recorded.');

    log('ALL AVATAR PICKER BROWSER TESTS PASSED!');
    return true;
  } finally {
    await stopAll();
  }
}

runPickerBrowserGate().then(
  () => process.exit(0),
  (err) => {
    console.error('FAILED:', err);
    process.exit(1);
  }
);
