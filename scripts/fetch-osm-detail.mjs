// Fine detail for one small area, straight from the OpenStreetMap API (the Overpass extracts only carry the broad
// classes). Writes an Overpass-shaped file that scripts/build-data.mjs merges like any other strip.
// Usage: node scripts/fetch-osm-detail.mjs thuytien 107.5712,16.4048,107.5815,16.4145
import fs from 'node:fs';
const [name, bbox] = process.argv.slice(2);
if (!name || !bbox) { console.error('usage: fetch-osm-detail.mjs <name> <west,south,east,north>'); process.exit(1); }
const res = await fetch(`https://api.openstreetmap.org/api/0.6/map.json?bbox=${bbox}`, { headers: { 'User-Agent': 'hue-city-explorer/1.0' } });
if (!res.ok) { console.error('OSM API', res.status); process.exit(1); }
const { elements } = await res.json();
const nodes = new Map(elements.filter((e) => e.type === 'node').map((e) => [e.id, e]));
const wantWay = (t) => /^(bleachers|swimming_pool)$/.test(t.leisure || '') || t.place === 'square';
const wantNode = (t) => t.tourism === 'artwork' || t['abandoned:leisure'] || t.barrier === 'entrance';
const out = [];
for (const e of elements) {
  const t = e.tags;
  if (!t) continue;
  if (e.type === 'way' && wantWay(t)) out.push({ type: 'way', id: e.id, tags: t, geometry: e.nodes.map((n) => nodes.get(n)).filter(Boolean).map((n) => ({ lat: n.lat, lon: n.lon })) });
  else if (e.type === 'node' && wantNode(t)) out.push({ type: 'node', id: e.id, lat: e.lat, lon: e.lon, tags: t });
}
fs.writeFileSync(`data/raw/hue-osm-${name}.json`, JSON.stringify({ version: 0.6, elements: out }));
console.log('wrote', out.length, 'elements to', `data/raw/hue-osm-${name}.json`);
