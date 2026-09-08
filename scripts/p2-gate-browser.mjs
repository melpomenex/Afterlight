/**
 * P2 gate browser harness (task 3.11).
 *
 * Drives up to three Chromium sessions through chromedriver's WebDriver HTTP
 * API: P1 (player one), P2 (player two) and OBS (observer). Keyboard input is
 * synthetic KeyboardEvents dispatched on document.body (bubbles to the game's
 * window handlers); chat and the Records dialog are driven through the DOM.
 *
 * LEAK POLICY (learned the hard way): every session id goes into LIVE and is
 * closed in `finally`, on SIGINT/SIGTERM, and on process exit. A crashed run
 * must never leave a browser behind.
 *
 * Usage: node scripts/p2-gate-browser.mjs <phase> [args]
 * Phases: boot | solo <sporefall|signal-lost|rain-runner> | pong
 *
 * Dev-only tool: never imported by the app or the test suites.
 */

const DRIVER = 'http://127.0.0.1:9515';
const APP = 'http://127.0.0.1:4174/?room=theater';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log('[gate]', ...a);

const LIVE = new Set();
let closing = false;

async function closeAll() {
  if (closing) return;
  closing = true;
  for (const id of [...LIVE]) {
    try {
      await fetch(`${DRIVER}/session/${id}`, { method: 'DELETE' });
    } catch {}
    LIVE.delete(id);
  }
  closing = false;
}

for (const sig of ['SIGINT', 'SIGTERM', 'uncaughtException', 'unhandledRejection']) {
  process.on(sig, async (err) => {
    if (err) console.error('[gate] fatal:', err?.message || err);
    await closeAll();
    process.exit(1);
  });
}
process.on('exit', () => {
  // Synchronous best-effort: chromedriver ends the browser on socket close.
  for (const id of LIVE) {
    try {
      require('node:child_process').execSync(
        `curl -s -X DELETE ${DRIVER}/session/${id} -o /dev/null`,
        { timeout: 3000 },
      );
    } catch {}
  }
});

async function req(method, path, body = null, allowFail = false) {
  const res = await fetch(`${DRIVER}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : null,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status >= 400 && !allowFail) {
    throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
  }
  return data.value;
}

async function newSession(name, { webgpu = true } = {}) {
  const res = await fetch(`${DRIVER}/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      capabilities: {
        browserName: 'chrome',
        'goog:chromeOptions': {
          args: [
            '--headless=new',
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--use-gl=angle',
            '--use-angle=swiftshader',
            '--window-size=800,600',
            '--mute-audio',
            ...(webgpu ? [] : ['--disable-webgpu']),
          ],
          binary: '/usr/bin/chromium-browser',
        },
      },
    }),
  });
  const data = await res.json();
  const id = data.value?.sessionId ?? data.sessionId;
  if (!id) throw new Error(`session ${name}: ${JSON.stringify(data).slice(0, 200)}`);
  LIVE.add(id);
  log(`session ${name} = ${id} (live: ${LIVE.size})`);
  return { name, id };
}

async function js(s, script) {
  return req('POST', `/session/${s.id}/execute/sync`, { script, args: [] });
}

async function go(s, url = APP) {
  await req('POST', `/session/${s.id}/url`, { url });
}

// Synthetic key on document.body so e.target.closest() stays valid; bubbles
// to the window handlers exactly like a real press.
const KEYDOWN = (code, key) => `
  document.body.dispatchEvent(new KeyboardEvent('keydown', { code: ${JSON.stringify(code)}, key: ${JSON.stringify(key ?? code.slice(3).toLowerCase())}, bubbles: true, cancelable: true })); return true;`;
const KEYUP = (code, key) => `
  document.body.dispatchEvent(new KeyboardEvent('keyup', { code: ${JSON.stringify(code)}, key: ${JSON.stringify(key ?? code.slice(3).toLowerCase())}, bubbles: true })); return true;`;

const keyDown = (s, code, key) => js(s, KEYDOWN(code, key));
const keyUp = (s, code, key) => js(s, KEYUP(code, key));

async function tap(s, code, holdMs = 60) {
  await keyDown(s, code);
  await sleep(holdMs);
  await keyUp(s, code);
}

const readAction = (s) => js(s, `return document.getElementById('action-title')?.textContent + ' || ' + (document.getElementById('action-sub')?.textContent || '');`);
const readToast = (s) => js(s, `return { t: document.getElementById('toast-title')?.textContent, b: document.getElementById('toast-body')?.textContent, k: document.getElementById('toast-type')?.textContent };`);
const chatText = (s) => js(s, `return document.getElementById('chat-log')?.innerText.slice(-400);`);

