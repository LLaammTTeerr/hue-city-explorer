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
// The OSM group (outline, steps, apron, walls, gates) sits about 1 m east of where Google's satellite shows the
// steps and urns, so the frame is re-centred 1.0 m west and 0.4 m north of the outline's centre (-1259.15, 238.65);
// the axis already matches. Google Street View (a photosphere in Thế Miếu's court, looking south-west along the
// urns) shows the ground storey's yellow end walls, a fretwork railing round the verandah, dark worn lacquer, and
// the gate towers as plastered gates of three doors under one roof with a plastered loft over the middle.
export const id = 'hienlam';

const C = [-1260.15, 238.25];
const ANG = Math.atan2(-0.605, 0.796);
const UX = Math.cos(ANG), UZ = Math.sin(ANG);
const P = (u, v) => [C[0] + u * UX - v * UZ, C[1] + u * UZ + v * UX];

// The yellow glaze has weathered to a dull orange-brown with dark lichen (Google's satellite and the court
// photosphere): the tile is drawn in that colour, not PAL.imperialRoof's fresh yellow. Ridges, hips and the small
// corner curls are dark ceramic; the finial keeps a worn gilt.
const ROOF = hex('#a8692f');
const RIDGE = hex('#5a4234'), FINIAL = hex('#a88a45'), GOLD = hex('#a67c34');
const LAC = hex('#66281f'); // the pavilion's lacquer reads dark and worn in the photographs, not fresh vermilion
const RAIL = hex('#8a3226'), DOOR = hex('#7c2a22'), GRASS = hex(PAL.green.grass), FLOWER = hex('#c8683a');
const BASE = hex('#a99d86'), BRICK = hex('#9c7a64'), THANH = hex('#8e9396'), STONE = PAL.stone;
const WALL = hex('#b8945e'); // the imperial compound walls (FENCE.imperial)
const BRONZE = hex('#4c4d3f'), TABLET = hex('#24382d');

const gy = (p) => LAND_Y + rise(p[0], p[1]);
function fbox(S, u, v, y0, y1, su, sv, col, opts) { const p = P(u, v); S.box(p[0], p[1], y0, y1, su, sv, ANG, col, opts); }
// nearly straight eaves ending in small dark curls (horns: false), not long upswept gilt horns
const eave = (over, extra = {}) => ({ flare: 0.2, over, fascia: 0.22, fasciaCol: shade(LAC, 0.7), ridgeCol: RIDGE, hips: true, glazed: true, segs: 3, horns: false, ...extra });

