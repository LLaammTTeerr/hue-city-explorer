// Validate an Overpass (or OSM API) JSON response before it replaces a committed extract: it must parse, hold a
// non-empty "elements" array and carry no "remark" (Overpass reports a timeout or memory exhaustion that way, with
// HTTP 200 and a partial element list). Exit 1 otherwise.
// Usage: node scripts/check-overpass.mjs <file>
import fs from 'node:fs';
const f = process.argv[2];
let j;
try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { console.error(f + ': not JSON (' + e.message.slice(0, 80) + ')'); process.exit(1); }
if (j.remark) { console.error(f + ': Overpass remark, partial result: ' + String(j.remark).slice(0, 200)); process.exit(1); }
if (!Array.isArray(j.elements)) { console.error(f + ': no "elements" array'); process.exit(1); }
if (!j.elements.length) { console.error(f + ': no elements'); process.exit(1); }
console.log(f + ': ' + j.elements.length + ' elements' + (j.osm3s ? ', data as of ' + j.osm3s.timestamp_osm_base : ''));
