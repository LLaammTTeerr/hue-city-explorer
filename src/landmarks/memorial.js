import { KIND, hex, shade } from '../geo/buf.js';
import { LAND_Y, PAL } from '../config.js';
import { rise } from '../geo/terrain.js';

// ---- Bia Quốc Học: Đài tưởng niệm Chiến sĩ trận vong (1920), on the south bank opposite Trường Quốc Học ----
//
// What the sources say (fetched Nov 2026):
//  - vi.wikipedia.org/wiki/Bia_Quốc_Học: the council chose the form of "a large screen (bình phong), two tiers,
//    with a roof, built on a base of two steps"; a medal hangs from a kim khánh plaque at the centre; dragon,
//    qilin, 壽, tứ quý and fretwork in Nguyễn style; 31 French names on the front, 78 Vietnamese on the back
//    (later chiselled off). Designed by Tôn Thất Sa (teacher at the Bá Công school); built 12 May – 18 Sept 1920,
//    inaugurated 18/23 Sept 1920 (sources differ).
//  - kienthuc.net.vn/kho-tri-thuc/anh-cuc-doc-ve-bia-quoc-hoc-hue-dau-the-ky-20-1167109.html: same council text,
//    plus "hai bên đài còn có hai trụ biểu": one trụ biểu (memorial pillar) on each side.
//  - vietnamplus.vn/dau-tu-700-trieu-dong-thuc-hien-trung-tu-bia-quoc-hoc-hue-post415775.vnp (2016): south bank,
//    directly in front of the school; serves as the school's bình phong and as the stage of the Huế craft
//    festival / áo dài shows; before restoration the outer enclosing wall was gone, the steps collapsed and the
//    two trụ biểu broken. Restoration (~700 M VND, to Jan 2017) covered the stele, the balustrade (lan can) and
//    the trụ biểu.
//  - thuonghieucongluan.com.vn/bia-quoc-hoc-hue-bi-ve-ao-moi-a33134.html: after restoration the stele is painted
//    a glaring yellow ("một màu vàng chói"); re-roofed in glazed tubular tiles (ngói ống men, 30 % old tiles
//    reused); steel roof members; brick and tam hợp lime mortar; steps re-paved; 67 lamps on roof, walls, pillars.
//  - vietnammonpaysnatal.fr/stele-commemorative-bia-tuong-niem/: "grand paravent doté d'un toit", two levels,
//    raised base with steps, faces the school.
//
//  - tapchisonghuong.com.vn/tap-chi/c371/n25392 and dangquangarch.com (Nov 2026): 10.95 m in all ("cao tổng cộng
//    10,95m"), the two trụ biểu 9.85 m, balustrade nearly 1.4 m.
//
// NOT confirmed, filled in from the form described above and general knowledge of Huế screens:
//  - the other dimensions: ~20 m across the pillars, central bay ~6 m wide, crown ~10.7 m, side bays lower; the split into a tall middle bay and two lower side bays; roof tier heights;
//  - the tile colour (only "glazed" is known; drawn a deep yellow-ochre so it reads against the yellow walls);
//  - the pillar heads (lantern box + lotus-bud finial, the usual Huế trụ biểu);
//  - the balustrade layout and the size of the paved forecourt.
// Orientation: the screen faces the school's gate across Lê Lợi with the river behind it (sources: "in front of
// the school", "serves as the school's screen").

const ROW = [-675.1, 879.2]; // OSM memorial node, metres (x east, z south), used if data.special.biaquochoc is missing

export function buildBiaQuocHoc(data, S) {
  try {
    build(data, S);
  } catch (e) {
    console.warn('Bia Quốc Học not built:', e);
  }
  S.kind = KIND.PLAIN;
  S.base = 0;
}

