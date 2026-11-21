// Checks the label anchor heights shipped in public/data/places.json (`a`, written by build-label-tops.mjs) against
// modelTops() run on a freshly built scene: the browser used to run it at startup, the data build runs it now.
//
//   node scripts/check-label-tops.mjs              headless scene in node (seconds)
//   npm run build && node scripts/check-label-tops.mjs --browser [--port n] [--save file.json]
//                                                  the real app in headless Chrome: modelTops on the live scene,
//                                                  plus the anchors the labels actually use
//
// A place fails when the shipped top and the recomputed one differ by more than TOL (the shipped value is rounded to
// whole decimetres, so up to 5 cm is rounding), or when one of them has a model top and the other has none.
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import path from 'node:path';
import net from 'node:net';
import * as THREE from 'three';
import { modelTops } from './lib/label-tops.mjs';

const TOL = 0.06, CLEAR = 3; // CLEAR as in src/ui/labels.js
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const index = JSON.parse(fs.readFileSync(new URL('../public/data/places.json', import.meta.url)));

async function inNode() {
  const { buildAppScene } = await import('./build-label-tops.mjs');
  const { scene, data, groundY } = await buildAppScene();
  const tops = modelTops(scene, data.places, THREE);
  return { places: data.places.map((p, i) => ({ id: p.id, top: tops[i], g: groundY(p.x / 10, p.z / 10) })), anchors: null };
}

async function inBrowser() {
  const free = (p) => new Promise((r) => { const s = net.createServer().once('error', () => r(false)).once('listening', () => s.close(() => r(true))).listen(p, '127.0.0.1'); });
  let port = +opt('port', 5300 + Math.floor(Math.random() * 600));
  for (let i = 0; i < 200 && !((await free(port)) && (await free(port + 1000))); i++) port = 5300 + Math.floor(Math.random() * 1600);
  const cdp = port + 1000, kids = [];
  const stop = () => { for (const k of kids) { try { process.kill(-k.pid, 'SIGKILL'); } catch { try { k.kill('SIGKILL'); } catch { /* gone */ } } } };
  const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  kids.push(spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], { stdio: 'ignore', detached: true }));
  kids.push(spawn(CHROME, ['--headless=new', `--remote-debugging-port=${cdp}`, `--user-data-dir=${path.join(process.env.TMPDIR || '/tmp', `hue-tops-${port}`)}`,
    '--window-size=1400,900', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', 'about:blank'], { stdio: 'ignore', detached: true }));
  try {
    const retry = async (f) => { for (let i = 0; i < 60; i++) { try { return await f(); } catch { await sleep(500); } } throw new Error('timed out'); };
    await retry(async () => { if (!(await fetch(`http://localhost:${port}/`)).ok) throw 0; });
    const tabs = await retry(async () => (await fetch(`http://127.0.0.1:${cdp}/json`)).json());
    const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl);
    await new Promise((r) => ws.addEventListener('open', r, { once: true }));
    let seq = 0; const wait = new Map();
    ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); } });
    const send = (method, params = {}) => new Promise((r) => { const i = ++seq; wait.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
    const evaluate = async (expr) => {
      const m = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      if (m.result?.exceptionDetails) throw new Error(m.result.exceptionDetails.exception?.description || 'eval failed');
      return m.result?.result?.value;
    };
    await send('Runtime.enable');
    await send('Page.navigate', { url: `http://localhost:${port}/` });
    for (let i = 0; ; i++) { if (await evaluate('!!window.__hue')) break; if (i > 360) throw new Error('scene never became ready'); await sleep(500); }
    // the same function, run on the live scene: time it too, since that is what startup no longer pays
    return await evaluate(`(() => {
      const H = window.__hue, modelTops = ${modelTops.toString()};
      const t0 = performance.now(), tops = modelTops(H.scene, H.data.places, H.THREE), ms = performance.now() - t0;
      return { ms, places: H.data.places.map((p, i) => ({ id: p.id, top: Number.isFinite(tops[i]) ? tops[i] : null })),
        anchors: H.labels.anchors };
    })()`);
  } finally { stop(); }
}

const res = args.includes('--browser') ? await inBrowser() : await inNode();
if (opt('save')) fs.writeFileSync(opt('save'), JSON.stringify(res));
const shipped = new Map(index.places.map((p) => [p.id, p]));
const anchors = res.anchors ? new Map(res.anchors) : null;
let fails = 0, worst = 0, withTop = 0;
const rows = [];
for (const q of res.places) {
  const p = shipped.get(q.id);
  if (!p) { fails++; rows.push(`FAIL ${q.id}: not in places.json`); continue; }
  const top = q.top != null && Number.isFinite(q.top) ? q.top : null;
  const a = p.a != null ? p.a / 10 : null;
  // build-label-tops ships `a` only where the model stands at least 2 m over the ground, as labels.js required
  if (a == null && top != null && q.g != null && top > q.g + 2) { fails++; rows.push(`FAIL ${q.id}: model top ${top.toFixed(2)} but nothing shipped`); continue; }
  if (a != null) {
    withTop++;
    if (top == null) { fails++; rows.push(`FAIL ${q.id}: shipped ${a} but no model top`); continue; }
    const d = Math.abs(a - top); worst = Math.max(worst, d);
    if (d > TOL) { fails++; rows.push(`FAIL ${q.id}: shipped ${a.toFixed(2)}, model top ${top.toFixed(2)} (off ${d.toFixed(2)} m)`); }
    if (anchors && anchors.has(q.id) && Math.abs(anchors.get(q.id) - (top + CLEAR)) > TOL) {
      fails++; rows.push(`FAIL ${q.id}: label anchor ${anchors.get(q.id).toFixed(2)}, model top + ${CLEAR} = ${(top + CLEAR).toFixed(2)}`);
    }
  }
}
for (const id of ['kydai', 'ngomon', 'truongtien']) {
  const p = shipped.get(id), q = res.places.find((r) => r.id === id);
  if (p && q) console.log(`  ${id}: shipped ${p.a != null ? (p.a / 10).toFixed(2) : '-'}, recomputed ${q.top != null && Number.isFinite(q.top) ? q.top.toFixed(2) : '-'}${anchors?.has(id) ? `, anchor ${anchors.get(id).toFixed(2)}` : ''}`);
}
for (const r of rows) console.log('  ' + r);
console.log(`label tops (${args.includes('--browser') ? 'browser' : 'node'}): ${res.places.length} places, ${withTop} with a model top, worst difference ${worst.toFixed(3)} m${res.ms != null ? `, modelTops took ${res.ms.toFixed(0)} ms in the page` : ''}: ${fails ? fails + ' FAIL' : 'ok'}`);
process.exit(fails ? 1 : 0);
