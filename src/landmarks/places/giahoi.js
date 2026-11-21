import { KIND, hex, shade, inRing, unflat, pathLength } from '../../geo/buf.js';
import { PAL } from '../../config.js';
import { rise, waterY } from '../../geo/terrain.js';
import { bridgeProfiles, onLand, ABUT } from '../../geo/bridges.js';

// ---- Cầu Gia Hội: the road bridge over sông Đông Ba between Trần Hưng Đạo (the Đông Ba market side) and Chi Lăng
// (the old Gia Hội street) ----
//
// What the sources say (fetched Nov 2026):
//  - OpenStreetMap: way 1431132258 (man_made=bridge, layer 1) outlines the structure, about 57 m long and 21 m
//    wide; two parallel one-way carriageways, ways 482781198 and 631854507 (highway=tertiary, bridge=yes,
//    oneway=yes, surface=asphalt, name 嘉會橋), run across it about 9.5 m apart, centre to centre.
//  - huengaynay.vn/du-lich/di-san-van-hoa/khu-pho-co-hue-cau-gia-hoi-258.html: first built of wood; rebuilt in
//    stone under Thành Thái in 1904, 67 thước long; named Gia Hội by Minh Mạng in 1837 (earlier An Hội).
//  - vi.wikipedia.org/wiki/Sông_Đông_Ba and kienthuc.net.vn (post486354): one of three bridges built over the canal
//    in 1808 (An Hội, Đông Gia, Thanh Tước); "cầu Gia Hội và Đông Ba đã được xây mới": the bridge standing today
//    is a modern rebuild, not the 1904 stone one.
//  - nguoidothi.net.vn/dau-xua-gia-hoi-25412.html: it joins Trần Hưng Đạo (Phú Hòa) to Chi Lăng (Phú Cát); the
//    market and sông Hương are in view from it.
// The water under it (data.land) is about 45 m wide on the axis. The two OSM bridge ways do not end at the banks:
// on the market (west) side they run on ~20 m past the water, over the Huỳnh Thúc Kháng junction (which they cross
// without a shared node), to Trần Hưng Đạo; on the Chi Lăng side their ends are staggered by 4 m, one at the water's
// edge. Huỳnh Thúc Kháng runs at grade along the bank, so the structure is only the stretch over the water and its
// abutments (geo/bridges.js `water`: both ends square across the bridge, as the mapped outline's are, and inside both
// ways; on the west bank Huỳnh Thúc Kháng's carriageway reaches to within about a metre of the water, so the
// abutment stops at its kerb and the deck's raised footways, median and parapet ends no longer stand on it), and the ways run on as street from there (geo/city.js lays them with the other roads). The deck ends at
// street level exactly where city.js starts that street, square across the same way: deck and road meet edge to
// edge and flush. (The old model ran the deck to the ways' own ends: skewed 23 degrees by the stagger, so neither
// approach road's square end lined up with it, and raised as a filled ramp across Huỳnh Thúc Kháng.)
//
// The vertical profile: a 2.0 m crown over the street at the abutments, a smooth hump (level where it meets the
// street) over the ~46-49 m between them. No survey or elevation was found (searches of Vietnamese press and
// travel pages, Nov 2026, turned up no clearance figure or usable side photo); the rise is an estimate:
//  - it is visibly humped, more than the 1.1 m camber modelled before (local observation passed on by the user);
//  - the streets on both banks lie ~1.3 m above the canal (POND_Y); a ~1 m girder deck leaves ~2.5-3 m of headroom
//    under a 2 m crown, enough for the sampans and tour boats that use sông Đông Ba, and almost none at the banks;
//  - 2 m over ~24 m to the crown is an 8 % average grade, steep but usual for the old city's short canal bridges.
//
// NOT confirmed (no description or usable photo of today's bridge was found):
//  - the structure: drawn as a low reinforced-concrete girder bridge of three ~15 m spans on two wall piers with
//    rounded cutwaters, solid abutments at the banks;
//  - the cross-section: 2 x 7 m carriageways, a 2 m raised median, 1.8 m footways, concrete balustrade (posts
//    about 2.2 m apart, two rails, newel posts at the ends and over the abutments) painted off-white;
//  - the deck rise (above); it lives in geo/bridges.js so traffic and lamp posts in life.js ride the same curve;
//  - lamps: the generic street lamp posts life.js puts on these class-2 roads stand on the deck; no special
//    bridge lighting is known, so none is added.