// a frieze of dark worn lacquer carrying a row of small panels, alternately red and gilt (the đố bản and ô hộc of the
// photograph), instead of one bright strip: along the face at v, from y0 to y1, length len, centred on u0
function frieze(S, u0, v, y0, y1, len, sg) {
  fbox(S, u0, v, y0, y1, len, 0.1, shade(LAC, 0.75));
  const n = Math.max(2, Math.round(len / 0.9)), w = len / n;
  for (let k = 0; k < n; k++) fbox(S, u0 - len / 2 + w * (k + 0.5), v + sg * 0.03, y0 + 0.07, y1 - 0.07, w * 0.72, 0.06, k & 1 ? shade(GOLD, 0.9) : shade(RAIL, 0.85));
}
// a fretwork railing: top and bottom rails with close balusters, open between (along u at v)
function railing(S, u0, u1, v, y0, h) {
  const um = (u0 + u1) / 2, len = u1 - u0;
  fbox(S, um, v, y0 + h - 0.1, y0 + h, len, 0.12, RAIL);
  fbox(S, um, v, y0 + 0.06, y0 + 0.14, len, 0.08, shade(RAIL, 0.8));
  fbox(S, um, v, y0 + h * 0.5 - 0.03, y0 + h * 0.5 + 0.03, len, 0.05, shade(RAIL, 0.8));
  const n = Math.max(2, Math.round(len / 0.32));
  for (let k = 0; k <= n; k++) fbox(S, u0 + (len * k) / n, v, y0 + 0.14, y0 + h - 0.1, 0.05, 0.05, shade(RAIL, 0.7));
}

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
      frieze(S, u, sg * (CD / 2 + 0.06), F + 2.6, F + 3.05, 3.4, sg);
    }
    if (sg < 0) { fbox(S, 0, -CD / 2 - 0.14, F + 2.75, F + 3.35, 1.9, 0.08, TABLET); fbox(S, 0, -CD / 2 - 0.12, F + 2.7, F + 3.4, 2.04, 0.06, GOLD); }
  }
  for (const s of [-1, 1]) fbox(S, s * (CW / 2 + 0.04), 0, F + 0.4, F + 2.9, 0.08, 3.4, shade(LAC, 0.6));
  // the end bays: yellow-plastered walls between the corner columns closing the verandah at either end
  S.kind = KIND.MASONRY;
  for (const s of [-1, 1]) fbox(S, s * 10, 0, F, F + H1 - 0.28, 0.4, 10.2, WALL);
  // a red fretwork railing along the front and back verandah edges, open in the middle bay over the steps
  S.kind = KIND.PLAIN;
  for (const sg of [-1, 1]) for (const [u0, u1] of [[-9.8, -2.5], [2.5, 9.8]]) railing(S, u0, u1, sg * 5.1, F, 0.74);
  // under the verandah, the base's long faces carry a yellow fretwork screen (glazed-tile grilles) either side of
  // the steps, framed in the pale render
  for (const sg of [-1, 1]) for (const s of [-1, 1]) {
    const um = AXIS + s * 7.2, len = 7.6, v = sg * 6.83, y0 = g + 0.15, y1 = F - 0.3;
    fbox(S, um, v, y0, y1, len, 0.06, hex('#c9a54e'));
    const n = Math.round(len / 0.35);
    for (let k = 1; k < n; k++) fbox(S, um - len / 2 + (len * k) / n, v + sg * 0.02, y0, y1, 0.05, 0.04, hex('#6b5634'));
    for (const y of [y0 + (y1 - y0) / 3, y0 + (2 * (y1 - y0)) / 3]) fbox(S, um, v + sg * 0.02, y - 0.025, y + 0.025, len, 0.04, hex('#6b5634'));
  }
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
    frieze(S, 0, sg * (D2 / 2 + 0.06), y2 + 3.85, y2 + 4.25, W2, sg);
    // fretwork balcony railing along the second storey, over the skirt roof
    railing(S, -W2 / 2, W2 / 2, sg * (D2 / 2 + 0.3), y2 + 0.1, 0.9);
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
    frieze(S, 0, sg * (D3 / 2 + 0.06), y3 + 2.75, y3 + 3.05, W3, sg);
  }
  S.hip(...P(0, 0), W3, D3, ANG, y3 + H3, 2.7, ROOF, eave(1.3));
  const top = y3 + H3 + 2.7, c = P(0, 0);
  S.cyl(c[0], c[1], top - 0.1, top + 0.25, 0.42, 0.32, 8, FINIAL);
  S.cyl(c[0], c[1], top + 0.25, top + 0.75, 0.42, 0.24, 8, FINIAL);
  S.cyl(c[0], c[1], top + 0.75, top + 1.25, 0.15, 0.04, 6, FINIAL);

  // night: lanterns under the three eaves
  for (const sg of [-1, 1]) for (const u of [-7.6, -2.3, 2.3, 7.6]) { const p = P(u, sg * 5.3); lamps.push([p[0], F + H1 - 0.6, p[1]]); }
  for (const sg of [-1, 1]) for (const u of [-4.2, 4.2]) { const p = P(u, sg * 3.6); lamps.push([p[0], y2 + H2 - 0.5, p[1]]); }
}

// a bronze tripod urn (src/landmarks/props.js dinh) of total height h on its stone slab, facing Thế Miếu (-v),
// so its two handles lie across u
function urn(S, u, v, h) {
  const q = P(u, v);
  dinh(S, q[0], gy(q) + 0.28, q[1], ANG - Math.PI / 2, { h, col: BRONZE, stand: 0.22, standCol: shade(STONE, 0.92) }); // on the raised bed
}

