import { KIND, hex, shade, inRing, unflat, pathLength } from '../../geo/buf.js';
import { PAL } from '../../config.js';
import { waterY, groundY } from '../../geo/terrain.js';
import { bridgeProfiles } from '../../geo/bridges.js';

// ---- Đông Thành Thủy Quan (cầu / cống Lương Y): the eastern water gate, where Ngự Hà leaves the Citadel for sông
// Đông Ba through the line of the east wall ----
//
// What the sources say (fetched Nov 2026; see docs/places/thuyquan.md):
//  - OpenStreetMap way 619851621 (man_made=bridge, historic=city_gate, alt_name Cống Lương Y) outlines it, about
//    75 m long and 4 m wide, running SE-NW on the line of đường Xuân 68 between Lê Văn Hưu and Lương Y; the road
//    over it is way 174742775 (Cầu Lương Y, residential, asphalt, maxweight 5 t).
//  - tapchikientruc.com.vn (the vaulted bridges over Ngự Hà) and anhang.vn: a timber bridge (Thanh Long kiều, 1806/
//    1808) rebuilt in brick (gạch vồ) and blue-grey stone (đá thanh) in 1830 under Minh Mạng, with a cannon workshop
//    on it; 71.7 m long, 4.9 m wide, 8.05 m high; the canal here is nearly 70 m wide, so the bridge is a masonry dam
//    with ONE vault, 8.4 m across (1.6 m wider than Tây Thành Thủy Quan's 6.6 m), of six stone rings; it had a
//    drop gate (áp quan) for boats and to hold the water. The outer (east) parapet is 1.55 m high and pierced by 13
//    round gun ports about 0.5 m across; the inner (west) parapet is 0.95 m high and keeps the two stone posts,
//    0.54 x 0.54 m, that held the gate's pivot beam. Railings and vault in đá thanh, the body in brick, the
//    abutments in laterite (đá gan gà). The deck is curved, rising to make room for the vault.
//  - doanhnhanplus.vn / vnexpress (2020): two small arched doors (about 0.8 m wide, 1-1.5 m high, seven stepped
//    brick courses on blue stone) at the two feet of the bridge, the left and right doors of the water gate, opening
//    from the Citadel onto the path beside Ngự Hà and the moat.
//  - An old postcard (Commons: "Cống Đông thành Thủy quan qua bưu ảnh xưa", "Pont Thanh-Long"): long plain walls
//    standing in the water, the deck sloping up from both banks to a single round arch framed by two pilasters.
//
// Estimated: the arch is drawn as a half circle springing 0.5 m above the water; the pilasters (1 m wide), the
// height and spacing of the gun ports (evenly along the parapet, 0.85 m above the deck), the height of the gate
// posts, the colours (dark weathered brick as on the Kinh thành, grey-green stone, rust-brown laterite at the
// waterline), and the short walls that join the bridge's feet to the ends of the rampart, with the two doors in them.
// The deck follows geo/bridges.js's profile for this bridge (4.3 m crown, climbing within 45 % of the length from
// each end), so traffic and lamp posts in landmarks/life.js ride on it.
//
// Checked against Google satellite and four car Street View panoramas (Nov 2026; scratch/rebuild/thuyquan, not in
// the repo): the OSM line sits within about 1 m and 1 degree of the deck seen from above, and its north-west end
// meets the parapets' end there, but the parapets stop about 5.5 m short of the line's south-east end, where the
// road runs on at street level to the Lê Văn Hưu corner (69-70 m of parapet, against the 71.7 m published). Two
// tall square gate posts with ball finials stand about 5 m north-east of the road's centre at that foot, one at
// the parapet's end and one about 5 m further south-east, framing the opening to the path along the canal; the
// south-east wing wall is drawn in two pieces either side of that opening. Post size (1 m square, 3.6 m shaft,
// 0.6 m ball) is read from the panorama, about +-20 %.

export const id = 'thuyquan';
const NAME = 'Đông Thành Thủy Quan';