async function chatSend(s, text) {
  await js(s, `
    const input = document.getElementById('chat-input');
    const form = document.getElementById('chat-form');
    if (!input || !form) return false;
    input.focus();
    input.value = ${JSON.stringify(text)};
    form.requestSubmit();
    return true;`);
}

// Walk while a predicate on the client is false. Returns the last action text.
async function walkUntilNear(s, code, want, timeoutMs = 45000) {
  const start = Date.now();
  let action = '';
  await keyDown(s, code);
  try {
    while (Date.now() - start < timeoutMs) {
      action = await readAction(s);
      if (action.startsWith('undefined')) { await waitWorld(s); continue; }
      if (action.includes(want)) return { ok: true, action };
      await sleep(700);
    }
    return { ok: false, action };
  } finally {
    await keyUp(s, code).catch(() => {});
  }
}

// Wait until the world is booted and stable (survives Vite full reloads).
async function waitWorld(s, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const ok = await js(s, `return !!document.querySelector('canvas') && !!document.getElementById('action-title') && !document.getElementById('loading');`);
      if (ok) return true;
    } catch {}
    await sleep(1500);
  }
  return false;
}

// Two-stage walk on camera mode 1 (pure axes): east to the arcade wall,
// then north along the cabinet line until `want` appears in the prompt.
async function walkToCabinet(s, want, timeoutMs = 240000) {
  await waitWorld(s);
  await tap(s, 'KeyC'); // cycle iso mode 0 -> 1 (WASD become pure axes)
  await sleep(500);
  const stage1 = await walkUntilNear(s, 'KeyD', want, timeoutMs / 2);
  if (stage1.ok) return stage1;
  const stage2 = await walkUntilNear(s, 'KeyW', want, timeoutMs / 2);
  return stage2;
}

async function shot(s, file) {
  const b64 = await req('GET', `/session/${s.id}/screenshot`);
  const { writeFileSync } = await import('node:fs');
  writeFileSync(`/tmp/opencode/p2/${file}.png`, Buffer.from(b64, 'base64'));
  return `/tmp/opencode/p2/${file}.png`;
}

const consoleErrors = (s) => req('GET', `/session/${s.id}/se/log/console`, null, true).catch(() => []);
const fatalErrors = (entries) =>
  (Array.isArray(entries) ? entries : (entries?.value ?? []))
    .filter((e) => e.level === 'SEVERE')
    .map((e) => e.message)
    .filter((m) => !/net::ERR|favicon|fonts\.gstatic|googleapis|ExtensionService|GroupMarkerNotSet/.test(m));

// Verify the Records dialog for a game and return its rows as text.
async function recordsFor(s, game) {
  await js(s, `document.getElementById('btn-records')?.click(); return true;`);
  await sleep(400);
  const okTab = await js(s, `
    const tabs = [...document.querySelectorAll('.leaderboard-tab')];
    const tab = tabs.find(t => t.textContent.toLowerCase().includes(${JSON.stringify(game)}));
    if (tab) { tab.click(); return true; } return false;`);
  await sleep(1800);
  const rows = await js(s, `return [...document.querySelectorAll('#leaderboard-rows .leaderboard-row, #leaderboard-rows .leaderboard-empty, #leaderboard-rows .leaderboard-note')].map(r => r.innerText.replace(/\\n/g, ' · '));`);
  const page = await js(s, `return document.getElementById('leaderboard-page')?.textContent;`);
  await js(s, `document.getElementById('close-leaderboard')?.click(); return true;`);
  await sleep(300);
  return { okTab, rows, page };
}

// --- phases ---

async function boot() {
  const p1 = await newSession('p1');
  const p2 = await newSession('p2');
  const obs = await newSession('obs');
  try {
    for (const s of [p1, p2, obs]) await go(s);
    await sleep(11000);

    const out = [];
    for (const [name, s] of [['p1', p1], ['p2', p2], ['obs', obs]]) {
      out.push({
        name,
        canvas: await js(s, `return !!document.querySelector('canvas');`),
        hud: await js(s, `return document.body.dataset.hudContext || 'none';`),
        title: await js(s, `return document.title;`),
        action: await readAction(s),
        fatal: fatalErrors(await consoleErrors(s)),
      });
    }

    await chatSend(p1, 'p2-gate: three clients in the Orpheum');
    await sleep(2500);
    const chatLog = await chatText(p2);
    const seen = { p2: chatLog.includes('p2-gate: three clients'), obs: (await chatText(obs)).includes('p2-gate: three clients') };

    console.log(JSON.stringify({ sessions: out, chatSeen: seen }, null, 2));
  } finally {
    await closeAll();
  }
}