function court(S) {
  const g = gy(P(0, -10));
  S.base = g - LAND_Y;
  // the stone apron of the urns along the front of the cross wall, with Cao đỉnh's bay pushed forward on the axis
  // (OSM area 695810817)
  const apron = [[-21.2, -6.88], [-20.12, -6.82], [20.21, -6.68], [20.87, -6.7], [20.87, -12.83], [2.75, -12.79], [2.7, -17.85], [-4.79, -17.9], [-4.73, -12.7], [-21.15, -12.74]];
  S.kind = KIND.ROAD;
  // seen from the court it is a raised bed behind a low brick kerb wall, rendered and capped, round turf; the urns
  // stand on stone slabs, a clipped hedge of flowering shrubs runs along the kerb and between the urns
  S.kind = KIND.MASONRY;
  S.prism(apron.map(([u, v]) => P(u, v)), g - 0.2, g + 0.5, shade(BRICK, 0.95), GRASS, { topKind: KIND.GROUND });
  S.kind = KIND.PLAIN;
  const hedge = (u, v, su, sv, k) => {
    fbox(S, u, v, g + 0.5, g + 0.95, su, sv, hex(PAL.shrubs[k & 3]));
    // blooms scattered along the top, not one slab
    const n = Math.max(1, Math.round(Math.max(su, sv) / 0.5)), along = su >= sv;
    for (let j = 0; j < n; j++) {
      const t = (j + 0.5) / n - 0.5, w = (j * 7 + k * 3) % 5 === 0 ? 0 : 0.28;
      if (w) fbox(S, u + (along ? t * su : 0), v + (along ? 0 : t * sv), g + 0.93, g + 1.03, w, w, (j + k) & 1 ? FLOWER : hex('#b8323a'));
    }
  };
  for (let i = -4; i <= 4; i++) if (i) {
    hedge(AXIS + 4.6 * i, -12.25, 3.0, 0.6, i + 4); // along the front kerb, in front of each urn
    for (const s of [-1, 1]) hedge(AXIS + 4.6 * i + s * 1.75, -9.6, 0.9, 1.6, i + 5 + s); // between the urns
  }
  for (const [u, k] of [[-4.2, 1], [2.15, 3]]) hedge(u, -15.3, 0.6, 4.2, k); // along the sides of Cao đỉnh's bay
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

// a gate in the cross wall: a plastered gate of three doors under one tiled roof, with a plastered loft (bell or
// drum) over the middle door, a railed balcony and a round opening on each face (Street View, Thế Miếu's court)
function gateTower(S, lamps, [u, v, len, dep]) {
  const g = gy(P(u, v)), H = 4.0;
  S.base = g - LAND_Y;
  S.kind = KIND.MASONRY;
  fbox(S, u, v, g - 0.3, g + H, len, dep, WALL, { top: shade(WALL, 0.9) });
  fbox(S, u, v, g + H - 0.35, g + H, len + 0.3, dep + 0.3, shade(WALL, 1.08));
  S.kind = KIND.PLAIN;
  for (const [du, w, h] of [[0, 1.9, 2.9], [-3.6, 1.6, 2.5], [3.6, 1.6, 2.5]]) {
    fbox(S, u + du, v, g, g + h, w, dep + 0.06, DOOR); // red door leaves on both faces
    fbox(S, u + du, v, g + h, g + h + 0.3, w + 0.6, dep + 0.1, shade(WALL, 0.8));
  }
  for (const du of [-5.6, -1.65, 1.65, 5.6]) fbox(S, u + du, v, g, g + H - 0.4, 0.5, dep + 0.12, shade(WALL, 1.1)); // pilasters
  // one tiled roof over the whole gate, the loft rising through it
  S.hip(...P(u, v), len, dep, ANG, g + H, 1.2, ROOF, { flare: 0.3, over: 0.6, ridgeCol: RIDGE, fascia: 0.15, fasciaCol: shade(LAC, 0.7), hips: true, glazed: true });
  const yl = g + H + 0.6, HL = 2.8;
  S.kind = KIND.MASONRY;
  fbox(S, u, v, g + H, yl + HL, 4.6, 3.2, WALL, { top: shade(WALL, 0.9) });
  S.kind = KIND.PLAIN;
  for (const sg of [-1, 1]) {
    for (const s of [-1, 1]) fbox(S, u + s * 2.05, v + sg * 1.64, yl, yl + HL, 0.5, 0.1, shade(WALL, 1.1));
    fbox(S, u, v + sg * 1.64, yl + 1.0, yl + 2.2, 1.2, 0.08, hex('#3a2a22')); // the round opening, drawn square-cut
    fbox(S, u, v + sg * 1.7, yl, yl + 0.1, 3.4, 0.5, shade(WALL, 0.85)); // balcony floor
    fbox(S, u, v + sg * 1.92, yl + 0.55, yl + 0.65, 3.4, 0.08, RAIL);
    fbox(S, u, v + sg * 1.92, yl + 0.1, yl + 0.55, 3.4, 0.04, shade(RAIL, 0.6));
  }
  S.hip(...P(u, v), 4.6, 3.2, ANG, yl + HL, 1.8, ROOF, eave(1.0));
  for (const sg of [-1, 1]) { const p = P(u, v + sg * 2.3); lamps.push([p[0], yl + 2.0, p[1]]); }
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
