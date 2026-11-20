// Headless screenshots of one place, for checking a model without the browser pane.
//
//   npm run build && node scripts/shot.mjs <placeId> [--out dir] [--port 5300] [--dist 160] [--time 1] [--look real|ink]
//
// Serves dist/ with `vite preview` on --port (pick a free one when several run at once), opens it in headless Chrome
// (SwiftShader WebGL, so it is slow: allow a minute or two), puts the camera on the place from four sides plus one
// from above, and writes PNGs to --out (default scratch/shots/<placeId>/). --time 0 morning, 1 afternoon, 2 evening.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import path from 'node:path';
import net from 'node:net';

const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith('--'));
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
if (!id) { console.error('usage: node scripts/shot.mjs <placeId> [--out dir] [--port n] [--dist m] [--time 0|1|2] [--look real|ink]'); process.exit(2); }
// Several agents shoot at once: a port another preview already holds would photograph *its* build, so take the
// asked port only if it and its CDP partner are free, else a random free pair.
const free = (p) => new Promise((r) => { const s = net.createServer().once('error', () => r(false)).once('listening', () => s.close(() => r(true))).listen(p, '127.0.0.1'); });
let port = +opt('port', 5300 + Math.floor(Math.random() * 600));
for (let i = 0; i < 200 && !((await free(port)) && (await free(port + 1000))); i++) port = 5300 + Math.floor(Math.random() * 1600);
const cdp = port + 1000;
const out = opt('out', path.join('scratch', 'shots', id.replace(/[^\w-]/g, '_')));
const dist = opt('dist', null);
const time = +opt('time', 1);
const look = opt('look', 'real');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
mkdirSync(out, { recursive: true });

const kids = [];
// each child leads its own process group, so killing the group also stops vite under npx and Chrome's helpers
const done = (code) => { for (const k of kids) { try { process.kill(-k.pid, 'SIGKILL'); } catch { try { k.kill('SIGKILL'); } catch { /* gone */ } } } process.exit(code); };
process.on('SIGINT', () => done(130));

const server = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], { stdio: 'ignore', detached: true });
kids.push(server);
const profile = path.join(process.env.TMPDIR || '/tmp', `hue-shot-${port}`);
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${cdp}`, `--user-data-dir=${profile}`, '--window-size=1400,900',
  ...(process.env.SHOT_GL === 'swiftshader' ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--use-angle=metal', '--enable-gpu']), '--ignore-gpu-blocklist', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
kids.push(chrome);

async function json(u) { for (let i = 0; i < 60; i++) { try { return await (await fetch(u)).json(); } catch { await sleep(500); } } throw new Error('no ' + u); }
async function up(u) { for (let i = 0; i < 60; i++) { try { if ((await fetch(u)).ok) return; } catch { /* not yet */ } await sleep(500); } throw new Error('server did not start on ' + u); }

try {
  const base = `http://localhost:${port}`;
  await up(base + '/');
  const tabs = await json(`http://127.0.0.1:${cdp}/json`);
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
  await send('Page.enable'); await send('Runtime.enable');
  const errors = [];
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails?.exception?.description); if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) errors.push(m.params.args.map((a) => a.value ?? a.description).join(' ')); });
  await send('Page.navigate', { url: `${base}/?look=${look}` });
  for (let i = 0; i < 360; i++) { if (await evaluate('!!window.__hue')) break; await sleep(500); if (i === 359) throw new Error('scene never became ready'); }
  const info = await evaluate(`(() => {
    const H = window.__hue, p = H.data.places.find((q) => q.id === ${JSON.stringify(id)});
    if (!p) return null;
    H.rig.cancelFly(); H.rig.controls.autoRotate = false; H.mood.setTime(${time});
    return { n: p.n, x: p.x / 10, z: p.z / 10, r: p.r || 0, h: p.h || 0 }; // place coordinates are stored in decimetres
  })()`);
  if (!info) throw new Error('no place with id ' + id);
  const D = dist ? +dist : Math.max(90, (info.r || 30) * 4, info.h * 4);
  const views = [['n', 0], ['e', 90], ['s', 180], ['w', 270], ['top', null]];
  for (const [name, bearing] of views) {
    const png = await evaluate(`(() => {
      const H = window.__hue, T = H.THREE, c = H.rig.camera, k = H.rig.controls;
      const hit = new T.Raycaster(new T.Vector3(${info.x}, 2000, ${info.z}), new T.Vector3(0, -1, 0)).intersectObject(H.world.group, true)[0];
      const gy = hit ? Math.min(hit.point.y, 200) : 0; // top of whatever stands there: ground or the model's roof
      const tgt = new T.Vector3(${info.x}, gy + ${Math.max(4, info.h * 0.35)}, ${info.z});
      const b = ${bearing === null ? 'null' : bearing};
      if (b === null) c.position.set(tgt.x + 1, tgt.y + ${D} * 1.3, tgt.z + ${D} * 0.35);
      else { const a = b * Math.PI / 180; c.position.set(tgt.x + Math.sin(a) * ${D}, tgt.y + ${D} * 0.42, tgt.z - Math.cos(a) * ${D}); }
      k.target.copy(tgt); k.update();
      for (let i = 0; i < 40; i++) H.step(0.05);
      return H.renderer.domElement.toDataURL('image/png'); // read in the same task as the last draw, before the buffer clears
    })()`);
    if (!png) throw new Error('no image from the canvas');
    writeFileSync(path.join(out, `${name}.png`), Buffer.from(png.split(',')[1], 'base64'));
  }
  console.log(`${info.n}: 5 views (n e s w top) at ${Math.round(D)} m → ${out} (port ${port})`);
  if (errors.length) console.log('page errors/warnings:\n  ' + errors.slice(0, 10).join('\n  '));
  done(0);
} catch (e) {
  console.error('shot failed:', e.message);
  done(1);
}
