// Checks the bundled data (public/data/hue.json) for the terrain and height mistakes that have bitten before:
// the Hà Khê plateau, the Minh Mạng mound, the Khải Định hillside, raised lakes, impossible building heights.
// Run: npm run check:data  [--against old-hue.json]  (with --against it also reports where the terrain and the
// building heights changed, by the nearest landmark, so a rebuild that moves a hill is noticed).
// scripts/build-data.mjs runs the same checks on every build, against the file it is replacing.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const unflat = (r) => { const o = []; for (let i = 0; i + 1 < r.length; i += 2) o.push([r[i] / 10, r[i + 1] / 10]); return o; };
const inside = ([x, z], poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// the terrain grid as the client reads it (src/geo/terrain.js): heights above the city floor, in metres
function grid(data) {
  const t = data.terrain;
  const T = { x0: t.x0 / 10, z0: t.z0 / 10, step: t.step, nx: t.nx, nz: t.nz, h: Float32Array.from(t.h, (v) => v / 10) };
  T.rise = (x, z) => {
    const gx = (x - T.x0) / T.step, gz = (z - T.z0) / T.step;
    if (gx < 0 || gz < 0 || gx >= T.nx - 1 || gz >= T.nz - 1) return 0;
    const i = Math.floor(gx), j = Math.floor(gz), fx = gx - i, fz = gz - j, k = j * T.nx + i, h = T.h;
    const h00 = h[k], h10 = h[k + 1], h01 = h[k + T.nx], h11 = h[k + T.nx + 1];
    return fx > fz ? h00 + (h10 - h00) * fx + (h11 - h10) * fz : h00 + (h11 - h01) * fx + (h01 - h00) * fz;
  };
  T.node = (k) => [T.x0 + (k % T.nx) * T.step, T.z0 + Math.floor(k / T.nx) * T.step];
  // grid nodes inside a polygon
  T.nodesIn = (poly) => {
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const [x, z] of poly) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    const out = [];
    for (let j = Math.max(0, Math.ceil((z0 - T.z0) / T.step)); j <= Math.min(T.nz - 1, Math.floor((z1 - T.z0) / T.step)); j++)
      for (let i = Math.max(0, Math.ceil((x0 - T.x0) / T.step)); i <= Math.min(T.nx - 1, Math.floor((x1 - T.x0) / T.step)); i++) {
        const k = j * T.nx + i;
        if (inside(T.node(k), poly)) out.push(k);
      }
    return out;
  };
  return T;
}
const siteItem = (data, site, name) => { const it = data.sites?.[site]?.items.find((i) => norm(i.n) === norm(name)); return it ? unflat(it.ring) : null; };
const place = (data, id) => { const p = data.places.find((q) => q.id === id); return p ? [p.x / 10, p.z / 10] : null; };

