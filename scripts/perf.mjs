// Load-time and memory measurement of a built site, for before/after numbers on performance work.
//
//   npm run build && node scripts/perf.mjs [--build dir] [--runs 3] [--net fast|4g] [--viewport 1400x900] [--json out.json]
//
// Serves the build through a small gzip static server (like GitHub Pages), opens it in headless Chrome (GPU) with a
// fresh profile per run, and reports per run: the page's performance marks (search-ready, geometry-loaded,
// first-frame, tiles-loaded), bytes transferred, JS heap used after the tiles are in (after a forced GC), the bytes of
// geometry arrays still held in JS, draw calls, and the resident memory of the Chrome renderer and GPU processes.
// --net 4g throttles to 9 Mbit/s down, 40 ms latency.
import { spawn, execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { setTimeout as sleep } from 'node:timers/promises';
import path from 'node:path';
import net from 'node:net';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const build = path.resolve(opt('build', 'dist'));
const runs = +opt('runs', 3);
const netMode = opt('net', 'fast');
const [vw, vh] = opt('viewport', '1400x900').split('x').map(Number);
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const free = (p) => new Promise((r) => { const s = net.createServer().once('error', () => r(false)).once('listening', () => s.close(() => r(true))).listen(p, '127.0.0.1'); });
let port = 6300 + Math.floor(Math.random() * 600);
while (!((await free(port)) && (await free(port + 1000)))) port++;
const cdpPort = port + 1000;

// static server with gzip for text types (GitHub Pages compresses json/js/css/html)
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.bin': 'application/octet-stream' };
const gzCache = new Map();
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(build, p);
  if (!f.startsWith(build) || !existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end(); return; }
  const ext = path.extname(f), type = TYPES[ext] || 'application/octet-stream';
  const zip = /text|json|javascript|svg/.test(type) && /gzip/.test(req.headers['accept-encoding'] || '');
  let body = readFileSync(f);
  if (zip) { if (!gzCache.has(f)) gzCache.set(f, gzipSync(body)); body = gzCache.get(f); }
  res.writeHead(200, { 'content-type': type, 'content-length': body.length, 'cache-control': 'no-store', ...(zip ? { 'content-encoding': 'gzip' } : {}) });
  res.end(body);
}).listen(port, '127.0.0.1');

const rssOf = (profile) => {
  // resident memory (MB) of Chrome processes started with this profile, by process type
  const out = { renderer: 0, gpu: 0, other: 0 };
  for (const line of execSync('ps -axo rss=,command=', { maxBuffer: 1 << 26 }).toString().split('\n')) {
    if (!line.includes(profile)) continue;
    const kb = +line.trim().split(/\s+/)[0];
    const kind = /--type=renderer/.test(line) ? 'renderer' : /--type=gpu-process/.test(line) ? 'gpu' : 'other';
    out[kind] += kb / 1024;
  }
  for (const k in out) out[k] = Math.round(out[k]);
  return out;
};

async function oneRun(i) {
  const profile = path.join(process.env.TMPDIR || '/tmp', `hue-perf-${port}-${i}`);
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${profile}`, `--window-size=${vw},${vh}`,
    '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--js-flags=--expose-gc', '--enable-precise-memory-info', 'about:blank'], { stdio: 'ignore', detached: true });
  try {
    let tabs;
    for (let k = 0; k < 60; k++) { try { tabs = await (await fetch(`http://127.0.0.1:${cdpPort}/json`)).json(); break; } catch { await sleep(300); } }
    const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl);
    await new Promise((r) => ws.addEventListener('open', r, { once: true }));
    let seq = 0; const wait = new Map(); let bytes = 0; const errors = [];
    ws.addEventListener('message', (e) => {
      const m = JSON.parse(e.data);
      if (m.id && wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); }
      if (m.method === 'Network.loadingFinished') bytes += m.params.encodedDataLength;
      if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails?.exception?.description);
    });
    const send = (method, params = {}) => new Promise((r) => { const id = ++seq; wait.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
    const evaluate = async (expression) => {
      const m = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (m.result?.exceptionDetails) throw new Error(m.result.exceptionDetails.exception?.description || 'eval failed');
      return m.result?.result?.value;
    };
    await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
    await send('Network.setCacheDisabled', { cacheDisabled: true });
    if (netMode === '4g') await send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: 9e6 / 8, uploadThroughput: 3e6 / 8 });
    await send('Emulation.setDeviceMetricsOverride', { width: vw, height: vh, deviceScaleFactor: 1, mobile: false });
    const t0 = Date.now();
    await send('Page.navigate', { url: `http://localhost:${port}/` });
    for (let k = 0; ; k++) { if (await evaluate('!!window.__hue')) break; if (k > 600) throw new Error('scene never ready'); await sleep(100); }
    await evaluate('window.__hue.tiles');
    const wall = Date.now() - t0;
    await sleep(1500); // let a few frames run (heroes in reach load, shadows settle)
    const peakRss = rssOf(profile);
    const r = await evaluate(`(async () => {
      const H = window.__hue, marks = {};
      for (const m of performance.getEntriesByType('mark')) if (m.name.startsWith('hue:')) marks[m.name.slice(4)] = Math.round(m.startTime);
      gc(); await new Promise((r) => setTimeout(r, 300)); gc();
      let geo = 0; const seen = new Set();
      H.scene.traverse((o) => {
        const g = o.geometry; if (g && !seen.has(g)) { seen.add(g);
          for (const a of Object.values(g.attributes)) geo += a.array ? a.array.byteLength : 0;
          if (g.index?.array) geo += g.index.array.byteLength; }
      });
      const info = H.renderer.info;
      return { marks, heapMB: Math.round(performance.memory.usedJSHeapSize / 1048576), geoMB: Math.round(geo / 1048576),
        geometries: info.memory.geometries, textures: info.memory.textures, calls: info.render.calls, tris: info.render.triangles };
    })()`);
    const rss = rssOf(profile);
    ws.close();
    return { run: i, wallMs: wall, transferMB: +(bytes / 1048576).toFixed(1), ...r, rssMB: rss, peakRssMB: peakRss, errors: errors.slice(0, 3) };
  } finally {
    try { process.kill(-chrome.pid, 'SIGKILL'); } catch { chrome.kill('SIGKILL'); }
    await sleep(500);
    try { execSync(`rm -rf "${profile}"`); } catch { /* fine */ }
  }
}

const results = [];
try {
  for (let i = 0; i < runs; i++) { const r = await oneRun(i); results.push(r); console.log(JSON.stringify(r)); }
} finally { server.close(); }
const med = (k, f = (r) => r[k]) => { const v = results.map(f).sort((a, b) => a - b); return v[v.length >> 1]; };
const summary = {
  build: path.relative(process.cwd(), build) || '.', net: netMode, viewport: `${vw}x${vh}`, runs,
  firstFrameMs: med('ff', (r) => r.marks['first-frame']), tilesLoadedMs: med('tl', (r) => r.marks['tiles-loaded']),
  transferMB: med('transferMB'), heapMB: med('heapMB'), geoMB: med('geoMB'), calls: med('calls'),
  rendererRssMB: med('rr', (r) => r.rssMB.renderer), gpuRssMB: med('gr', (r) => r.rssMB.gpu),
};
console.log('median', JSON.stringify(summary));
const jsonOut = opt('json', null);
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ summary, results }, null, 2) + '\n');
