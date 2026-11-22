import { KIND, hex, shade, inRing, unflat, pathLength } from '../../geo/buf.js';
import { PAL, LAND_Y } from '../../config.js';
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
// Seen in Google Street View (car panoramas on the deck, on Chi Lăng and on Bạch Đằng, 2024-25; visual reference
// only, captures kept out of the repo) and checked against the satellite (deck outline and axis match, about 50 deg):
//  - balustrade: pale grey openwork panels (vertical bars with interlocking rings) between capped square pilasters
//    about 3 m apart; drawn as bays with a top and bottom rail, bars every 0.34 m and two rings per cell;
//  - the NW parapet does not stop at the Chi Lăng end: it turns left onto the quay and becomes the quay railing; the
//    first ~13 m of that are drawn here, following the quay edge;
//  - ornamental bronze lamps with four globes on cross arms and one on top at the deck corners, the NE-NW one at the
//    end of that curved wing parapet; tall twin-arm lights on the median; low concrete separator blocks along the NW
//    carriageway;
//  - under the deck: bents of square columns under a cap beam (not wall piers), a plain grey fascia and a large water
//    main hung along the NW side.
// Not drawn: Street View shows a segmental arch through the SW (market-side) abutment over the quay walk, with a
// sloping approach wall; that needs a higher deck and longer west approach in geo/bridges.js (owner question). The
// deck rise is still the estimate above; it lives in geo/bridges.js so traffic and lamp posts in life.js ride the
// same curve, and those generic lamp posts still stand on the deck beside the bridge's own lights.

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

  // colours: Street View (2024-25) shows a pale grey balustrade, a grey concrete fascia and columns, grey concrete
  // footways; the city's road surface on the carriageways
  const asphalt = hex(PAL.road[2]);
  const walk = hex('#c9c5bb'), kerb = hex('#b9b5ab');
  const concrete = hex('#a3a49c'), soffit = shade(hex('#9a998f'), 0.8), pierCol = hex('#a7a69d');
  const rail = hex('#dcddd8'), railD = shade(rail, 0.86), stone = hex('#9d9586');
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

  // piers: bents of four square columns under a cap beam, from below the water to the girders (Street View from
  // Bạch Đằng, 2024-25, shows open rows of square columns under a plain girder deck, not wall piers)
  const ang = Math.atan2(n[1], n[0]); // box local x across the bridge
  for (const u of piers) {
    const [x, z] = XZ(u, C), top = Math.min(yAt(u, V0), yAt(u, V1)) - 1.4;
    S.box(x, z, top, top + 0.42, HALF * 2 - 0.6, 1.1, ang, pierCol, { bottom: true });
    for (const g of [-7.8, -2.6, 2.6, 7.8]) {
      const [cx, cz] = XZ(u, C + g);
      S.box(cx, cz, water - 2.5, top, 0.7, 0.7, ang, pierCol);
      S.box(cx, cz, water - 0.1, water + 0.35, 0.76, 0.76, ang, shade(pierCol, 0.72)); // the tide mark
    }
  }
  // a water main slung under the north-west footway (Street View from Bạch Đằng shows a large pipe under the deck,
  // dipping into the bank at the market end); octagonal, 0.8 m across, from abutment to abutment
  {
    const vP = V1 - 1.3, rP = 0.4, SEG = 8, uA = bankE - 1.0, uB = bankW + 1.0, NP = 32;
    const pipeCol = hex('#8f918b');
    const ring = (u) => { const [x, z] = XZ(u, vP), yc = yAt(u, vP) - 1.0 - rP - 0.05; return [...Array(SEG)].map((_, i) => { const a = (i / SEG) * Math.PI * 2, c = Math.cos(a) * rP, sn = Math.sin(a) * rP; return [x + n[0] * c, yc + sn, z + n[1] * c]; }); };
    let prev = ring(uA);
    for (let i = 1; i <= NP; i++) {
      const cur = ring(uA + ((uB - uA) * i) / NP);
      for (let k = 0; k < SEG; k++) {
        const k2 = (k + 1) % SEG, a = (k + 0.5) / SEG * Math.PI * 2;
        S.quad(prev[k], prev[k2], cur[k2], cur[k], pipeCol, [n[0] * Math.cos(a), Math.sin(a), n[1] * Math.cos(a)]);
      }
      prev = cur;
    }
  }
  // abutments: stone-faced walls under each deck end (one under each half, should the halves end apart), reaching
  // ABUT under the deck and as far back under the street, which on a staggered way may begin over the water's edge;
  // the city's quay walls meet them
  for (const [va, vb] of [[V0 - 0.3, vMid], [vMid, V1 + 0.3]]) for (const [k, inward] of [[0, 1], [1, -1]]) {
    const vc = (va + vb) / 2, u0 = endAt(vc, k), [x, z] = XZ(u0, vc);
    const top = Math.min(yAt(u0 + inward * ABUT, va), yAt(u0 + inward * ABUT, vb)) - 0.72;
    S.box(x, z, water - 2.5, top, vb - va, ABUT * 2, ang, stone, { top: concrete });
  }

  // balustrade (Street View, 2024-25): pale grey pierced panels, cast scrollwork between square pilasters with
  // capped heads about 3 m apart, on the parapet plinth. The scrolls are drawn as a lattice of slender bars and small
  // rings, double-faced so the openwork reads from both sides. A bay runs between two plinth-top points A and B.
  const pilaster = ([x, y, z], w, a) => {
    S.box(x, z, y, y + 1.0, w, w, a, rail);
    S.box(x, z, y + 1.0, y + 1.08, w + 0.1, w + 0.1, a, railD);
    S.box(x, z, y + 1.08, y + 1.2, w + 0.04, w + 0.04, a, rail, { taper: 0.55 });
  };
  const CELL = 0.25;
  const bay = (A, B) => {
    const ex = B[0] - A[0], ez = B[2] - A[2], L = Math.hypot(ex, ez), e = [ex / L, ez / L], slope = (B[1] - A[1]) / L;
    const nv = [-e[1], 0, e[0]], nb = [e[1], 0, -e[0]];
    const Q = (sv, h) => [A[0] + e[0] * sv, A[1] + slope * sv + h, A[2] + e[1] * sv];
    const strip = (pts2, w) => {
      for (let i = 0; i + 1 < pts2.length; i++) {
        const [sa, ha] = pts2[i], [sb, hb] = pts2[i + 1], l2 = Math.hypot(sb - sa, hb - ha) || 1;
        const os = (-(hb - ha) / l2) * (w / 2), oh = ((sb - sa) / l2) * (w / 2);
        const q = [Q(sa - os, ha - oh), Q(sb - os, hb - oh), Q(sb + os, hb + oh), Q(sa + os, ha + oh)];
        S.quad(...q, rail, nv); S.quad(...q, rail, nb);
      }
    };
    const ring = (sc, hc, r) => [...Array(7)].map((_, i) => { const t = (i / 6) * Math.PI * 2 + Math.PI / 2; return [sc + Math.cos(t) * r * 0.8, hc + Math.sin(t) * r]; });
    const a = Q(0, 0), b = Q(L, 0);
    S.beam([a[0], a[1] + 0.9, a[2]], [b[0], b[1] + 0.9, b[2]], 0.24, 0.12, rail); // top rail
    S.beam([a[0], a[1] + 0.08, a[2]], [b[0], b[1] + 0.08, b[2]], 0.12, 0.08, railD); // bottom rail
    const p0 = 0.2, p1 = L - 0.2, nc = Math.max(1, Math.round((p1 - p0) / CELL)), cw = (p1 - p0) / nc;
    for (let k = 0; k <= nc; k++) {
      const sv = p0 + cw * k;
      if (k % 2 === 0) strip([[sv, 0.12], [sv, 0.85]], 0.03);
      if (k === nc) break;
      // three rows of small rings plus a cross scroll between them: the cast panel reads dense, not barred
      for (const hc of [0.27, 0.48, 0.69]) strip(ring(sv + cw / 2, hc, cw * 0.42), 0.022);
      strip([[sv, 0.38], [sv + cw, 0.58]], 0.018);
    }
  };
  const BAY = 3.0;
  for (const v of [V0 + 0.15, V1 - 0.15]) {
    const u0 = endAt(v, 0) + 0.3, u1 = endAt(v, 1) - 0.3;
    const nBay = Math.max(2, Math.round((u1 - u0) / BAY));
    const at = (u) => { const [x, z] = XZ(u, v); return [x, yAt(u, v) + 0.3, z]; };
    for (let i = 0; i <= nBay; i++) pilaster(at(u0 + ((u1 - u0) * i) / nBay), i === 0 || i === nBay ? 0.48 : 0.32, ang);
    for (let i = 0; i < nBay; i++) bay(at(u0 + ((u1 - u0) * i) / nBay), at(u0 + ((u1 - u0) * (i + 1)) / nBay));
  }
  // at the Chi Lăng end the north-west parapet does not stop at the deck: it curves round the quay corner and runs on
  // north along the water as the quay's railing (Street View on the deck and from Chi Lăng). Drawn for 13 m: a quarter
  // turn from the bridge's bearing to the quay's, held on the water's edge, on a low plinth at street level.
  const landXZ = (x, z) => rise(x, z) > 0.05 || onLand(data, x, z);
  const wing = [];
  {
    const vW = V1 - 0.15, uE = endAt(vW, 0) + 0.3;
    let [x, z] = XZ(uE, vW), d = [-t[0], -t[1]];
    const b0 = Math.atan2(d[0], -d[1]), b1 = b0 - (52 * Math.PI) / 180;
    for (let sv = 0; sv <= 13.01; sv += 0.5) {
      if (sv > 0) {
        const b = b0 + (b1 - b0) * Math.min(1, sv / 7.5);
        d = [Math.sin(b), -Math.cos(b)];
        x += d[0] * 0.5; z += d[1] * 0.5;
        // hold the line on the quay edge: the water lies to the left (west) of the path
        const lw = [d[1], -d[0]];
        let best = null;
        for (let k = -2.5; k <= 2.5; k += 0.25) if (landXZ(x + lw[0] * k, z + lw[1] * k) && !landXZ(x + lw[0] * (k + 0.25), z + lw[1] * (k + 0.25))) { if (best === null || Math.abs(k) < Math.abs(best)) best = k; }
        if (best !== null) { x += lw[0] * (best - 0.2); z += lw[1] * (best - 0.2); }
      }
      wing.push([x, z]);
    }
  }
  {
    const yEnd = yAt(endAt(V1 - 0.15, 0) + 0.3, V1 - 0.15);
    const pts = [];
    for (let i = 0; i < wing.length; i += 5) pts.push(wing[i]);
    if ((wing.length - 1) % 5) pts.push(wing[wing.length - 1]);
    const P = pts.map(([x, z], i) => [x, Math.max(i ? LAND_Y + rise(x, z) + 0.06 : yEnd, LAND_Y + rise(x, z) + 0.06) + 0.3, z]);
    for (let i = 0; i + 1 < P.length; i++) {
      const A = P[i], B = P[i + 1];
      S.beam([A[0], A[1] - 0.15, A[2]], [B[0], B[1] - 0.15, B[2]], 0.34, 0.3, railD); // the plinth
      bay(A, B);
    }
    for (let i = 1; i < P.length; i++) { const A = P[i - 1], B = P[i]; pilaster(B, i === P.length - 1 ? 0.48 : 0.32, Math.atan2(B[2] - A[2], B[0] - A[0])); }
  }

  // ornamental lamp standards at the four corners of the deck: a dark bronze cast post with four globes on a cross
  // arm and one on top (Street View from Chi Lăng, Bạch Đằng and the park); they stand on the footway at the parapet
  const globe = hex('#f2f0e8'), bronze = hex('#5e4636');
  const globeAt = (x, y, z, r) => { S.cyl(x, z, y - r, y, r * 0.55, r, 8, globe, { cap: false }); S.cyl(x, z, y, y + r, r, r * 0.25, 8, globe); };
  // (the north-west one at the Chi Lăng end stands where the parapet's curve meets the quay, as Street View shows)
  const lampAt = [[V0 + 0.75, 0], [V0 + 0.75, 1], [V1 - 0.75, 1]].map(([v, k]) => { const u = endAt(v, k) + (k ? -0.9 : 0.9); return [...XZ(u, v), yAt(u, v) + 0.18, u, v]; });
  {
    const i = Math.min(15, wing.length - 2), [ax, az] = wing[i - 1], [bx, bz] = wing[i + 1], l = Math.hypot(bx - ax, bz - az);
    const x = wing[i][0] - ((bz - az) / l) * 0.7, z = wing[i][1] + ((bx - ax) / l) * 0.7;
    lampAt.push([x, z, LAND_Y + rise(x, z) + 0.06, null, null]);
  }
  for (const [x, z, y, u, v] of lampAt) {
    S.box(x, z, y, y + 0.9, 0.42, 0.42, ang, bronze, { taper: 0.7 });
    S.cyl(x, z, y + 0.9, y + 4.1, 0.1, 0.07, 8, bronze);
    S.box(x, z, y + 4.05, y + 4.12, 1.15, 0.07, ang, bronze);
    S.box(x, z, y + 4.05, y + 4.12, 0.07, 1.15, ang, bronze);
    for (const [du, dv] of [[0.55, 0], [-0.55, 0], [0, 0.55], [0, -0.55]]) globeAt(x + t[0] * du + n[0] * dv, y + 4.42, z + t[1] * du + n[1] * dv, 0.2);
    S.cyl(x, z, y + 4.1, y + 4.55, 0.06, 0.06, 6, bronze);
    globeAt(x, y + 4.82, z, 0.22);
  }
  // tall twin-arm street lights on the median (Street View from Chi Lăng and the park)
  const poleCol = hex('#9ea2a3');
  for (const f of [0.18, 0.5, 0.82]) {
    const u = uOf(f, C), [x, z] = XZ(u, C), y = yAt(u, C) + 0.18;
    S.cyl(x, z, y, y + 9.0, 0.13, 0.07, 8, poleCol);
    for (const s of [-1, 1]) {
      const [ax, az] = XZ(u, C + s * 1.6), [bx, bz] = XZ(u, C + s * 2.3);
      S.beam([x, y + 8.4, z], [ax, y + 9.1, az], 0.07, 0.07, poleCol);
      S.beam([ax, y + 9.1, az], [bx, y + 9.15, bz], 0.07, 0.07, poleCol);
      S.box(bx, bz, y + 8.98, y + 9.13, 0.75, 0.3, ang, poleCol);
    }
  }
  // concrete traffic separators on the north-west carriageway, a motorbike lane's width off the footway kerb
  // (Street View on the deck and from Chi Lăng, 2025): 1.2 m blocks with gaps
  {
    const v = V1 - 2.1 - 1.9;
    for (let u = uOf(0.04, v) + 0.6; u < uOf(0.96, v) - 0.6; u += 2.4) {
      const [x, z] = XZ(u, v), y = yAt(u, v);
      S.box(x, z, y, y + 0.5, 0.45, 1.2, ang, hex('#c7c5bd'), { taper: 0.6 });
    }
  }
  S.kind = KIND.PLAIN;
}