export const id = 'giahoi';
const NAME = 'Cầu Gia Hội';

// The two carriageways (data.roads entries) that cross the mapped outline: geo/city.js leaves their slabs to this
// model. Same test as geo/bridges.js: the road's middle inside the outline.
const own = new WeakMap();
export function ownRoads(data) {
  if (own.has(data)) return own.get(data);
  const out = new Set();
  own.set(data, out);
  const q = (data.bridges || []).find((b) => b.n === NAME);
  if (!q) return out;
  const ring = unflat(q.ring);
  for (const r of data.roads || []) {
    if (!Array.isArray(r) || !r[1] || !Array.isArray(r[2]) || r[2].length < 4) continue;
    const pts = unflat(r[2]), a = pts[0], e = pts[pts.length - 1];
    if (inRing((a[0] + e[0]) / 2, (a[1] + e[1]) / 2, ring)) out.add(r[2]);
  }
  return out;
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function build({ data, S }) {
  const flats = [...ownRoads(data)];
  if (flats.length < 1) throw new Error('Gia Hội carriageways not found');
  const profiles = bridgeProfiles(data);
  const roads = flats.map((f) => { const pts = unflat(f); return { pts, len: pathLength(pts), P: profiles.get(f) }; }).filter((r) => r.P);
  if (!roads.length) throw new Error('Gia Hội deck profile missing');

  // the axis: from the Chi Lăng (east) end to the market (west) end, midway between the carriageways
  const ends = roads.map((r) => [r.pts[0], r.pts[r.pts.length - 1]]);
  const ref = ends[0];
  const dir0 = [ref[1][0] - ref[0][0], ref[1][1] - ref[0][1]];
  const east = [], west = [];
  for (const [a, b] of ends) {
    const fwd = (b[0] - a[0]) * dir0[0] + (b[1] - a[1]) * dir0[1] > 0;
    const [p, q] = fwd ? [a, b] : [b, a];
    east.push(p); west.push(q);
  }
  const avg = (ps) => [ps.reduce((s, p) => s + p[0], 0) / ps.length, ps.reduce((s, p) => s + p[1], 0) / ps.length];
  let m0 = avg(east), m1 = avg(west);
  if (m0[0] < m1[0]) [m0, m1] = [m1, m0]; // keep u running from the east bank westward
  const L = Math.hypot(m1[0] - m0[0], m1[1] - m0[1]);
  const t = [(m1[0] - m0[0]) / L, (m1[1] - m0[1]) / L], n = [-t[1], t[0]];
  const UV = (x, z) => [(x - m0[0]) * t[0] + (z - m0[1]) * t[1], (x - m0[0]) * n[0] + (z - m0[1]) * n[1]];
  const XZ = (u, v) => [m0[0] + t[0] * u + n[0] * v, m0[1] + t[1] * u + n[1] * v];

  // each carriageway's offset across the axis and its deck height at a point
  for (const r of roads) {
    const a = UV(...r.pts[0]), b = UV(...r.pts[r.pts.length - 1]);
    r.v = (a[1] + b[1]) / 2;
    r.ua = Math.min(a[0], b[0]); r.ub = Math.max(a[0], b[0]);
    r.rev = a[0] > b[0];
    // the structure's ends on this way (its profile's span; the whole way if it has none)
    const sp = r.P.span || [0, r.len], uOfS = (s) => (r.rev ? r.ub - s : r.ua + s);
    r.ea = Math.min(uOfS(sp[0]), uOfS(sp[1])); r.eb = Math.max(uOfS(sp[0]), uOfS(sp[1]));
  }
  roads.sort((a, b) => a.v - b.v);
  const lo = roads[0], hi = roads[roads.length - 1];
  const yRoad = (r, u) => { const s = clamp(r.rev ? r.ub - u : u - r.ua, 0, r.len); return r.P.y(s); };
  const yAt = (u, v) => {
    if (lo === hi) return yRoad(lo, u);
    const w = clamp((v - lo.v) / (hi.v - lo.v), 0, 1);
    return yRoad(lo, u) * (1 - w) + yRoad(hi, u) * w;
  };
  const vMid = (lo.v + hi.v) / 2;
  // each half of the deck ends square across its own carriageway, at that way's abutment (k 0 east, 1 west)
  const endAt = (v, k) => { const r = v < vMid ? lo : hi; return k ? r.eb : r.ea; };
  const HALF = 10.5; // OSM outline ~21 m wide
  const V0 = vMid - HALF, V1 = vMid + HALF;

  // where the water is (banks): first and last axis point off land, measured on the mid line
  const isLand = (u, v) => { const [x, z] = XZ(u, v); return rise(x, z) > 0.05 || onLand(data, x, z); };
  let bankE = 0.5, bankW = 46;
  {
    const u0 = Math.max(lo.ea, hi.ea), u1 = Math.min(lo.eb, hi.eb);
    let first = null, last = null;
    for (let u = u0; u <= u1; u += 0.5) if (!isLand(u, vMid)) { if (first === null) first = u; last = u; }
    if (first !== null && last - first > 10) { bankE = Math.max(first, u0 + 1.2); bankW = last; }
  }
  const water = waterY(...XZ((bankE + bankW) / 2, vMid));
  const spanN = 3, spanL = (bankW - bankE) / spanN;
  const piers = []; for (let k = 1; k < spanN; k++) piers.push(bankE + spanL * k);

  // colours (estimated): off-white balustrade, weathered concrete, the city's road surface on the carriageways
  const asphalt = hex(PAL.road[2]);
  const walk = hex('#cfc6b6'), kerb = hex('#bdb4a3');
  const concrete = hex('#b4ac9d'), soffit = shade(hex('#a59c8b'), 0.8), pierCol = PAL.pier;
  const rail = hex('#e7e2d6'), railD = shade(rail, 0.86), stone = hex('#9d9586');

  S.kind = KIND.PLAIN;
  S.base = 0;
  const NU = 48;
  const P3 = (f, v, dy = 0) => { const u = endAt(v, 0) + (endAt(v, 1) - endAt(v, 0)) * f; const [x, z] = XZ(u, v); return [x, yAt(u, v) + dy, z]; };
  const uOf = (f, v) => endAt(v, 0) + (endAt(v, 1) - endAt(v, 0)) * f;
  // a band of the deck between two offsets, raised by dy, with its kerb faces
  const band = (va, vb, dy, col, kerbs = false) => {
    if (va < vMid - 1e-6 && vb > vMid + 1e-6) { band(va, vMid, dy, col); band(vMid, vb, dy, col); if (!kerbs || dy <= 0) return; kerbs = 'only'; }
    for (let i = 0; i < NU; i++) {
      if (kerbs === 'only') { // a band split at the axis: its kerb faces, each on its own half
        if (dy <= 0) break;
        const nv = [n[0], 0, n[1]], f0 = i / NU, f1 = (i + 1) / NU;
        S.quad(P3(f0, va, 0), P3(f1, va, 0), P3(f1, va, dy), P3(f0, va, dy), kerb, [-nv[0], 0, -nv[2]]);
        S.quad(P3(f0, vb, 0), P3(f1, vb, 0), P3(f1, vb, dy), P3(f0, vb, dy), kerb, nv);
        continue;
      }
      const f0 = i / NU, f1 = (i + 1) / NU;
      S.quad(P3(f0, va, dy), P3(f0, vb, dy), P3(f1, vb, dy), P3(f1, va, dy), col, [0, 1, 0]);
      if (kerbs && dy > 0) {
        const nv = [n[0], 0, n[1]];
        S.quad(P3(f0, va, 0), P3(f1, va, 0), P3(f1, va, dy), P3(f0, va, dy), kerb, [-nv[0], 0, -nv[2]]);
        S.quad(P3(f0, vb, 0), P3(f1, vb, 0), P3(f1, vb, dy), P3(f0, vb, dy), kerb, nv);
      }
    }
  };
  const C = vMid;
  // footways, carriageways and the median (2 x 7 m roadway, 2 m median, 1.8 m footways inside 0.3 m parapet plinths)
  band(V0 + 0.3, V0 + 2.1, 0.18, walk, true);
  band(V0 + 2.1, C - 1.0, 0, asphalt);
  band(C - 1.0, C + 1.0, 0.18, walk, true);
  band(C + 1.0, V1 - 2.1, 0, asphalt);
  band(V1 - 2.1, V1 - 0.3, 0.18, walk, true);
  // lane paint: a dashed edge line by each kerb
  const paint = hex('#f1ece0');
  for (const v of [V0 + 2.35, C - 1.25, C + 1.25, V1 - 2.35]) for (let i = 1; i < NU - 1; i += 2) S.quad(P3(i / NU, v - 0.07, 0.02), P3(i / NU, v + 0.07, 0.02), P3((i + 1) / NU, v + 0.07, 0.02), P3((i + 1) / NU, v - 0.07, 0.02), paint, [0, 1, 0]);

  // the deck's edge beams and underside: a 1.0 m girder depth; at the abutments it sinks into the bank
  const bottomAt = (u, v) => yAt(u, v) - 1.0;
  for (const [v, sgn] of [[V0, -1], [V1, 1]]) {
    const nv = [n[0] * sgn, 0, n[1] * sgn];
    for (let i = 0; i < NU; i++) {
      const f0 = i / NU, f1 = (i + 1) / NU, u0 = uOf(f0, v), u1 = uOf(f1, v);
      const [x0, z0] = XZ(u0, v), [x1, z1] = XZ(u1, v);
      const y0 = yAt(u0, v), y1 = yAt(u1, v);
      // the parapet plinth's outer face continues the fascia up 0.3 m
      S.quad([x0, bottomAt(u0, v), z0], [x1, bottomAt(u1, v), z1], [x1, y1 + 0.3, z1], [x0, y0 + 0.3, z0], concrete, nv);
      // a drip line: the girder's lower flange reads as a slightly darker band
      S.quad([x0, y0 - 1.0, z0], [x1, y1 - 1.0, z1], [x1, y1 - 0.72, z1], [x0, y0 - 0.72, z0], shade(concrete, 0.82), nv);
    }
  }
  // parapet plinth tops and inner faces
  for (const [va, vb] of [[V0, V0 + 0.3], [V1 - 0.3, V1]]) band(va, vb, 0.3, railD, false);
  for (const [v, sgn] of [[V0 + 0.3, 1], [V1 - 0.3, -1]]) for (let i = 0; i < NU; i++) {
    const f0 = i / NU, f1 = (i + 1) / NU;
    S.quad(P3(f0, v, 0.18), P3(f1, v, 0.18), P3(f1, v, 0.3), P3(f0, v, 0.3), railD, [n[0] * sgn, 0, n[1] * sgn]);
  }
  // the underside: soffit between the edge beams, with four longitudinal girders below it, over each span
  for (const [va, vb] of [[V0, vMid], [vMid, V1]]) for (let i = 0; i < NU; i++) {
    const f0 = i / NU, f1 = (i + 1) / NU;
    const a = P3(f0, va, -0.72), b = P3(f0, vb, -0.72), c = P3(f1, vb, -0.72), d = P3(f1, va, -0.72);
    S.quad(a, b, c, d, soffit, [0, -1, 0]);
  }
  const step = 1.5;
  for (let k = 0; k < spanN; k++) {
    const ua = bankE + spanL * k + 0.7, ub = bankE + spanL * (k + 1) - 0.7;
    for (const g of [-7.5, -2.5, 2.5, 7.5]) {
      const v = C + g;
      for (let u = ua; u < ub - 1e-6; u += step) {
        const u2 = Math.min(ub, u + step), [x0, z0] = XZ(u, v), [x1, z1] = XZ(u2, v);
        S.beam([x0, yAt(u, v) - 1.15, z0], [x1, yAt(u2, v) - 1.15, z1], 0.5, 0.5, soffit);
      }
    }
  }

  // piers: a wall on a rounded cutwater at each end, under a cap beam, from below the water to the girders
  const ang = Math.atan2(n[1], n[0]); // box local x across the bridge
  for (const u of piers) {
    const [x, z] = XZ(u, C), top = Math.min(yAt(u, V0), yAt(u, V1)) - 1.4;
    S.box(x, z, top, top + 0.42, HALF * 2 - 0.6, 1.5, ang, pierCol, { bottom: true });
    S.box(x, z, water - 2.5, top, HALF * 2 - 3.6, 1.1, ang, pierCol);
    for (const s of [-1, 1]) {
      const [cx, cz] = XZ(u, C + s * (HALF - 1.8));
      S.cyl(cx, cz, water - 2.5, top, 0.55, 0.55, 10, pierCol, { cap: false });
    }
    // the tide mark on the piers
    S.box(x, z, water - 0.1, water + 0.35, HALF * 2 - 3.5, 1.16, ang, shade(pierCol, 0.72));
  }
  // abutments: stone-faced walls under each deck end (one under each half, should the halves end apart), reaching
  // ABUT under the deck and as far back under the street, which on a staggered way may begin over the water's edge;
  // the city's quay walls meet them
  for (const [va, vb] of [[V0 - 0.3, vMid], [vMid, V1 + 0.3]]) for (const [k, inward] of [[0, 1], [1, -1]]) {
    const vc = (va + vb) / 2, u0 = endAt(vc, k), [x, z] = XZ(u0, vc);
    const top = Math.min(yAt(u0 + inward * ABUT, va), yAt(u0 + inward * ABUT, vb)) - 0.72;
    S.box(x, z, water - 2.5, top, vb - va, ABUT * 2, ang, stone, { top: concrete });
  }

  // balustrade: square posts ~2.2 m apart, a moulded top rail and a lower rail, newel posts at the ends and over
  // the abutments and piers
  for (const v of [V0 + 0.15, V1 - 0.15]) {
    const u0 = endAt(v, 0) + 0.35, u1 = endAt(v, 1) - 0.35;
    const nPost = Math.max(2, Math.round((u1 - u0) / 2.2));
    const post = (u) => { const [x, z] = XZ(u, v); return [x, yAt(u, v) + 0.3, z]; };
    const newels = [u0, u1, ...piers];
    for (let i = 0; i <= nPost; i++) {
      const u = u0 + ((u1 - u0) * i) / nPost, [x, y, z] = post(u);
      if (newels.some((q) => Math.abs(q - u) < 1.0)) continue;
      S.box(x, z, y, y + 0.78, 0.18, 0.18, ang, rail);
    }
    for (const u of newels) {
      const [x, y, z] = post(u);
      S.box(x, z, y, y + 1.0, 0.42, 0.42, ang, rail);
      S.box(x, z, y + 1.0, y + 1.12, 0.52, 0.52, ang, railD, { taper: 0.75 });
    }
    for (let i = 0; i < nPost; i++) {
      const ua = u0 + ((u1 - u0) * i) / nPost, ub = u0 + ((u1 - u0) * (i + 1)) / nPost;
      const a = post(ua), b = post(ub);
      S.beam([a[0], a[1] + 0.84, a[2]], [b[0], b[1] + 0.84, b[2]], 0.24, 0.14, rail);
      S.beam([a[0], a[1] + 0.36, a[2]], [b[0], b[1] + 0.36, b[2]], 0.12, 0.1, railD);
    }
  }
  S.kind = KIND.PLAIN;
}
