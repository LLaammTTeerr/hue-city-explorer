import { KIND, hex, shade } from '../../geo/buf.js';
import { LAND_Y, PAL } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { glowPoints } from '../../geo/materials.js';
import { fence, roadsNear, FENCE } from '../enclosure.js';
import { dinh } from '../props.js';

// Hiển Lâm Các, the three-storey timber pavilion on the axis of Thế Miếu in the south-west of the Imperial City
// (1821-22, Minh Mạng; restored 2001), the cross wall it stands in with the gate towers Tuấn Liệt môn and Sùng Công
// môn (bell and drum lofts over the gates), and before it, in Thế Miếu's court, the nine dynastic urns (Cửu Đỉnh,
// cast 1835-37). Sources and estimates: docs/places/hienlam.md.
//
// Hiển Lâm Các: about 300 m² on a brick-and-lime base paved with Bát Tràng brick, two flights of 9 Thanh-stone steps
// (front and back) with dragon cheeks and the king's way between; 24 columns, the 4 middle ones running the full
// height; storeys of 5, 3 and 1 bays under 12 roof slopes of yellow glazed tile; a gourd finial; 17 m high.
// The urns stand in one row facing Thế Miếu, Cao đỉnh (2.50 m) in the middle on the axis and set forward, the others
// (2.25-2.35 m, mouths about 1.37 m) four either side, each on stone; three legs and two upright loop handles.
//
// Frame: the mapped outline (OSM way 172657564, 23.6 x 13.6 m) centred at C; u along the facade toward Tuấn Liệt
// môn (north-east), v out of the back toward Miếu Môn (south-east), so Thế Miếu lies at -v. The cross wall (OSM
// 695810847-850) runs along the front face, v = -6.8.
export const id = 'hienlam';

const C = [-1259.15, 238.65];
const ANG = Math.atan2(-0.605, 0.796);
const UX = Math.cos(ANG), UZ = Math.sin(ANG);
const P = (u, v) => [C[0] + u * UX - v * UZ, C[1] + u * UZ + v * UX];

const ROOF = PAL.imperialRoof, RIDGE = hex('#f1d77a'), LAC = PAL.lacquer, GOLD = hex('#d9a93a');
const BASE = hex('#a99d86'), BRICK = hex('#9c7a64'), THANH = hex('#8e9396'), STONE = PAL.stone;
const WALL = hex('#b8945e'); // the imperial compound walls (FENCE.imperial)
const BRONZE = hex('#4c4d3f'), TABLET = hex('#2f6b4a');

const gy = (p) => LAND_Y + rise(p[0], p[1]);
function fbox(S, u, v, y0, y1, su, sv, col, opts) { const p = P(u, v); S.box(p[0], p[1], y0, y1, su, sv, ANG, col, opts); }
const eave = (over, extra = {}) => ({ flare: 0.5, over, fascia: 0.22, fasciaCol: shade(LAC, 0.7), ridgeCol: RIDGE, hips: true, glazed: true, segs: 3, ...extra });

// the cross wall in the frame: Hiển Lâm Các to the gates, the gates to the compound wall
const WALLS = [[[-11.84, -6.8], [-20.12, -6.82]], [[11.77, -6.81], [20.21, -6.68]], [[-33.78, -7.03], [-61.65, -7.36]], [[34.07, -6.57], [61.98, -6.45]]];
const GATES = [[27.1, -4.62, 13.9, 4.0], [-27.0, -4.95, 13.6, 3.9]]; // Tuấn Liệt, Sùng Công: centre u, v, length, depth
const AXIS = -0.44; // the mapped steps and Cao đỉnh's apron sit 0.4 m off the outline's middle

