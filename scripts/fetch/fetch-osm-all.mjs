// Fast concurrent Overpass + OSM detail fetcher for all Huế extracts (npm run data:fetch).
// Uses Overpass QL global [bbox:...] headers (1 spatial scan instead of 27 per query), gzip/br HTTP compression,
// keep-alive connections, and parallel workers distributed across independent public Overpass mirrors with zero
// artificial sleep between independent servers. Atomic .part writes preserve old extracts on any error.
//
// Usage:
//   node scripts/fetch/fetch-osm-all.mjs                  # refresh all 17 extracts (--force)
//   node scripts/fetch/fetch-osm-all.mjs --only south     # refresh south1..6 (add --force to overwrite existing)
//   node scripts/fetch/fetch-osm-all.mjs --only north     # refresh north1..4
//   node scripts/fetch/fetch-osm-all.mjs --only east      # refresh east1..3
import fs from 'node:fs';

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const PER_ENDPOINT_CONCURRENCY = 2; // polite per-mirror concurrency (6 total across 3 independent mirrors)
const UA = 'hue-city-explorer/1.2';

const PAVED_CLAUSES = [
  'way[place=square];',
  'relation[place=square];',
  'way["area:highway"];',
  'way[amenity=parking];',
  'way[amenity=bus_station];',
  'node[amenity=bus_station];',
].join('');

const FULL_CLAUSES = PAVED_CLAUSES + [
  'way[building];relation[building];',
  'way[highway];way[railway];',
  'way[natural=water];relation[natural=water];way[waterway];relation[waterway];',
  "way[barrier~'city_wall|wall'];",
  'way[historic];relation[historic];node[historic];',
  "way[leisure~'park|garden|pitch|stadium'];relation[leisure~'park|garden|pitch|stadium'];",
  'way[landuse];relation[landuse];',
  "way[natural~'wood|scrub|grassland|sand|wetland'];relation[natural~'wood|scrub|grassland|sand|wetland'];",
  "way[amenity~'marketplace|place_of_worship|university|school|hospital'];node[amenity~'marketplace|place_of_worship'];",
  "way[bridge];way[man_made~'bridge|pier|tower'];node[man_made=tower];",
  'node[place];',
  "node[tourism~'attraction|museum'];way[tourism~'attraction|museum'];",
].join('');

function buildOverpassQuery(bbox, kind = 'full', timeoutSec = 120) {
  const body = kind === 'paved' ? PAVED_CLAUSES : FULL_CLAUSES;
  return `[out:json][timeout:${timeoutSec}][bbox:${bbox}];(${body});out body geom;`;
}

function validateOverpassText(text, label) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(`${label}: invalid JSON (${String(err.message).slice(0, 80)})`);
  }
  if (parsed.remark) {
    throw new Error(`${label}: Overpass remark (partial result): ${String(parsed.remark).slice(0, 180)}`);
  }
  if (!Array.isArray(parsed.elements) || parsed.elements.length === 0) {
    throw new Error(`${label}: empty or missing elements array`);
  }
  return parsed;
}

function writeAtomic(outPath, content) {
  fs.mkdirSync('data/raw', { recursive: true });
  const tmp = `${outPath}.part.${process.pid}.${Math.random().toString(36).slice(2, 8)}`;
  fs.writeFileSync(tmp, content);
  fs.renameSync(tmp, outPath);
}

// Per-endpoint semaphore so each mirror handles at most PER_ENDPOINT_CONCURRENCY in-flight queries at once.
const activePerEndpoint = ENDPOINTS.map(() => 0);
const waiters = [];

function acquireEndpoint(excludeSet) {
  return new Promise((resolve) => {
    const tryPick = () => {
      let bestIdx = -1;
      let bestLoad = Infinity;
      for (let i = 0; i < ENDPOINTS.length; i++) {
        if (excludeSet.has(i)) continue;
        if (activePerEndpoint[i] < PER_ENDPOINT_CONCURRENCY && activePerEndpoint[i] < bestLoad) {
          bestLoad = activePerEndpoint[i];
          bestIdx = i;
        }
      }
      if (bestIdx >= 0) {
        activePerEndpoint[bestIdx]++;
        resolve(bestIdx);
        return true;
      }
      return false;
    };
    if (!tryPick()) waiters.push(tryPick);
  });
}

