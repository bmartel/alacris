// Headless Chrome check: overlays fit a small mobile viewport.
//
//   npm run test:chrome            (from ui/)
//   CHROME_PATH=/path/to/chrome npm run test:chrome
//
// happy-dom does no layout, so the unit suite can only check the CSS rules.
// This drives a real Chrome over the DevTools protocol (no dependencies:
// Node's built-in WebSocket) with an emulated mobile screen 505 px tall —
// the visible height of the Android tablet the bug was found on — and runs
// the checks in viewport.html: dialog/sheet actions, drawer footer, picker
// buttons, menus and snackbars must all be inside the visible area, with
// and without a (simulated) on-screen keyboard. Skips with exit code 0 when
// no Chrome is found, so it is safe to call from CI that lacks one.

import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const VIEWPORTS = [
  { name: 'tablet landscape, URL bar shown', width: 960, height: 505, deviceScaleFactor: 2 },
  { name: 'phone portrait', width: 360, height: 640, deviceScaleFactor: 3 },
  { name: 'phone landscape', width: 740, height: 340, deviceScaleFactor: 3 },
];

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  return candidates.find((p) => existsSync(p));
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
function serve() {
  const server = createServer(async (req, res) => {
    const p = decodeURIComponent(req.url.split('?')[0]);
    const file = join(repo, normalize(p).replace(/^(\.\.[/\\])+/, ''));
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r(server)));
}

async function devtoolsPort(profile, child) {
  const file = join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 200; i++) {
    if (child.exitCode !== null) throw new Error(`Chrome exited (${child.exitCode})`);
    if (existsSync(file)) {
      const [port] = readFileSync(file, 'utf8').split('\n');
      if (port) return Number(port);
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error('Chrome did not open a DevTools port');
}

function cdp(url) {
  const ws = new WebSocket(url);
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data);
    if (!msg.id) { api.onEvent?.(msg); return; }
    const p = pending.get(msg.id);
    if (!p) return;
    pending.delete(msg.id);
    if (msg.error) p.reject(new Error(msg.error.message));
    else p.resolve(msg.result);
  });
  const opened = new Promise((r, j) => {
    ws.addEventListener('open', r, { once: true });
    ws.addEventListener('error', j, { once: true });
  });
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const msgId = ++id;
    pending.set(msgId, { resolve, reject });
    ws.send(JSON.stringify({ id: msgId, method, params, sessionId }));
  });
  const api = { opened, send, close: () => ws.close(), onEvent: null };
  return api;
}

async function main() {
  const chrome = findChrome();
  if (!chrome) {
    console.log('# skip: no Chrome found (set CHROME_PATH)');
    return 0;
  }
  const server = await serve();
  const origin = `http://127.0.0.1:${server.address().port}`;
  const profile = mkdtempSync(join(tmpdir(), 'alacris-ui-chrome-'));
  const child = spawn(chrome, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank',
  ], { stdio: 'ignore' });

  let failed = 0;
  try {
    const port = await devtoolsPort(profile, child);
    const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
    const browser = cdp(version.webSocketDebuggerUrl);
    await browser.opened;
    console.log(`# ${version.Browser}`);

    for (const vp of VIEWPORTS) {
      const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' });
      const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
      const send = (m, p) => browser.send(m, p, sessionId);
      await send('Emulation.setDeviceMetricsOverride', {
        width: vp.width, height: vp.height, deviceScaleFactor: vp.deviceScaleFactor, mobile: true,
      });
      await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
      await send('Page.enable');
      await send('Runtime.enable');
      browser.onEvent = (m) => { if (m.method === 'Runtime.consoleAPICalled' && process.env.DEBUG) console.log('# console', m.params.args.map((a) => a.value).join(' ')); };
      await send('Page.navigate', { url: `${origin}/ui/test/chrome/viewport.html` });
      for (let i = 0; i < 200; i++) {
        const { result } = await send('Runtime.evaluate', { expression: 'window.ready === true', returnByValue: true });
        if (result.value) break;
        await new Promise((r) => setTimeout(r, 50));
      }
      const { result, exceptionDetails } = await send('Runtime.evaluate', {
        expression: 'window.runChecks()', awaitPromise: true, returnByValue: true, timeout: 60000,
      });
      if (exceptionDetails) throw new Error(exceptionDetails.exception?.description || exceptionDetails.text);
      const { viewport, results } = result.value;
      console.log(`# ${vp.name}: ${viewport.innerWidth}×${viewport.innerHeight}`);
      for (const r of results) {
        if (r.ok) console.log(`ok - ${r.name}`);
        else {
          failed++;
          console.log(`not ok - ${r.name} ${JSON.stringify(r.info)}`);
        }
      }
      await browser.send('Target.closeTarget', { targetId });
    }
    browser.close();
  } finally {
    child.kill();
    server.close();
    await new Promise((r) => setTimeout(r, 200));
    rmSync(profile, { recursive: true, force: true });
  }
  console.log(failed ? `# fail ${failed}` : '# pass');
  return failed ? 1 : 0;
}

main().then((code) => process.exit(code), (e) => {
  console.error(e);
  process.exit(1);
});