function pavilionBody(S, lamps) {
  const g = gy(C), F = g + 1.35;
  S.base = g - LAND_Y;
  // the base: brick and lime (sành-shard reliefs read as a pale render), Bát Tràng brick on top
  S.kind = KIND.MASONRY;
  fbox(S, 0, 0, g - 0.3, F - 0.14, 23.6, 13.6, BASE, { taper: 0.99, top: BRICK, topKind: KIND.ROAD });
  fbox(S, 0, 0, F - 0.14, F, 23.8, 13.8, shade(STONE, 1.02), { top: BRICK, topKind: KIND.ROAD });
  // two flights of 9 steps, front and back: steps either side of the carved king's way, dragon cheek walls
  for (const sg of [-1, 1]) {
    S.kind = KIND.MASONRY;
    for (let k = 1; k <= 8; k++) fbox(S, AXIS, sg * (6.8 + 0.27 * (k - 0.5)), g - 0.3, F - 0.15 * k, 4.4, 0.27, THANH, { topKind: KIND.ROAD });
    S.kind = KIND.PLAIN;
    const a = P(AXIS, sg * 6.7), b = P(AXIS, sg * 9.0);
    S.beam([a[0], F + 0.06, a[1]], [b[0], g + 0.1, b[1]], 1.3, 0.22, shade(THANH, 1.12));
    for (const s of [-1, 1]) {
      const c0 = P(AXIS + s * 2.4, sg * 6.7), c1 = P(AXIS + s * 2.4, sg * 9.1);
      S.beam([c0[0], F + 0.35, c0[1]], [c1[0], g + 0.25, c1[1]], 0.42, 0.5, shade(THANH, 0.92));
    }
  }

  // ground storey: 5 x 3 bays, the outer ring of 16 columns an open verandah round a closed core of 3 x 1 bays
  const us = [-10, -6.2, -2.3, 2.3, 6.2, 10], vs = [-5.1, -2.1, 2.1, 5.1];
  const H1 = 3.6, CW = 12.4, CD = 6.4;
  S.kind = KIND.TIMBER;
  fbox(S, 0, 0, F, F + H1, CW, CD, LAC, { top: shade(ROOF, 0.8) });
  S.kind = KIND.PLAIN;
  for (const sg of [-1, 1]) {
    // door leaves in the three bays, the arched đố bản over them gilt, and the name board over the middle door
    for (const u of [-4.25, 0, 4.25]) {
      fbox(S, u, sg * (CD / 2 + 0.04), F, F + 2.6, 3.2, 0.08, shade(LAC, 0.55));
      fbox(S, u, sg * (CD / 2 + 0.06), F + 2.6, F + 3.05, 3.4, 0.1, shade(GOLD, 0.85));
    }
    if (sg < 0) { fbox(S, 0, -CD / 2 - 0.12, F + 2.75, F + 3.35, 1.9, 0.08, TABLET); fbox(S, 0, -CD / 2 - 0.1, F + 2.68, F + 3.42, 2.1, 0.06, GOLD); }
  }
  for (const s of [-1, 1]) fbox(S, s * (CW / 2 + 0.04), 0, F + 0.4, F + 2.9, 0.08, 3.4, shade(LAC, 0.6));
  // the verandah ceiling and the outer columns on stone bases
  fbox(S, 0, 0, F + H1 - 0.28, F + H1, 20.0, 10.2, shade(LAC, 0.5), { top: shade(ROOF, 0.8), bottom: true });
  for (const u of us) for (const v of vs) {
    if (Math.abs(u) < 9 && Math.abs(v) < 4) continue;
    const q = P(u, v);
    S.cyl(q[0], q[1], F, F + 0.25, 0.42, 0.36, 6, shade(STONE, 0.95), { cap: false, rot: ANG });
    S.cyl(q[0], q[1], F + 0.25, F + H1 - 0.28, 0.22, 0.2, 6, LAC, { cap: false, rot: ANG });
  }
  // lower skirt roof: four slopes round the second storey
  S.hip(...P(0, 0), 20.0, 10.2, ANG, F + H1, 3.4, ROOF, eave(1.4));

  // second storey: 3 bays, shutters behind a gilt frieze
  const y2 = F + H1, H2 = 4.5, W2 = 12.4, D2 = 6.4;
  S.kind = KIND.TIMBER;
  fbox(S, 0, 0, y2, y2 + H2, W2, D2, LAC, { top: shade(ROOF, 0.8) });
  S.kind = KIND.PLAIN;
  for (const sg of [-1, 1]) {
    for (const u of [-4.2, 0, 4.2]) fbox(S, u, sg * (D2 / 2 + 0.04), y2 + 1.9, y2 + 3.7, 3.3, 0.08, shade(LAC, 0.6));
    fbox(S, 0, sg * (D2 / 2 + 0.06), y2 + 3.85, y2 + 4.25, W2, 0.1, shade(GOLD, 0.85));
    for (const u of [-6.2, -2.1, 2.1, 6.2]) fbox(S, u, sg * (D2 / 2 + 0.08), y2 + 1.4, y2 + H2, 0.32, 0.12, shade(LAC, 1.08));
  }
  for (const s of [-1, 1]) fbox(S, s * (W2 / 2 + 0.04), 0, y2 + 1.9, y2 + 3.7, 0.08, 4.4, shade(LAC, 0.6));
  S.hip(...P(0, 0), W2, D2, ANG, y2 + H2, 2.6, ROOF, eave(1.3));

  // third storey: one bay between the four great columns, then the crowning hip roof and a gilt gourd finial
  const y3 = y2 + H2, H3 = 3.2, W3 = 5.2, D3 = 4.6;
  S.kind = KIND.TIMBER;
  fbox(S, 0, 0, y3, y3 + H3, W3, D3, LAC, { top: shade(ROOF, 0.8) });
  S.kind = KIND.PLAIN;
  for (const sg of [-1, 1]) {
    fbox(S, 0, sg * (D3 / 2 + 0.04), y3 + 1.2, y3 + 2.7, 3.2, 0.08, shade(LAC, 0.6));
    fbox(S, 0, sg * (D3 / 2 + 0.06), y3 + 2.75, y3 + 3.05, W3, 0.1, shade(GOLD, 0.85));
  }
  S.hip(...P(0, 0), W3, D3, ANG, y3 + H3, 2.7, ROOF, eave(1.3));
  const top = y3 + H3 + 2.7, c = P(0, 0);
  S.cyl(c[0], c[1], top - 0.1, top + 0.25, 0.42, 0.32, 8, RIDGE);
  S.cyl(c[0], c[1], top + 0.25, top + 0.75, 0.42, 0.24, 8, RIDGE);
  S.cyl(c[0], c[1], top + 0.75, top + 1.25, 0.15, 0.04, 6, RIDGE);

  // night: lanterns under the three eaves
  for (const sg of [-1, 1]) for (const u of [-7.6, -2.3, 2.3, 7.6]) { const p = P(u, sg * 5.3); lamps.push([p[0], F + H1 - 0.6, p[1]]); }
  for (const sg of [-1, 1]) for (const u of [-4.2, 4.2]) { const p = P(u, sg * 3.6); lamps.push([p[0], y2 + H2 - 0.5, p[1]]); }
}