export function checkData(data) {
  const fails = [], notes = [];
  const check = (ok, what, detail) => { (ok ? notes : fails).push(`${ok ? 'ok  ' : 'FAIL'} ${what}: ${detail}`); };
  const T = grid(data);

  // the grid itself
  {
    const n = T.nx * T.nz;
    let bad = 0, max = 0;
    for (const v of T.h) { if (!Number.isFinite(v) || v < 0) bad++; else max = Math.max(max, v); }
    check(T.h.length === n && data.terrain.cover.length === n, 'terrain grid size', `${T.h.length} heights for ${T.nx} × ${T.nz}`);
    check(bad === 0 && max < 500, 'terrain values', `${bad} negative or missing, highest ${max.toFixed(1)} m (the western hills reach about 330)`);
  }
  // the grid reaches every tree and every building: outside it the ground reads as the flat city floor, so anything
  // planted just past an edge stood at 2.6 m beside hills that the grid's last row lifts (trees sunk 160 m once)
  {
    const x1 = T.x0 + T.step * (T.nx - 1), z1 = T.z0 + T.step * (T.nz - 1);
    const inside = (x, z) => x >= T.x0 && x < x1 && z >= T.z0 && z < z1;
    let out = 0, n = 0, eg = '';
    const take = (x, z) => { n++; if (!inside(x, z)) { out++; eg ||= ` (first at ${x.toFixed(0)}, ${z.toFixed(0)})`; } };
    const tr = data.trees || [];
    for (let i = 0; i + 1 < tr.length; i += 4) take(tr[i] / 10, tr[i + 1] / 10);
    check(out === 0, 'terrain grid covers the trees', `${out} of ${n} outside x ${T.x0.toFixed(0)}…${x1.toFixed(0)}, z ${T.z0.toFixed(0)}…${z1.toFixed(0)}${eg}`);
  }
  // Hà Khê: chùa Thiên Mụ stands on one level about 9.8 m above the city floor (laser points 12.0–13.6 m asl)
  {
    // the plateau is the most common level within 100 m of the pagoda's label point (which sits near the river edge)
    const p = place(data, 'thienmu'), circle = p ? Array.from({ length: 16 }, (_, i) => [p[0] + 100 * Math.cos((i * Math.PI) / 8), p[1] + 100 * Math.sin((i * Math.PI) / 8)]) : [];
    const count = new Map();
    for (const k of T.nodesIn(circle)) if (T.h[k] > 0) { const v = Math.round(T.h[k] * 2) / 2; count.set(v, (count.get(v) || 0) + 1); }
    const [r, n] = [...count].sort((a, b) => b[1] - a[1])[0] || [NaN, 0];
    check(r >= 8.8 && r <= 10.8, 'Hà Khê plateau under chùa Thiên Mụ', `${r.toFixed(1)} m at ${n} nodes (expected 9.8 ±1)`);
  }
  // Minh Mạng: the Bửu Thành mound must rise well above its 3.5 m wall, and Minh Lâu stands higher than Sùng Ân
  {
    const bt = siteItem(data, 'minhmang', 'Bửu Thành');
    if (!bt) check(false, 'Minh Mạng Bửu Thành', 'outline not found');
    else {
      const top = Math.max(...T.nodesIn(bt).map((k) => T.h[k])), rim = Math.min(...bt.map(([x, z]) => T.rise(x, z)));
      check(top - rim >= 3.5, 'Minh Mạng mound above the Bửu Thành wall', `top ${top.toFixed(1)} m, wall foot ${rim.toFixed(1)} m: ${(top - rim).toFixed(1)} m (wall 3.5 m)`);
    }
    const at = (n) => { const r = siteItem(data, 'minhmang', n); if (!r) return NaN; const c = r.reduce((a, q) => [a[0] + q[0] / r.length, a[1] + q[1] / r.length], [0, 0]); return T.rise(c[0], c[1]); };
    const ml = at('Minh Lâu'), sa = at('Điện Sùng Ân'), dhm = at('Đại Hồng Môn');
    check(dhm <= sa && sa <= ml, 'Minh Mạng axis climbs', `Đại Hồng Môn ${dhm.toFixed(1)} ≤ Sùng Ân ${sa.toFixed(1)} ≤ Minh Lâu ${ml.toFixed(1)} m`);
  }
  // Khải Định: Cung Thiên Định stands 20–30 m above the foot of the great stair (127 steps)
  {
    const pal = siteItem(data, 'khaidinh', 'Cung Thiên Định'), c = data.sites?.khaidinh?.c;
    if (!pal || !c) check(false, 'Khải Định hillside', 'outline not found');
    else {
      const top = Math.max(...pal.map(([x, z]) => T.rise(x, z)));
      const foot = Math.min(...data.sites.khaidinh.items.filter((i) => i.k === 'h').flatMap((i) => unflat(i.ring)).map(([x, z]) => T.rise(x, z)));
      check(top - foot >= 15 && top - foot <= 40, 'Khải Định rise to Cung Thiên Định', `${(top - foot).toFixed(1)} m above the lowest corner of the tomb outline (expected about 20–25)`);
    }
  }
  // raised lakes lie flat at their own level, and the ground round them is not dragged down to it
  {
    let worst = 0, which = -1, lakes = 0;
    (data.ponds || []).forEach((ring, i) => {
      const lv = ((data.pondLv && data.pondLv[i]) || 0) / 10;
      if (lv <= 0) return;
      lakes++;
      for (const k of T.nodesIn(unflat(ring))) { const d = Math.abs(T.h[k] - lv); if (d > worst) { worst = d; which = i; } }
    });
    check(worst <= 0.5, 'raised lakes are flat', `${lakes} lakes, worst node ${worst.toFixed(2)} m off its lake level${which >= 0 ? ` (pond ${which})` : ''}`);
  }
  // building heights: present, positive, and none taller than Vincom (160 m) by much
  {
    let bad = 0, tall = 0;
    for (const b of data.bld) { const h = b[1] / 10; if (!Number.isFinite(h) || h <= 0) bad++; else if (h > 180) tall++; }
    check(bad === 0 && tall === 0, 'building heights', `${data.bld.length} buildings, ${bad} missing or zero, ${tall} over 180 m`);
  }
  // làng nghề (#14): every craft village is a place, and the model reaches far enough north to stand Sình on real ground
  {
    const ids = ['thuyxuan', 'phuongduc', 'sinh'];
    const missing = ids.filter((id) => !place(data, id));
    const s = place(data, 'sinh');
    const [minX, minZ, maxX] = data.meta.bounds.map((v) => v / 10);
    const inside = s && s[1] > minZ + 150 && s[0] > minX + 150 && s[0] < maxX - 150;
    check(!missing.length && inside, 'craft villages', missing.length ? `missing ${missing.join(', ')}` : `Sình at z ${s[1].toFixed(0)} m, model's north edge at ${minZ.toFixed(0)} m`);
  }
  return { fails, notes };
}