function releaseEndpoint(idx) {
  activePerEndpoint[idx]--;
  for (let i = 0; i < waiters.length; i++) {
    if (waiters[i]()) {
      waiters.splice(i, 1);
      break;
    }
  }
}

async function fetchOneOverpass({ name, out, bbox, kind = 'full', timeout = 120 }) {
  const query = buildOverpassQuery(bbox, kind, timeout);
  const body = new URLSearchParams({ data: query }).toString();
  const tried = new Set();
  let lastErr = null;

  while (tried.size < ENDPOINTS.length) {
    const epIdx = await acquireEndpoint(tried);
    tried.add(epIdx);
    const ep = ENDPOINTS[epIdx];
    const t0 = performance.now();
    try {
      const res = await fetch(ep, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Accept-Encoding': 'gzip, deflate, br',
          'User-Agent': UA,
        },
        body,
        signal: AbortSignal.timeout((timeout + 45) * 1000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const parsed = validateOverpassText(text, name);
      writeAtomic(out, text);
      const sec = ((performance.now() - t0) / 1000).toFixed(1);
      const host = new URL(ep).hostname;
      console.log(`  ok  ${name.padEnd(8)} ${String(parsed.elements.length).padStart(6)} els  ${(Buffer.byteLength(text) / 1024).toFixed(0).padStart(5)} KB  ${sec}s (${host})`);
      return true;
    } catch (err) {
      lastErr = err;
      console.warn(`  retry ${name} (${new URL(ep).hostname}: ${err.message})`);
    } finally {
      releaseEndpoint(epIdx);
    }
  }
  console.error(`  FAIL ${name}: ${lastErr ? lastErr.message : 'all endpoints failed'} (${out} kept as-is)`);
  return false;
}

async function fetchOsmDetail(name, bbox) {
  const out = `data/raw/hue-osm-${name}.json`;
  const t0 = performance.now();
  try {
    const res = await fetch(`https://api.openstreetmap.org/api/0.6/map.json?bbox=${bbox}`, {
      headers: { 'User-Agent': UA, 'Accept-Encoding': 'gzip, deflate, br' },
      signal: AbortSignal.timeout(120000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    const { elements } = body;
    if (!Array.isArray(elements) || !elements.length) throw new Error('no elements in OSM API response');
    const nodes = new Map(elements.filter((e) => e.type === 'node').map((e) => [e.id, e]));
    const wantWay = (t) => /^(bleachers|swimming_pool)$/.test(t.leisure || '') || t.place === 'square';
    const wantNode = (t) => t.tourism === 'artwork' || t['abandoned:leisure'] || t.barrier === 'entrance';
    const picked = [];
    for (const e of elements) {
      const t = e.tags;
      if (!t) continue;
      if (e.type === 'way' && wantWay(t)) {
        picked.push({
          type: 'way',
          id: e.id,
          tags: t,
          geometry: e.nodes.map((n) => nodes.get(n)).filter(Boolean).map((n) => ({ lat: n.lat, lon: n.lon })),
        });
      } else if (e.type === 'node' && wantNode(t)) {
        picked.push({ type: 'node', id: e.id, lat: e.lat, lon: e.lon, tags: t });
      }
    }
    if (!picked.length) throw new Error('none of the wanted detail elements found');
    const stamp = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
    const jsonText = JSON.stringify({ version: 0.6, osm3s: { timestamp_osm_base: stamp }, elements: picked });
    writeAtomic(out, jsonText);
    console.log(`  ok  ${name.padEnd(8)} ${String(picked.length).padStart(6)} els  ${(Buffer.byteLength(jsonText) / 1024).toFixed(0).padStart(5)} KB  ${((performance.now() - t0) / 1000).toFixed(1)}s (api.openstreetmap.org)`);
    return true;
  } catch (err) {
    console.error(`  FAIL ${name}: ${err.message} (${out} kept as-is)`);
    return false;
  }
}

function buildJobList(only) {
  const southLats = ['16.4245,16.4455', '16.4035,16.4245', '16.3820,16.4035'];
  const northLats = ['16.4965,16.5130', '16.5130,16.5300'];
  const lons = ['107.5385,107.5760', '107.5760,107.6130'];
  const eastLats = ['16.3820,16.4455', '16.4455,16.4965', '16.4965,16.5300'];

  const south = [];
  let si = 0;
  for (const lat of southLats) {
    const [s, n] = lat.split(',');
    for (const lon of lons) {
      const [w, e] = lon.split(',');
      si++;
      south.push({ name: `south${si}`, out: `data/raw/hue-osm-south${si}.json`, bbox: `${s},${w},${n},${e}`, timeout: 120 });
    }
  }
  const north = [];
  let ni = 0;
  for (const lat of northLats) {
    const [s, n] = lat.split(',');
    for (const lon of lons) {
      const [w, e] = lon.split(',');
      ni++;
      north.push({ name: `north${ni}`, out: `data/raw/hue-osm-north${ni}.json`, bbox: `${s},${w},${n},${e}`, timeout: 120 });
    }
  }
  const east = eastLats.map((lat, idx) => {
    const [s, n] = lat.split(',');
    return { name: `east${idx + 1}`, out: `data/raw/hue-osm-east${idx + 1}.json`, bbox: `${s},107.6130,${n},107.6200`, timeout: 120 };
  });

  if (only === 'south') return { overpass: south, detail: [] };
  if (only === 'north') return { overpass: north, detail: [] };
  if (only === 'east') return { overpass: east, detail: [] };

  return {
    // Heaviest central extract starts first so its latency overlaps with all peripheral strips
    overpass: [
      { name: 'main', out: 'data/raw/hue-osm.json', bbox: '16.4455,107.5520,16.4965,107.6130', timeout: 180 },
      { name: 'west', out: 'data/raw/hue-osm-west.json', bbox: '16.4455,107.5385,16.4965,107.5520', timeout: 120 },
      ...south,
      ...north,
      ...east,
      { name: 'paved', out: 'data/raw/hue-osm-paved.json', bbox: '16.3820,107.5385,16.5300,107.6200', kind: 'paved', timeout: 120 },
    ],
    detail: [
      { name: 'thuytien', bbox: '107.5712,16.4048,107.5815,16.4145' },
    ],
  };
}

const args = process.argv.slice(2);
const onlyIdx = args.indexOf('--only');
const only = onlyIdx >= 0 ? args[onlyIdx + 1] : null;
const force = !only || args.includes('--force');

const { overpass, detail } = buildJobList(only);
const startMs = performance.now();
const failed = [];

await Promise.all([
  ...overpass.map(async (job) => {
    if (!force && fs.existsSync(job.out) && fs.statSync(job.out).size > 0) {
      console.log(`  skip ${job.name} (already on disk)`);
      return;
    }
    const ok = await fetchOneOverpass(job);
    if (!ok && job.name === 'south6') {
      // Fallback for the south-east Khải Định piece if all mirrors time out on the full tile
      const [okA, okB] = await Promise.all([
        fetchOneOverpass({ name: 'south6a', out: 'data/raw/hue-osm-south6a.json', bbox: '16.3820,107.5760,16.4035,107.5945', timeout: 120 }),
        fetchOneOverpass({ name: 'south6b', out: 'data/raw/hue-osm-south6b.json', bbox: '16.3820,107.5945,16.4035,107.6130', timeout: 120 }),
      ]);
      if (!okA || !okB) failed.push('south6');
      return;
    }
    if (!ok) failed.push(job.name);
  }),
  ...detail.map(async (d) => {
    const ok = await fetchOsmDetail(d.name, d.bbox);
    if (!ok) failed.push(d.name);
  }),
]);

const totalSec = ((performance.now() - startMs) / 1000).toFixed(1);
if (failed.length) {
  console.error(`FAILED: ${failed.join(' ')} (${totalSec}s; failed extracts kept their previous copy)`);
  process.exit(1);
}
console.log(`all extracts refreshed in ${totalSec}s`);