// a bronze tripod urn (src/landmarks/props.js dinh) of total height h on its stone slab, facing Thế Miếu (-v),
// so its two handles lie across u
function urn(S, u, v, h) {
  const q = P(u, v);
  dinh(S, q[0], gy(q), q[1], ANG - Math.PI / 2, { h, col: BRONZE, stand: 0.22, standCol: shade(STONE, 0.92) });
}

function court(S) {
  const g = gy(P(0, -10));
  S.base = g - LAND_Y;
  // the stone apron of the urns along the front of the cross wall, with Cao đỉnh's bay pushed forward on the axis
  // (OSM area 695810817)
  const apron = [[-21.2, -6.88], [-20.12, -6.82], [20.21, -6.68], [20.87, -6.7], [20.87, -12.83], [2.75, -12.79], [2.7, -17.85], [-4.79, -17.9], [-4.73, -12.7], [-21.15, -12.74]];
  S.kind = KIND.ROAD;
  S.prism(apron.map(([u, v]) => P(u, v)), g - 0.2, g + 0.12, shade(STONE, 0.9), shade(STONE, 1.04), { topKind: KIND.ROAD });
  // Cửu Đỉnh: Cao in the middle and forward, then outward Nhân, Anh, Thuần, Dụ (west) and Chương, Nghị, Tuyên,
  // Huyền (east); heights from the Huế - Xưa và Nay table
  urn(S, AXIS, -14.6, 2.5);
  const west = [2.31, 2.25, 2.325, 2.337], east = [2.27, 2.31, 2.35, 2.31];
  for (let i = 0; i < 4; i++) { urn(S, AXIS - 4.6 * (i + 1), -10.2, west[i]); urn(S, AXIS + 4.6 * (i + 1), -10.2, east[i]); }
  // two small mapped masonry pieces at the ends of the row (OSM 695810821/822), drawn as stone stands with burners
  for (const [u, v] of [[-22.51, -17.55], [21.02, -16.99]]) {
    const y = gy(P(u, v));
    S.kind = KIND.MASONRY;
    fbox(S, u, v, y - 0.1, y + 0.85, 1.4, 1.4, shade(STONE, 0.9), { taper: 0.92 });
    const q = P(u, v);
    dinh(S, q[0], y + 0.85, q[1], ANG - Math.PI / 2, { h: 0.75, col: BRONZE, lid: true, stand: 0 });
  }
  // behind: the walk from the back steps to Miếu Môn, Bát Tràng brick with a stone middle
  const gb = gy(P(0, 16));
  S.base = gb - LAND_Y;
  S.kind = KIND.ROAD;
  fbox(S, AXIS, 16.6, gb - 0.2, gb + 0.06, 4.4, 15.2, BRICK, { topKind: KIND.ROAD });
  fbox(S, AXIS, 16.6, gb + 0.06, gb + 0.1, 1.3, 15.2, shade(STONE, 1.08), { topKind: KIND.ROAD });
}