// where the terrain and building heights moved between two builds, by the nearest named place
export function diffData(prev, data, { terrainStep = 2, buildingStep = 3 } = {}) {
  const lines = [];
  const named = [...data.places.map((p) => [p.n || p.id, p.x / 10, p.z / 10]), ...Object.entries(data.sites || {}).map(([k, s]) => [k, s.c[0] / 10, s.c[1] / 10])];
  const nearest = (x, z) => { let best = '?', bd = Infinity; for (const [n, px, pz] of named) { const d = Math.hypot(px - x, pz - z); if (d < bd) { bd = d; best = n; } } return [best, bd]; };
  const A = grid(prev), B = grid(data);
  const same = A.nx === B.nx && A.nz === B.nz && A.x0 === B.x0 && A.z0 === B.z0 && A.step === B.step;
  if (!same) lines.push(`terrain grid changed shape (${A.nx}×${A.nz} → ${B.nx}×${B.nz}); compared by position`);
  const groups = new Map();
  for (let k = 0; k < B.h.length; k++) {
    const [x, z] = B.node(k), d = B.h[k] - (same ? A.h[k] : A.rise(x, z));
    if (Math.abs(d) < terrainStep) continue;
    const [n, dist] = nearest(x, z), key = dist < 600 ? n : 'open country';
    const g = groups.get(key) || { n: 0, up: -Infinity, down: Infinity };
    g.n++; g.up = Math.max(g.up, d); g.down = Math.min(g.down, d);
    groups.set(key, g);
  }
  if (groups.size) {
    lines.push(`terrain moved more than ${terrainStep} m at ${[...groups.values()].reduce((a, g) => a + g.n, 0)} nodes (25 m apart):`);
    for (const [n, g] of [...groups].sort((a, b) => b[1].n - a[1].n).slice(0, 15)) lines.push(`  near ${n}: ${g.n} nodes, ${g.down >= 0 ? '+' : ''}${g.down.toFixed(1)} to ${g.up >= 0 ? '+' : ''}${g.up.toFixed(1)} m`);
  } else lines.push(`terrain: no node moved more than ${terrainStep} m`);
  // named buildings whose height changed
  const old = new Map();
  for (const b of prev.bld) if (b[3]) old.set(b[3] + '@' + Math.round(b[0][0] / 100) + ',' + Math.round(b[0][1] / 100), b[1] / 10);
  const moved = [];
  for (const b of data.bld) { if (!b[3]) continue; const h0 = old.get(b[3] + '@' + Math.round(b[0][0] / 100) + ',' + Math.round(b[0][1] / 100)); if (h0 != null && Math.abs(b[1] / 10 - h0) >= buildingStep) moved.push(`  ${b[3]}: ${h0} → ${b[1] / 10} m`); }
  lines.push(moved.length ? `${moved.length} named buildings changed height by ${buildingStep} m or more:` : `named buildings: none changed height by ${buildingStep} m or more`, ...moved.slice(0, 20));
  if (prev.bld.length !== data.bld.length) lines.push(`building count ${prev.bld.length} → ${data.bld.length}`);
  return lines;
}

// command line
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const file = process.argv.find((a, i) => i > 1 && !a.startsWith('--') && process.argv[i - 1] !== '--against') || 'public/data/hue.json';
  const data = JSON.parse(fs.readFileSync(file));
  const { fails, notes } = checkData(data);
  for (const l of [...notes, ...fails]) console.log(l);
  const ai = process.argv.indexOf('--against');
  if (ai > 0) for (const l of diffData(JSON.parse(fs.readFileSync(process.argv[ai + 1])), data)) console.log(l);
  console.log(`check:data — ${notes.length}/${notes.length + fails.length} checks passed`);
  process.exit(fails.length ? 1 : 0);
}