// Play a single-player arcade cabinet to a terminal state with an observer.
async function playSolo(game, label) {
  const p1 = await newSession('p1');
  const obs = await newSession('obs');
  try {
    await go(p1);
    await go(obs);
    await sleep(11000);

    const result = { game: label, walked: null, joined: null, played: null, recorded: null, observer: null };

    result.walked = await walkToCabinet(p1, label);
    log('walked:', JSON.stringify(result.walked));

    await tap(p1, 'KeyE');
    await sleep(3000);
    result.joined = { action: await readAction(p1), toast: await readToast(p1) };
    log('joined:', JSON.stringify(result.joined));

    result.observerWalk = await walkToCabinet(obs, label).catch((e) => ({ ok: false, error: String(e) }));

    const deadline = Date.now() + 180000;
    if (game === 'sporefall') {
      while (Date.now() < deadline) {
        await keyDown(p1, 'Space');
        await sleep(140);
        await keyUp(p1, 'Space');
        await sleep(260);
        const action = await readAction(p1);
        if (!action.includes('stop playing')) break;
      }
    } else if (game === 'signal-lost') {
      await keyDown(p1, 'KeyW');
      while (Date.now() < deadline) {
        await keyDown(p1, 'Space');
        await sleep(120);
        await keyUp(p1, 'Space');
        await sleep(180);
        const action = await readAction(p1);
        if (!action.includes('stop playing')) break;
      }
      await keyUp(p1, 'KeyW').catch(() => {});
    } else if (game === 'rain-runner') {
      await keyDown(p1, 'KeyW');
      while (Date.now() < deadline) {
        const action = await readAction(p1);
        if (!action.includes('stop playing')) break;
        await sleep(700);
      }
      await keyUp(p1, 'KeyW').catch(() => {});
    }

    result.played = { finalAction: await readAction(p1), toast: await readToast(p1) };
    await sleep(4000);

    result.recorded = await recordsFor(p1, label.split(' ')[0].toLowerCase());
    result.observer = { action: await readAction(obs) };
    await shot(p1, `${game}-end-p1`).catch(() => {});
    await shot(obs, `${game}-end-obs`).catch(() => {});

    console.log(JSON.stringify(result, null, 2));
  } finally {
    await closeAll();
  }
}

async function pong() {
  const p1 = await newSession('p1');
  const p2 = await newSession('p2');
  const obs = await newSession('obs');
  try {
    for (const s of [p1, p2, obs]) await go(s);
    await sleep(11000);

    const w1 = await walkToCabinet(p1, 'Pong');
    const w2 = await walkToCabinet(p2, 'Pong');
    const w3 = await walkToCabinet(obs, 'Pong').catch((e) => ({ ok: false, error: String(e) }));
    log('walks:', JSON.stringify({ p1: w1.ok, p2: w2.ok, obs: w3.ok }));

    await tap(p1, 'KeyE');
    await tap(p2, 'KeyE');
    await sleep(3000);
    const joined = { p1: await readAction(p1), p2: await readAction(p2) };

    const deadline = Date.now() + 300000;
    let ended = false;
    while (Date.now() < deadline) {
      await keyDown(p1, 'KeyW'); await sleep(420); await keyUp(p1, 'KeyW');
      await keyDown(p2, 'KeyS'); await sleep(420); await keyUp(p2, 'KeyS');
      await sleep(1200);
      const a1 = await readAction(p1);
      if (!a1.includes('stop playing')) { ended = true; break; }
    }

    const final = { p1: await readAction(p1), p2: await readAction(p2), toast1: await readToast(p1) };
    await sleep(4000);
    const boards = { p1: await recordsFor(p1, 'records'), obs: await recordsFor(obs, 'records') };
    await shot(p1, 'pong-end-p1').catch(() => {});
    await shot(obs, 'pong-end-obs').catch(() => {});

    console.log(JSON.stringify({ joined, ended, final, boards }, null, 2));
  } finally {
    await closeAll();
  }
}

const phase = process.argv[2];
const arg = process.argv[3];
const { mkdirSync } = await import('node:fs');
mkdirSync('/tmp/opencode/p2', { recursive: true });

if (phase === 'boot') await boot();
else if (phase === 'solo') await playSolo(arg ?? 'sporefall', arg === 'signal-lost' ? 'Signal Lost' : arg === 'rain-runner' ? 'Rain Runner' : 'Sporefall');
else if (phase === 'pong') await pong();
else {
  console.log('phases: boot | solo <sporefall|signal-lost|rain-runner> | pong');
  process.exit(1);
}