const W = 2.45; // half width (4.9 m)
const SPAN = 8.4, R = SPAN / 2; // the vault
const RING = 0.9; // depth of the six stone rings, as they read on the face (estimate)
const OUT_T = 0.6, OUT_H = 1.55; // outer parapet thickness (estimate) and height
const IN_T = 0.45, IN_H = 0.95; // inner parapet
const PORT_R = 0.25, PORTS = 13; // gun ports
const PIL_W = 1.0, PIL_P = 0.22; // pilasters (estimate)
// the inner corners of the rampart's two ends beside the gate (data.wall[0], metres)
const WALL_ENDS = [[-884.0, -1391.7], [-938.8, -1461.7]];
const SE_BARE = 5.5; // metres of road at the south-east end (u = 0) beyond the parapets' end (satellite)
const POST_V = 5.0, POST_GAP = 5.0; // the gate posts: offset north-east of the road's centre, spacing along it

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function build({ data, S }) {
  const q = (data.bridges || []).find((b) => String(b.n).normalize('NFC') === NAME.normalize('NFC'));
  if (!q) throw new Error('Đông Thành Thủy Quan outline not found');
  const ring = unflat(q.ring);
  const profiles = bridgeProfiles(data);
  let road = null;
  for (const r of data.roads || []) {
    if (!Array.isArray(r) || !r[1] || !Array.isArray(r[2]) || r[2].length < 4) continue;
    const pts = unflat(r[2]), a = pts[0], e = pts[pts.length - 1];
    if (inRing((a[0] + e[0]) / 2, (a[1] + e[1]) / 2, ring) && profiles.get(r[2])) { road = { pts, P: profiles.get(r[2]) }; break; }
  }
  if (!road) throw new Error('Cầu Lương Y road not found');
  const { pts, P } = road;
  const A = pts[0], B = pts[pts.length - 1];
  const L = pathLength(pts);
  const t = [(B[0] - A[0]) / L, (B[1] - A[1]) / L];
  let n = [-t[1], t[0]];
  if (n[0] < 0) n = [-n[0], -n[1]]; // +v faces out of the Citadel (north-east), towards the moat and sông Đông Ba
  const XZ = (u, v) => [A[0] + t[0] * u + n[0] * v, A[1] + t[1] * u + n[1] * v];
  const P3 = (u, v, y) => { const [x, z] = XZ(u, v); return [x, y, z]; };
  const yD = (u) => P.y(clamp(u, 0, L));
  const uc = L / 2;
  const U0 = Math.min(SE_BARE, L * 0.1); // where the parapets begin at the south-east end
  const water = waterY(...XZ(uc, 0));
  const spring = water + 0.5, bed = water - 1.2;
  const T3 = [t[0], 0, t[1]], N3 = [n[0], 0, n[1]];
  const ang = Math.atan2(t[1], t[0]);

  // colours: the Kinh thành's weathered brick, đá thanh, laterite, the street's asphalt
  const brick = shade(PAL.brick, 0.86), brickD = hex('#46443e'), damp = hex('#3a3833');
  const stone = hex('#858a83'), stoneL = hex('#979b93'), stoneD = hex('#6f746e');
  const laterite = hex('#5f4b3f'), asphalt = hex(PAL.road[3]);

  S.base = 0;
  S.kind = KIND.MASONRY;

  // ---- the body: two plain faces from the canal bed to the deck, cut by the vault ----
  const u0a = uc - R, u1a = uc + R;
  const bottom = (u) => (u > u0a && u < u1a ? spring + Math.sqrt(Math.max(0, R * R - (u - uc) ** 2)) : bed);
  const cuts = [0];
  for (let u = 1; u < u0a - 1e-6; u += 1) cuts.push(u);
  for (let k = 0; k <= 24; k++) cuts.push(uc - R * Math.cos((Math.PI * k) / 24));
  for (let u = Math.ceil(u1a); u < L - 1e-6; u += 1) cuts.push(u);
  cuts.push(L);
  cuts.sort((a, b) => a - b);
  const us = cuts.filter((u, i) => i === 0 || u - cuts[i - 1] > 0.01);
  for (let i = 0; i + 1 < us.length; i++) {
    const a = us[i], b = us[i + 1], m = (a + b) / 2;
    const ba = a >= u0a - 1e-6 && b <= u1a + 1e-6 ? spring + Math.sqrt(Math.max(0, R * R - (a - uc) ** 2)) : bed;
    const bb = a >= u0a - 1e-6 && b <= u1a + 1e-6 ? spring + Math.sqrt(Math.max(0, R * R - (b - uc) ** 2)) : bed;
    for (const s of [-1, 1]) {
      const v = s * W, nv = [N3[0] * s, 0, N3[2] * s];
      // the damp band at the waterline, then the brick up to the deck
      const wl = water + 0.9;
      if (Math.max(ba, bb) < wl) {
        S.quad(P3(a, v, ba), P3(b, v, bb), P3(b, v, wl), P3(a, v, wl), damp, nv);
        S.quad(P3(a, v, wl), P3(b, v, wl), P3(b, v, yD(b)), P3(a, v, yD(a)), brick, nv);
      } else S.quad(P3(a, v, ba), P3(b, v, bb), P3(b, v, yD(b)), P3(a, v, yD(a)), brick, nv);
    }
    if (m > u0a && m < u1a) {
      // the vault's underside: its normal points at the arch's centre
      const yc = (ba + bb) / 2 - spring, du = m - uc, l = Math.hypot(du, yc) || 1;
      const hint = [(-T3[0] * du) / l, -yc / l, (-T3[2] * du) / l];
      S.quad(P3(a, -W, ba), P3(b, -W, bb), P3(b, W, bb), P3(a, W, ba), stoneD, hint);
    }
  }
  // the vault's springing walls down into the water, and the deck ends where the street meets it
  for (const [u, s] of [[u0a, 1], [u1a, -1]]) S.quad(P3(u, -W, bed), P3(u, W, bed), P3(u, W, spring), P3(u, -W, spring), damp, [T3[0] * s, 0, T3[2] * s]);
  for (const [u, s] of [[0, -1], [L, 1]]) S.quad(P3(u, -W, bed), P3(u, W, bed), P3(u, W, yD(u)), P3(u, -W, yD(u)), brick, [T3[0] * s, 0, T3[2] * s]);

  // the deck: asphalt between the parapets
  for (let i = 0; i + 1 < us.length; i++) {
    const a = us[i], b = us[i + 1];
    S.quad(P3(a, -W + IN_T, yD(a)), P3(a, W - OUT_T, yD(a)), P3(b, W - OUT_T, yD(b)), P3(b, -W + IN_T, yD(b)), asphalt, [0, 1, 0]);
  }

  // ---- the six stone rings on both faces, a little proud of the brick ----
  const SEG = 20;
  for (const s of [-1, 1]) {
    const v = s * (W + 0.05), nv = [N3[0] * s, 0, N3[2] * s];
    for (let k = 0; k < 6; k++) {
      const r0 = R + (RING * k) / 6, r1 = R + (RING * (k + 1)) / 6;
      const col = k % 2 ? stone : stoneL;
      for (let j = 0; j < SEG; j++) {
        const a0 = (Math.PI * j) / SEG, a1 = (Math.PI * (j + 1)) / SEG;
        const p = (r, a) => P3(uc - r * Math.cos(a), v, spring + r * Math.sin(a));
        S.quad(p(r0, a0), p(r0, a1), p(r1, a1), p(r1, a0), col, nv);
      }
    }
    // the rings' springers: a stone block each side down to the water
    for (const e of [-1, 1]) {
      const u = uc + e * (R + RING / 2), [x, z] = XZ(u, s * (W + 0.025));
      S.box(x, z, water - 0.2, spring, RING, 0.05, ang, stone);
    }
  }

  // ---- laterite footing along both faces at the waterline (not under the vault) ----
  for (const s of [-1, 1]) for (const [a, b] of [[U0, u0a - 0.02], [u1a + 0.02, L]]) {
    const [x, z] = XZ((a + b) / 2, s * (W + PIL_P / 2 - 0.05));
    S.box(x, z, water - 0.4, water + 0.55, b - a, PIL_P + 0.1, ang, laterite);
  }

  // ---- pilasters framing the vault, up through the parapets, with stone caps ----
  const pil = [uc - R - RING - PIL_W / 2, uc + R + RING + PIL_W / 2];
  for (const u of pil) for (const s of [-1, 1]) {
    const H = s > 0 ? OUT_H : IN_H, T = s > 0 ? OUT_T : IN_T;
    const v = s * (W - T / 2 + PIL_P / 2), [x, z] = XZ(u, v), top = yD(u) + H + 0.12;
    S.box(x, z, water + 0.55, top, PIL_W, T + PIL_P, ang, brickD);
    S.box(x, z, top, top + 0.16, PIL_W + 0.14, T + PIL_P + 0.14, ang, stoneL);
  }

  // ---- parapets: the outer one with its 13 round gun ports, the inner one with the two gate posts ----
  const ports = [];
  for (let k = 0; k < PORTS; k++) {
    let u = U0 + ((L - U0) * (k + 1)) / (PORTS + 1);
    for (const p of pil) if (Math.abs(u - p) < PIL_W / 2 + PORT_R + 0.15) u = p + Math.sign(u - uc || 1) * (PIL_W / 2 + PORT_R + 0.3);
    ports.push({ u: u - U0, r: PORT_R, yc: yD(u) + 0.85 });
  }
  const along = (v) => ({ p0: XZ(U0, v), dir: t, len: L - U0 });
  const yP = (u) => yD(u + U0);
  pierced(S, along(W - OUT_T / 2), OUT_T, (u) => yP(u) - 0.02, (u) => yP(u) + OUT_H, ports, brickD, stone);
  pierced(S, along(-W + IN_T / 2), IN_T, (u) => yP(u) - 0.02, (u) => yP(u) + IN_H, [], brickD, stone);
  for (const e of [-1, 1]) {
    const u = uc + e * (R - 1.0), [x, z] = XZ(u, -W + 0.27), y = yD(u);
    S.box(x, z, y, y + 1.9, 0.54, 0.54, ang, stoneL, { top: stone });
  }

  // ---- the south-east gate posts: square shafts on a plinth, a moulded cap and a ball finial ----
  const posts = [[U0, POST_V], [U0 - POST_GAP, POST_V]].map(([u, v]) => XZ(u, v));
  for (const [x, z] of posts) {
    const g = groundY(x, z) - 0.2;
    S.box(x, z, g, g + 0.6, 1.25, 1.25, ang, stoneD);
    S.box(x, z, g + 0.6, g + 3.8, 1.0, 1.0, ang, shade(PAL.brick, 0.95));
    S.box(x, z, g + 3.5, g + 3.8, 1.06, 1.06, ang, stoneL); // the pale plastered band under the cap
    S.box(x, z, g + 3.8, g + 3.95, 1.22, 1.22, ang, stoneL);
    S.box(x, z, g + 3.95, g + 4.15, 1.05, 1.05, ang, stone);
    S.cyl(x, z, g + 4.15, g + 4.3, 0.16, 0.14, 10, stone, { cap: false });
    const BR = 0.3, yb = g + 4.3 + BR; // the ball, as stacked bands
    for (let k = 0; k < 6; k++) {
      const a0 = -Math.PI / 2 + (Math.PI * k) / 6, a1 = -Math.PI / 2 + (Math.PI * (k + 1)) / 6;
      S.cyl(x, z, yb + BR * Math.sin(a0), yb + BR * Math.sin(a1), BR * Math.cos(a0) + 0.01, BR * Math.cos(a1) + 0.01, 12, stoneL, { cap: k === 5 });
    }
  }

  // ---- the feet: short walls from each end of the bridge to the rampart's end, each with its small arched door;
  // at the south-east the wall breaks between the gate posts ----
  for (const [k, wall] of WALL_ENDS.entries()) {
    const uF = k === 0 ? U0 : L, yF = yD(uF);
    const foot = XZ(uF, W - 0.6);
    const legs = k === 0 ? [[foot, posts[0], true], [posts[1], wall, false]] : [[foot, wall, true]];
    if (Math.hypot(wall[0] - foot[0], wall[1] - foot[1]) > 24) continue; // the rampart has moved in the data: leave the gap
    for (const [p, q, withDoor] of legs) {
      const dx = q[0] - p[0], dz = q[1] - p[1], len = Math.hypot(dx, dz);
      if (len < 1.5) continue;
      const dir = [dx / len, dz / len];
      const yb = () => bed, top = () => yF + 2.6;
      const doors = withDoor ? [{ u: len / 2, r: 0.4, yc: yF - 0.42 + 0.9, y0: bed }] : [];
      pierced(S, { p0: p, dir, len }, k === 0 ? 0.9 : 1.2, yb, top, doors, brick, stone);
    }
  }

  S.kind = KIND.PLAIN;
}