// a gate in the cross wall with a timber loft (bell or drum) over the passage
function gateTower(S, lamps, [u, v, len, dep]) {
  const g = gy(P(u, v)), H = 4.0;
  S.base = g - LAND_Y;
  S.kind = KIND.MASONRY;
  fbox(S, u, v, g - 0.3, g + H, len, dep, WALL, { top: shade(WALL, 0.9) });
  fbox(S, u, v, g + H - 0.35, g + H, len + 0.3, dep + 0.3, shade(WALL, 1.08));
  S.kind = KIND.PLAIN;
  fbox(S, u, v, g, g + 2.9, 2.6, dep + 0.06, hex('#2b2320')); // the passage
  fbox(S, u, v, g + 2.9, g + 3.25, 3.2, dep + 0.1, shade(WALL, 0.8));
  // tiled eaves over the two wings, and the loft
  for (const s of [-1, 1]) S.hip(...P(u + s * (len / 2 - 2.6), v), 5.2, dep, ANG, g + H, 0.9, ROOF, { flare: 0.25, over: 0.5, ridgeCol: RIDGE, fascia: 0.15, fasciaCol: shade(LAC, 0.7), hips: true, glazed: true });
  S.kind = KIND.TIMBER;
  fbox(S, u, v, g + H, g + H + 2.5, 4.8, 3.4, LAC, { top: shade(ROOF, 0.8) });
  S.kind = KIND.PLAIN;
  for (const sg of [-1, 1]) {
    fbox(S, u, v + sg * 1.74, g + H + 0.5, g + H + 2.0, 3.4, 0.08, shade(LAC, 0.55));
    fbox(S, u, v + sg * 1.76, g + H + 2.05, g + H + 2.3, 4.8, 0.1, shade(GOLD, 0.85));
  }
  S.hip(...P(u, v), 4.8, 3.4, ANG, g + H + 2.5, 2.0, ROOF, eave(1.1));
  for (const sg of [-1, 1]) { const p = P(u, v + sg * 2.3); lamps.push([p[0], g + H + 1.9, p[1]]); }
}

export function build({ data, S, group }) {
  // the two gate towers are mapped as plain buildings; this model draws them
  if (Array.isArray(data.bld)) for (let i = data.bld.length - 1; i >= 0; i--) if (['Tuấn Liệt Môn', 'Sùng Công Môn'].includes(String(data.bld[i][3]).normalize('NFC'))) data.bld.splice(i, 1);
  // no mapped tree on the base, the steps, the urn apron, the gates or the back walk
  const CLEAR = [[0, 0, 25, 19], [0, -12, 46, 12], [27.1, -4.6, 15, 5], [-27, -4.9, 15, 5], [0, 16.6, 6, 16]];
  if (Array.isArray(data.trees)) {
    const t = data.trees, near = data.meta?.counts?.treesNear;
    for (let i = t.length / 4 - 1; i >= 0; i--) {
      const dx = t[i * 4] / 10 - C[0], dz = t[i * 4 + 1] / 10 - C[1];
      const u = dx * UX + dz * UZ, v = -dx * UZ + dz * UX;
      if (!CLEAR.some(([cu, cv, su, sv]) => Math.abs(u - cu) < su / 2 && Math.abs(v - cv) < sv / 2)) continue;
      t.splice(i * 4, 4);
      if (near != null && i < near) data.meta.counts.treesNear--;
    }
  }
  const lamps = [];
  pavilionBody(S, lamps);
  court(S);
  for (const G of GATES) gateTower(S, lamps, G);
  S.kind = KIND.PLAIN;
  S.base = 0;
  const roads = roadsNear(data, C, 120);
  for (const w of WALLS) fence(S, w.map(([u, v]) => P(u, v)), FENCE.imperial, { closed: false, roads });
  S.kind = KIND.PLAIN;
  S.base = 0;
  const pos = [], col = [];
  for (const p of lamps) { pos.push(...p); col.push(1, 0.62, 0.3); }
  const pts = glowPoints(pos, col, 4);
  pts.userData.glow = true;
  pts.userData.landmark = id;
  group.add(pts);
}