function build(data, S) {
  const sp = data?.special?.biaquochoc;
  const c = sp && Array.isArray(sp.c) && Number.isFinite(sp.c[0]) && Number.isFinite(sp.c[1]) ? [sp.c[0] / 10, sp.c[1] / 10] : ROW.slice();

  // Facing. The memorial → gate vector says which way the front looks (toward the school, away from the river).
  // In the data the OSM node sits ~40 m to one side of the gate's axis, while in reality the screen stands square
  // to Lê Lợi on that axis; so the vector picks the side, and the direction is snapped to the gate's own normal
  // (the gate's `a` runs along its facade, parallel to the street). Without the gate: face south-south-west.
  let f = [-Math.sin(Math.PI / 8), Math.cos(Math.PI / 8)];
  const g = data?.quocHocGate;
  if (g && Array.isArray(g.c) && Number.isFinite(g.c[0]) && Number.isFinite(g.c[1])) {
    const v = [g.c[0] / 10 - c[0], g.c[1] / 10 - c[1]], vl = Math.hypot(v[0], v[1]);
    if (vl > 1) {
      f = [v[0] / vl, v[1] / vl];
      if (Number.isFinite(g.a)) {
        const ga = g.a / 1000, n = [-Math.sin(ga), Math.cos(ga)];
        const s = n[0] * f[0] + n[1] * f[1] >= 0 ? 1 : -1;
        if (Math.abs(n[0] * f[0] + n[1] * f[1]) > 0.5) f = [n[0] * s, n[1] * s]; // only snap if the two roughly agree
      }
    }
  }
  const p = [-f[1], f[0]], A = Math.atan2(f[1], f[0]);
  const at = (a, b = 0) => [c[0] + f[0] * a + p[0] * b, c[1] + f[1] * a + p[1] * b];

  const y0 = LAND_Y + rise(c[0], c[1]);
  if (!Number.isFinite(y0)) return;
  S.base = y0 - LAND_Y;

  const yellow = hex('#e8bf4a'), yellowD = hex('#d3a83c'), trim = hex('#f3e6c4'), panel = hex('#dcb04a');
  const roof = hex('#b8862c'), ridge = hex('#f0d27a'), slab = hex('#6d655c'), dark = hex('#3a302a');
  const pave = hex('#cfc6b4'), stoneL = shade(PAL.stone, 1.06), bronze = hex('#c9a040');

  // box in frame terms: centre (a along front, b along facade), depth da (along f), width db (along p)
  const box = (a, b, ya, yb, da, db, col, o) => { const q = at(a, b); S.box(q[0], q[1], ya, yb, da, db, A, col, o); };
  // hip roof whose long side runs along the facade
  const hipAt = (a, b, wb, da, y, h, col, o) => { const q = at(a, b); S.hip(q[0], q[1], wb, da, A + Math.PI / 2, y, h, col, o); };

  // ---- the riverside park: paving around the platform and the forecourt toward Lê Lợi ----
  S.kind = KIND.ROAD;
  box(0, 0, y0 - 0.3, y0 + 0.05, 14, 30, pave, { topKind: KIND.ROAD });
  box(23, 0, y0 - 0.3, y0 + 0.04, 32, 22, pave, { topKind: KIND.ROAD }); // forecourt, the festival stage plaza
  // low kerb framing the forecourt
  S.kind = KIND.MASONRY;
  for (const s of [-1, 1]) box(23, s * 11.1, y0, y0 + 0.25, 32, 0.25, stoneL);

  // ---- the platform: two steps ----
  const H1 = 0.45, H2 = 0.9;
  box(0, 0, y0 - 0.2, y0 + H1, 9.2, 23, PAL.stone, { topKind: KIND.ROAD });
  box(0, 0, y0 + H1, y0 + H2, 6.4, 20.4, stoneL, { topKind: KIND.ROAD });
  // stairs at the middle, front and back (front wider: it faces the forecourt)
  for (const [s, w] of [[1, 7], [-1, 4.4]]) {
    for (let i = 0; i < 2; i++) box(s * (4.6 + 0.2 + i * 0.4), 0, y0 - 0.2, y0 + H1 - (i + 1) * 0.15, 0.4, w + 1.2 - i * 0.2, PAL.stone, { topKind: KIND.ROAD });
    box(s * (3.2 + 0.3), 0, y0 + H1, y0 + H2 - 0.22, 0.6, w, PAL.stone, { topKind: KIND.ROAD });
  }

  // ---- the lan can: a low balustrade along the edge of the lower step, open at the stairs ----
  S.kind = KIND.MASONRY;
  const yb = y0 + H1, rail = 0.85;
  const runs = [];
  for (const s of [-1, 1]) {
    runs.push([s * 4.45, -11.3, -4.6], [s * 4.45, 4.6, 11.3]); // front and back edges, split by the stairs
  }
  for (const [a, b0, b1] of runs) {
    const len = b1 - b0, mid = (b0 + b1) / 2;
    box(a, mid, yb + rail - 0.16, yb + rail, 0.3, len, trim);
    box(a, mid, yb, yb + 0.14, 0.32, len, trim);
    const n = Math.max(2, Math.round(len / 1.6));
    for (let i = 0; i <= n; i++) { const b = b0 + (len * i) / n; box(a, b, yb, yb + rail + (i === 0 || i === n ? 0.25 : 0.05), 0.34, 0.34, i === 0 || i === n ? trim : yellowD); }
  }
  for (const s of [-1, 1]) {
    // end runs, behind the pillars
    box(0, s * 11.3, yb + rail - 0.16, yb + rail, 8.9, 0.3, trim);
    box(0, s * 11.3, yb, yb + 0.14, 8.9, 0.32, trim);
    for (const a of [-2.2, 0, 2.2]) box(a, s * 11.3, yb, yb + rail + 0.05, 0.34, 0.34, yellowD);
  }

  // ---- the screen ----
  const y = y0 + H2, T = 1.1; // wall thickness
  // the base course of the whole screen
  S.kind = KIND.MASONRY;
  box(0, 0, y, y + 0.6, T + 0.5, 15.6, slab);

  // side bays: lower walls with one tiled roof each
  const sbW = 4.4, sbH = 4.1, sbB = 3.0 + sbW / 2;
  for (const s of [-1, 1]) {
    S.kind = KIND.CIVIC;
    box(0, s * sbB, y + 0.6, y + sbH, T, sbW, yellow, { top: shade(roof, 0.8) });
    S.kind = KIND.PLAIN;
    box(0, s * sbB, y + sbH - 0.45, y + sbH, T + 0.3, sbW + 0.2, trim); // cornice
    for (const k of [-1, 1]) {
      box(k * (T / 2 + 0.03), s * sbB, y + 1.0, y + sbH - 0.8, 0.06, sbW - 1.2, panel); // framed panel
      box(k * (T / 2 + 0.06), s * sbB, y + 1.35, y + sbH - 1.15, 0.06, sbW - 2.0, slab); // the inscription slab
    }
    // the outer end of each wing steps down in a short scroll-topped buttress
    box(0, s * (sbB + sbW / 2 + 0.5), y + 0.6, y + 2.6, T + 0.2, 1.0, yellowD, { top: trim });
    box(0, s * (sbB + sbW / 2 + 0.5), y + 2.6, y + 2.9, T + 0.4, 1.2, trim);
    hipAt(0, s * sbB, sbW, T, y + sbH, 1.1, roof, { flare: 0.25, over: 0.55, fascia: 0.18, fasciaCol: trim, ridgeCol: ridge, hips: true, glazed: true });
  }

  // central bay, lower tier
  const cW = 6.0, cH = 5.0;
  S.kind = KIND.CIVIC;
  box(0, 0, y + 0.6, y + cH, T + 0.2, cW, yellow, { top: shade(roof, 0.8) });
  S.kind = KIND.PLAIN;
  for (const k of [-1, 1]) {
    // corner pilasters of the middle bay, front and back
    for (const s of [-1, 1]) box(k * (T / 2 + 0.12), s * (cW / 2 - 0.3), y + 0.6, y + cH - 0.4, 0.2, 0.6, trim);
    box(k * (T / 2 + 0.13), 0, y + 1.0, y + cH - 0.9, 0.06, cW - 1.8, panel);
    box(k * (T / 2 + 0.16), 0, y + 1.2, y + 2.9, 0.06, cW - 2.6, slab); // the name tablet
    // the kim khánh plaque and the medal hanging below it
    const q = at(k * (T / 2 + 0.2), 0);
    S.box(q[0], q[1], y + 3.4, y + 3.9, 0.08, 1.9, A, bronze);
    S.box(q[0], q[1], y + 3.9, y + 4.1, 0.08, 1.0, A, bronze);
    const m = at(k * (T / 2 + 0.24), 0);
    S.cyl(m[0], m[1], y + 3.0, y + 3.35, 0.2, 0.22, 6, bronze);
  }
  box(0, 0, y + cH - 0.5, y + cH, T + 0.6, cW + 0.3, trim); // cornice
  hipAt(0, 0, cW, T + 0.2, y + cH, 1.0, roof, { flare: 0.3, over: 0.75, fascia: 0.2, fasciaCol: trim, ridgeCol: null, glazed: true });

  // upper tier: a narrower panel rising out of the lower roof, under the top roof
  const uW = 3.8, uY = y + cH + 0.5, uH = 1.9;
  S.kind = KIND.CIVIC;
  box(0, 0, uY - 0.4, uY + uH, T * 0.85, uW, yellow, { top: shade(roof, 0.8) });
  S.kind = KIND.PLAIN;
  for (const k of [-1, 1]) {
    box(k * (T * 0.425 + 0.03), 0, uY + 0.25, uY + uH - 0.35, 0.06, uW - 1.0, panel);
    box(k * (T * 0.425 + 0.07), 0, uY + 0.55, uY + 1.45, 0.06, 0.9, dark); // the 壽 medallion
  }
  box(0, 0, uY + uH - 0.3, uY + uH, T + 0.3, uW + 0.3, trim);
  const topY = uY + uH;
  hipAt(0, 0, uW, T * 0.85, topY, 1.25, roof, { flare: 0.3, over: 0.75, fascia: 0.2, fasciaCol: trim, ridgeCol: ridge, hips: true, glazed: true });
  // ridge crown: a gourd on a lotus seat at the middle of the top ridge
  const r0 = topY + 1.25 + 0.15;
  S.cyl(c[0], c[1], r0, r0 + 0.3, 0.35, 0.45, 6, ridge, { cap: false });
  S.cyl(c[0], c[1], r0 + 0.3, r0 + 0.6, 0.45, 0.28, 6, ridge, { cap: false });
  S.cyl(c[0], c[1], r0 + 0.6, r0 + 1.0, 0.28, 0.04, 6, ridge);

  // ---- the two trụ biểu at the ends: square shafts, lantern heads, lotus-bud finials ----
  const pB = 9.5, pY = y0 + H2, hd = pY + 6.45; // shaft top: the pillars stand 9.85 m (Tạp chí Sông Hương)
  for (const s of [-1, 1]) {
    const q = at(0.3, s * pB);
    S.kind = KIND.MASONRY;
    S.box(q[0], q[1], pY, pY + 0.7, 1.35, 1.35, A, slab);
    S.kind = KIND.CIVIC;
    S.box(q[0], q[1], pY + 0.7, hd, 0.95, 0.95, A, yellow, { taper: 0.94 });
    S.kind = KIND.PLAIN;
    S.box(q[0], q[1], pY + 2.0, hd - 0.7, 1.0, 0.6, A, panel); // couplet panels front/back
    S.box(q[0], q[1], hd, hd + 0.3, 1.25, 1.25, A, trim);
    S.box(q[0], q[1], hd + 0.3, hd + 1.1, 0.85, 0.85, A, yellowD); // the lantern
    for (const k of [-1, 1]) {
      S.box(q[0] + f[0] * k * 0.44, q[1] + f[1] * k * 0.44, hd + 0.45, hd + 0.95, 0.04, 0.45, A, dark);
      S.box(q[0] + p[0] * k * 0.44, q[1] + p[1] * k * 0.44, hd + 0.45, hd + 0.95, 0.45, 0.04, A, dark);
    }
    S.kind = KIND.GLAZED;
    S.box(q[0], q[1], hd + 1.1, hd + 1.35, 1.2, 1.2, A, roof, { taper: 0.6 });
    S.kind = KIND.PLAIN;
    S.cyl(q[0], q[1], hd + 1.35, hd + 1.7, 0.22, 0.42, 6, trim, { cap: false, rot: A });
    S.cyl(q[0], q[1], hd + 1.7, hd + 2.5, 0.42, 0.05, 6, trim, { rot: A });
  }

  // ---- two low lamp posts flanking the front stairs (restoration lighting) ----
  for (const s of [-1, 1]) {
    const q = at(5.6, s * 4.8);
    S.cyl(q[0], q[1], y0, y0 + 2.6, 0.07, 0.06, 5, dark, { cap: false });
    S.box(q[0], q[1], y0 + 2.6, y0 + 3.0, 0.3, 0.3, A, trim);
  }
}