// A straight wall of thickness T along a line (p0, dir, len), its foot at yb(u) and its top at yt(u) (u along the
// line), pierced by round openings { u, r, yc } or round-headed doors { u, r, yc, y0 } (open from y0 up to the
// half circle springing at yc). Faces in col, the top in topCol.
function pierced(S, { p0, dir, len }, T, yb, yt, holes, col, topCol) {
  const nrm = [-dir[1], dir[0]];
  const P = (u, v, y) => [p0[0] + dir[0] * u + nrm[0] * v, y, p0[1] + dir[1] * u + nrm[1] * v];
  const hv = T / 2;
  const cuts = [0, len];
  for (let u = 1; u < len; u += 1) cuts.push(u);
  for (const h of holes) for (let k = -8; k <= 8; k++) cuts.push(h.u + (h.r * k) / 8);
  const us = [...new Set(cuts.map((u) => Math.round(clamp(u, 0, len) * 1e4) / 1e4))].sort((a, b) => a - b);
  // the open interval at u (one hole at most), or null
  const open = (u) => {
    for (const h of holes) {
      const dx = u - h.u;
      if (Math.abs(dx) >= h.r) continue;
      const c = Math.sqrt(h.r * h.r - dx * dx);
      return [h.y0 !== undefined ? h.y0 : h.yc - c, h.yc + c];
    }
    return null;
  };
  const n3 = [nrm[0], 0, nrm[1]], d3 = [dir[0], 0, dir[1]];
  const strip = (a, b, ya0, yb0, ya1, yb1, kind) => {
    // a solid piece from (ya0, yb0) at its foot to (ya1, yb1) at its top, both faces
    for (const s of [-1, 1]) S.quad(P(a, s * hv, ya0), P(b, s * hv, yb0), P(b, s * hv, yb1), P(a, s * hv, ya1), col, [n3[0] * s, 0, n3[2] * s]);
    if (kind & 1) S.quad(P(a, -hv, ya1), P(b, -hv, yb1), P(b, hv, yb1), P(a, hv, ya1), kind & 4 ? topCol : col, [0, 1, 0]);
    if (kind & 2) S.quad(P(a, -hv, ya0), P(b, -hv, yb0), P(b, hv, yb0), P(a, hv, ya0), col, [0, -1, 0]);
  };
  for (let i = 0; i + 1 < us.length; i++) {
    const a = us[i], b = us[i + 1];
    if (b - a < 1e-4) continue;
    const o = open((a + b) / 2);
    if (!o) { strip(a, b, yb(a), yb(b), yt(a), yt(b), 5); continue; }
    if (o[0] > Math.max(yb(a), yb(b)) + 1e-3) strip(a, b, yb(a), yb(b), o[0], o[0], 1); // below the opening, its sill
    strip(a, b, o[1], o[1], yt(a), yt(b), 2 | 5); // above it, the soffit
  }
  // the opening's sides where it widens or narrows between slices, and the wall's two ends
  const sideFace = (u, y0, y1, s) => { if (y1 - y0 > 1e-3) S.quad(P(u, -hv, y0), P(u, hv, y0), P(u, hv, y1), P(u, -hv, y1), col, [d3[0] * s, 0, d3[2] * s]); };
  for (let i = 1; i + 1 < us.length; i++) {
    const u = us[i], oa = open((us[i - 1] + u) / 2), ob = open((u + us[i + 1]) / 2);
    if (!oa && !ob) continue;
    const lo = yb(u), hi = yt(u);
    // solid on the far side but open on the near side: a face looking back into the opening
    const minus = (x, y) => { // x minus y, intervals clipped to the wall
      if (!x) return [];
      if (!y) return [[x[0], x[1]]];
      const out = [];
      if (y[0] > x[0]) out.push([x[0], Math.min(x[1], y[0])]);
      if (y[1] < x[1]) out.push([Math.max(x[0], y[1]), x[1]]);
      return out;
    };
    for (const [y0, y1] of minus(oa, ob)) sideFace(u, clamp(y0, lo, hi), clamp(y1, lo, hi), -1);
    for (const [y0, y1] of minus(ob, oa)) sideFace(u, clamp(y0, lo, hi), clamp(y1, lo, hi), 1);
  }
  sideFace(0, yb(0), yt(0), -1);
  sideFace(len, yb(len), yt(len), 1);
}
