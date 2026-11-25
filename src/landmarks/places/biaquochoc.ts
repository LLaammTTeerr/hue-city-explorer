import { KIND, hex, shade } from '../../geo/buf.ts';
import { LAND_Y, PAL } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { glowPoints } from '../../geo/materials.ts';
import { kylan } from '../props.ts';

// ---- Bia Quốc Học: Đài tưởng niệm Chiến sĩ trận vong (1920), on the south bank opposite Trường Quốc Học ----
// Replaces buildBiaQuocHoc (landmarks/memorial.js). Sources and estimates: docs/places/biaquochoc.md.
//
// Confirmed:
//  - a large roofed screen (bình phong), two tiers, on a base of two steps; a kim khánh plaque with a hanging medal
//    at the centre; dragon, qilin, 壽, tứ quý and fretwork in Nguyễn style (vi.wikipedia.org/wiki/Bia_Quốc_Học);
//  - one trụ biểu on each side (kienthuc.net.vn); a lan can round the base, steps, the trụ biểu restored 2016-17
//    (vietnamplus.vn, post415775);
//  - after restoration: painted a bright yellow, glazed tubular tiles, 67 lamps on roof, walls and pillars
//    (thuonghieucongluan.com.vn, a33134);
//  - 10.95 m overall, the trụ biểu 9.85 m, balustrade nearly 1.4 m (Tạp chí Sông Hương, as cited in the older
//    builder; the page has since moved);
//  - place: OSM node 5299153429, exactly on the axis of the school gate across Lê Lợi (the node → gate vector is the
//    gate's normal to within 1°), 37 m from the Lê Lợi sidewalk and 12 m in front of the riverside footway.
// Matched to Google imagery (satellite + two car panoramas, 2024): the terrace, inner platform and trụ biểu layout,
// the screen's width and tier proportions, the orientation (the satellite's walls agree with the gate normal to <1°).
// Colours follow the panoramas (weathered ochre, dark aged roofs, grey stone lan can), not the 2017 "bright yellow".
// Estimated: bay widths within the matched overall width, tile colour (only "glazed" is known), the pillar heads,
// the stairs at the back and ends, and the heights (the documented 10.95 m is kept from the plaza; the panorama reads
// ~15% taller, see the notes).

export const id = 'biaquochoc';

const FALLBACK_POS = [-675.1, 879.2]; // OSM memorial node (the satellite's terrace centre within ~1.5 m), metres (x east, z south), used if the place record is missing

// Plan (from the Google satellite and two car panoramas, 2024; docs/places/biaquochoc.md):
//  - an outer raised terrace ~31.4 m along the screen × 18.3 m deep, centred on the place point, lan can along its
//    edge, stairs at the front middle and at both ends;
//  - an inner platform ~19 × 7.5 m at the back of it carrying the screen, whose face stands ~2.5 m behind the centre;
//  - the two trụ biểu outside the terrace's front corners, ~36 m apart and ~10 m in front of the centre.
const TERRACE_HALF_D = 9.15;
const TERRACE_HALF_L = 15.7;
const SCREEN_A = -2.5;
const PLATFORM_A0 = -6.5;
const PLATFORM_A1 = 1.0;
const PLATFORM_HALF_L = 9.5;
const PILLAR_A = 10.3;
const PILLAR_B = 18.3;
const SCREEN_THICK = 1.1;
const SCREEN_PLINTH = 0.95;
const SIDE_BAY = { w: 4.4, h: 3.8, centerB: 3.0 + 4.4 / 2 };
const CENTER_BAY = { w: 6.0, h: 4.1 };
const UPPER_TIER = { w: 3.2, h: 1.8 };
const MEMORIAL_TOTAL_H = 10.95;

// Weathered limestone-ochre / pale stone finish with deep cobalt-blue ceramic panels and grey stone lan can
const COLORS = {
  yellow: hex('#c9be9e'),
  yellowDark: hex('#aea386'),
  trim: hex('#ded6c0'),
  panel: hex('#b8ad90'),
  roof: hex('#6e5546'),
  ridge: hex('#947d64'),
  slab: hex('#685649'),
  tablet: hex('#cfc6b0'),
  dark: hex('#3a302a'),
  pillar: hex('#cbc1a4'),
  blue: hex('#3c6692'),
  pave: hex('#d2cdc0'),
  bronze: hex('#9a7e45'),
  railStone: hex('#aba69c'),
  railPanel: hex('#5c5952'),
};
const LAMP_WARM: [number, number, number] = [1, 0.8, 0.45];
const LAMP_PILLAR: [number, number, number] = [1, 0.85, 0.55];

function resolveOrientation(data, center) {
  // Facing: toward the school gate (the river behind), square to the gate's facade when the two roughly agree.
  let fwd = [-Math.sin(Math.PI / 8), Math.cos(Math.PI / 8)];
  const gate = data?.quocHocGate;
  if (gate && Array.isArray(gate.c) && Number.isFinite(gate.c[0]) && Number.isFinite(gate.c[1])) {
    const vec = [gate.c[0] / 10 - center[0], gate.c[1] / 10 - center[1]];
    const len = Math.hypot(vec[0], vec[1]);
    if (len > 1) {
      fwd = [vec[0] / len, vec[1] / len];
      if (Number.isFinite(gate.a)) {
        const gateAngle = gate.a / 1000;
        const gateNorm = [-Math.sin(gateAngle), Math.cos(gateAngle)];
        const dot = gateNorm[0] * fwd[0] + gateNorm[1] * fwd[1];
        if (Math.abs(dot) > 0.5) fwd = dot >= 0 ? gateNorm : [-gateNorm[0], -gateNorm[1]];
      }
    }
  }
  const perp = [-fwd[1], fwd[0]];
  const angle = Math.atan2(fwd[1], fwd[0]);
  return { fwd, perp, angle };
}

function buildTerraceAndRailings(S, frame, baseY, plazaY, terraceY, platformY, minRise) {
  const { at, box, angle } = frame;
  const pavedStart = S.n;
  // ---- the plaza: one light paving round the terrace and out to the Lê Lợi sidewalk (37 m in front) ----
  S.kind = KIND.ROAD;
  box(0, 0, baseY - 0.3, plazaY, 2 * TERRACE_HALF_D + 4, 2 * PILLAR_B + 3, COLORS.pave, { topKind: KIND.ROAD });
  box(22.5, 0, baseY - 0.3, plazaY - 0.01, 27, 2 * PILLAR_B + 3, COLORS.pave, { topKind: KIND.ROAD });

  // ---- the outer terrace (top 1.2 m over the plaza) and its stairs ----
  box(0, 0, baseY - 0.2, terraceY, 2 * TERRACE_HALF_D, 2 * TERRACE_HALF_L, PAL.stone, { topKind: KIND.ROAD });
  const buildStairs = (a, b, run, width, yBot, yTop, stepCount, along) => {
    for (let i = 0; i < stepCount; i++) {
      const frac = (i + 0.5) / stepCount;
      const stepBot = yTop - ((yTop - yBot) * (i + 1)) / stepCount;
      const stepTop = stepBot + (yTop - yBot) / stepCount;
      if (along === 'a') box(a + Math.sign(run) * Math.abs(run) * frac, b, baseY - 0.2, stepTop, Math.abs(run) / stepCount + 0.02, width, PAL.stone, { topKind: KIND.ROAD });
      else box(a, b + Math.sign(run) * Math.abs(run) * frac, baseY - 0.2, stepTop, width, Math.abs(run) / stepCount + 0.02, PAL.stone, { topKind: KIND.ROAD });
    }
  };
  buildStairs(TERRACE_HALF_D, 0, 2.4, 6, plazaY, terraceY, 7, 'a'); // front, toward the street
  for (const side of [-1, 1]) buildStairs(0, side * TERRACE_HALF_L, side * 2.0, 4, plazaY, terraceY, 6, 'b'); // the ends
  // ---- the inner platform under the screen ----
  box((PLATFORM_A0 + PLATFORM_A1) / 2, 0, terraceY - 0.1, platformY, PLATFORM_A1 - PLATFORM_A0, 2 * PLATFORM_HALF_L, shade(PAL.stone, 1.06), { topKind: KIND.ROAD });
  buildStairs(PLATFORM_A1, 0, 1.2, 5, terraceY, platformY, 4, 'a');
  buildStairs(PLATFORM_A0, 0, -1.0, 3.6, terraceY, platformY, 4, 'a');
  (S.paved = S.paved || []).push([pavedStart, S.n]);

  // ---- a low kerb wall ~3.5 m behind the terrace, ~41 m long (the satellite's line toward the riverside path) ----
  S.kind = KIND.MASONRY;
  for (const side of [-1, 1]) { // two halves, each bedded on its own ground
    const pos = at(-TERRACE_HALF_D - 3.5, side * 10.25);
    const localGroundY = LAND_Y + rise(pos[0], pos[1]);
    if (Number.isFinite(localGroundY)) S.box(pos[0], pos[1], localGroundY - 0.2, Math.max(localGroundY, plazaY) + 0.45, 0.4, 20.5, angle, COLORS.railStone);
  }
  // ---- guardian beasts on plinths flanking the foot of the front stairs (stone; the species is an estimate) ----
  for (const side of [-1, 1]) {
    const pos = at(TERRACE_HALF_D + 2.9, side * 3.9);
    kylan(S, pos[0], plazaY, pos[1], angle, { s: 0.9, plinth: 0.5 });
  }
  S.base = minRise;

  // ---- the lan can (~1.3 m) along the terrace edge, open at the stairs; a low rail round the inner platform ----
  S.kind = KIND.MASONRY;
  const drawRail = (a0, b0, a1, b1, yBot, height, postStep) => {
    const alongA = Math.abs(a1 - a0) > Math.abs(b1 - b0);
    const len = alongA ? Math.abs(a1 - a0) : Math.abs(b1 - b0);
    const midA = (a0 + a1) / 2;
    const midB = (b0 + b1) / 2;
    const da = alongA ? len : 0.3;
    const db = alongA ? 0.3 : len;
    box(midA, midB, yBot + height - 0.16, yBot + height, da, db, COLORS.railStone);
    box(midA, midB, yBot, yBot + 0.16, alongA ? len : 0.34, alongA ? 0.34 : len, COLORS.railStone);
    box(midA, midB, yBot + 0.16, yBot + height - 0.16, alongA ? len : 0.12, alongA ? 0.12 : len, COLORS.railPanel); // pierced panel, as a thin wall
    const spanCount = Math.max(1, Math.round(len / postStep));
    for (let i = 0; i <= spanCount; i++) {
      const frac = i / spanCount;
      const isEnd = i === 0 || i === spanCount;
      box(a0 + (a1 - a0) * frac, b0 + (b1 - b0) * frac, yBot, yBot + height + (isEnd ? 0.3 : 0.05), 0.36, 0.36, COLORS.railStone);
    }
  };
  const edgeInset = 0.2;
  const railH = 1.3;
  for (const side of [-1, 1]) {
    drawRail(TERRACE_HALF_D - edgeInset, side * 3.2, TERRACE_HALF_D - edgeInset, side * (TERRACE_HALF_L - edgeInset), terraceY, railH, 1.8);
    drawRail(-TERRACE_HALF_D + edgeInset, side * 2.0, -TERRACE_HALF_D + edgeInset, side * (TERRACE_HALF_L - edgeInset), terraceY, railH, 1.8);
    drawRail(TERRACE_HALF_D - edgeInset, side * (TERRACE_HALF_L - edgeInset), 2.2, side * (TERRACE_HALF_L - edgeInset), terraceY, railH, 1.8);
    drawRail(-2.2, side * (TERRACE_HALF_L - edgeInset), -TERRACE_HALF_D + edgeInset, side * (TERRACE_HALF_L - edgeInset), terraceY, railH, 1.8);
    drawRail(PLATFORM_A1 - 0.15, side * 2.7, PLATFORM_A1 - 0.15, side * (PLATFORM_HALF_L - 0.15), platformY, 0.75, 1.6);
    drawRail(PLATFORM_A1 - 0.15, side * (PLATFORM_HALF_L - 0.15), PLATFORM_A0 + 0.15, side * (PLATFORM_HALF_L - 0.15), platformY, 0.75, 1.6);
  }
}

function buildScreen(S, frame, plazaY, platformY) {
  const { at, box, hipAt, angle } = frame;
  const y = platformY;
  S.kind = KIND.MASONRY;
  box(SCREEN_A, 0, y, y + SCREEN_PLINTH, SCREEN_THICK + 0.5, 15.6, COLORS.slab);

  // side bays: lower walls under one tiled roof each
  for (const side of [-1, 1]) {
    S.kind = KIND.CIVIC;
    box(SCREEN_A, side * SIDE_BAY.centerB, y + SCREEN_PLINTH, y + SIDE_BAY.h, SCREEN_THICK, SIDE_BAY.w, COLORS.yellow, { top: shade(COLORS.roof, 0.8) });
    S.kind = KIND.PLAIN;
    box(SCREEN_A, side * SIDE_BAY.centerB, y + SIDE_BAY.h - 0.4, y + SIDE_BAY.h, SCREEN_THICK + 0.3, SIDE_BAY.w + 0.2, COLORS.trim);
    for (const faceSign of [-1, 1]) {
      box(SCREEN_A + faceSign * (SCREEN_THICK / 2 + 0.03), side * SIDE_BAY.centerB, y + SCREEN_PLINTH + 0.35, y + SIDE_BAY.h - 0.7, 0.06, SIDE_BAY.w - 0.9, COLORS.panel);
      box(SCREEN_A + faceSign * (SCREEN_THICK / 2 + 0.06), side * (SIDE_BAY.centerB + 0.75), y + SCREEN_PLINTH + 0.7, y + SIDE_BAY.h - 1.05, 0.06, 1.5, COLORS.blue);
      box(SCREEN_A + faceSign * (SCREEN_THICK / 2 + 0.06), side * (SIDE_BAY.centerB - 1.0), y + SCREEN_PLINTH + 0.7, y + SIDE_BAY.h - 1.05, 0.06, 0.8, COLORS.dark);
    }
    box(SCREEN_A, side * (SIDE_BAY.centerB + SIDE_BAY.w / 2 + 0.5), y + SCREEN_PLINTH, y + 2.5, SCREEN_THICK + 0.2, 1.0, COLORS.yellowDark, { top: COLORS.trim }); // stepped buttress
    box(SCREEN_A, side * (SIDE_BAY.centerB + SIDE_BAY.w / 2 + 0.5), y + 2.5, y + 2.8, SCREEN_THICK + 0.4, 1.2, COLORS.trim);
    hipAt(SCREEN_A, side * SIDE_BAY.centerB, SIDE_BAY.w, SCREEN_THICK, y + SIDE_BAY.h, 1.0, COLORS.roof, { flare: 0.3, over: 0.55, fascia: 0.18, fasciaCol: COLORS.trim, ridgeCol: COLORS.ridge, hips: true, glazed: true });
  }

  // central bay, lower tier
  S.kind = KIND.CIVIC;
  box(SCREEN_A, 0, y + SCREEN_PLINTH, y + CENTER_BAY.h, SCREEN_THICK + 0.2, CENTER_BAY.w, COLORS.yellow, { top: shade(COLORS.roof, 0.8) });
  S.kind = KIND.PLAIN;
  for (const faceSign of [-1, 1]) {
    const faceA = SCREEN_A + faceSign * (SCREEN_THICK / 2 + 0.1);
    for (const side of [-1, 1]) box(faceA + faceSign * 0.02, side * (CENTER_BAY.w / 2 - 0.3), y + SCREEN_PLINTH, y + CENTER_BAY.h - 0.4, 0.2, 0.6, COLORS.trim); // pilasters
    box(faceA + faceSign * 0.03, 0, y + SCREEN_PLINTH + 0.3, y + CENTER_BAY.h - 0.6, 0.06, CENTER_BAY.w - 1.8, COLORS.panel);
    box(faceA + faceSign * 0.06, 0, y + SCREEN_PLINTH + 0.6, y + CENTER_BAY.h - 1.2, 0.06, CENTER_BAY.w - 2.2, COLORS.tablet); // the big tablet, names chiselled off
    const plaquePos = at(faceA + faceSign * 0.1, 0); // the kim khánh plaque and the medal hanging below it
    S.box(plaquePos[0], plaquePos[1], y + CENTER_BAY.h - 1.05, y + CENTER_BAY.h - 0.7, 0.08, 1.6, angle, COLORS.bronze);
    S.box(plaquePos[0], plaquePos[1], y + CENTER_BAY.h - 0.7, y + CENTER_BAY.h - 0.55, 0.08, 0.8, angle, COLORS.bronze);
  }
  box(SCREEN_A, 0, y + CENTER_BAY.h - 0.45, y + CENTER_BAY.h, SCREEN_THICK + 0.6, CENTER_BAY.w + 0.3, COLORS.trim);
  hipAt(SCREEN_A, 0, CENTER_BAY.w, SCREEN_THICK + 0.2, y + CENTER_BAY.h, 0.9, COLORS.roof, { flare: 0.3, over: 0.7, fascia: 0.2, fasciaCol: COLORS.trim, ridgeCol: null, glazed: true });

  // upper tier: a narrower panel rising out of the lower roof, under the top roof
  const upperY = y + CENTER_BAY.h + 0.5;
  S.kind = KIND.CIVIC;
  box(SCREEN_A, 0, upperY - 0.4, upperY + UPPER_TIER.h, SCREEN_THICK * 0.85, UPPER_TIER.w, COLORS.yellow, { top: shade(COLORS.roof, 0.8) });
  S.kind = KIND.PLAIN;
  for (const faceSign of [-1, 1]) {
    box(SCREEN_A + faceSign * (SCREEN_THICK * 0.425 + 0.03), 0, upperY + 0.2, upperY + UPPER_TIER.h - 0.35, 0.06, UPPER_TIER.w - 0.8, COLORS.panel);
    const medalPos = at(SCREEN_A + faceSign * (SCREEN_THICK * 0.425 + 0.07), 0); // the round 壽 medallion
    S.box(medalPos[0], medalPos[1], upperY + 0.5, upperY + 1.3, 0.06, 0.55, angle, COLORS.dark);
    S.box(medalPos[0], medalPos[1], upperY + 0.62, upperY + 1.18, 0.06, 0.8, angle, COLORS.dark);
  }
  box(SCREEN_A, 0, upperY + UPPER_TIER.h - 0.3, upperY + UPPER_TIER.h, SCREEN_THICK + 0.3, UPPER_TIER.w + 0.3, COLORS.trim);
  const upperTopY = upperY + UPPER_TIER.h;
  hipAt(SCREEN_A, 0, UPPER_TIER.w, SCREEN_THICK * 0.85, upperTopY, 1.2, COLORS.roof, { flare: 0.3, over: 0.6, fascia: 0.2, fasciaCol: COLORS.trim, ridgeCol: COLORS.ridge, hips: true, glazed: true });
  // ridge crown: a gourd on a lotus seat, its top at the sourced 10.95 m over the plaza
  const screenCenter = at(SCREEN_A, 0);
  const finialBaseY = upperTopY + 1.2 + 0.15;
  const finialH = plazaY + MEMORIAL_TOTAL_H - finialBaseY;
  S.cyl(screenCenter[0], screenCenter[1], finialBaseY, finialBaseY + finialH * 0.24, 0.35, 0.45, 6, COLORS.ridge, { cap: false });
  S.cyl(screenCenter[0], screenCenter[1], finialBaseY + finialH * 0.24, finialBaseY + finialH * 0.48, 0.45, 0.28, 6, COLORS.ridge, { cap: false });
  S.cyl(screenCenter[0], screenCenter[1], finialBaseY + finialH * 0.48, finialBaseY + finialH, 0.28, 0.04, 6, COLORS.ridge);
  return { upperTopY, screenCenter, finialBaseY, finialH };
}

function buildPillars(S, frame, baseY, plazaY) {
  const { at, angle } = frame;
  // ---- the two trụ biểu on the plaza outside the terrace's front corners: shafts, lantern heads, finials (9.85 m) ----
  const headY = plazaY + 7.35;
  for (const side of [-1, 1]) {
    const pos = at(PILLAR_A, side * PILLAR_B);
    S.kind = KIND.MASONRY;
    S.box(pos[0], pos[1], baseY - 0.2, plazaY + 0.9, 1.6, 1.6, angle, COLORS.slab);
    S.box(pos[0], pos[1], plazaY + 0.9, plazaY + 1.1, 1.75, 1.75, angle, COLORS.trim);
    S.kind = KIND.CIVIC;
    S.box(pos[0], pos[1], plazaY + 1.1, headY, 0.95, 0.95, angle, COLORS.pillar, { taper: 0.94 });
    S.kind = KIND.PLAIN;
    S.box(pos[0], pos[1], plazaY + 2.4, headY - 0.7, 1.0, 0.6, angle, COLORS.panel); // couplet panels front/back
    S.box(pos[0], pos[1], headY, headY + 0.3, 1.25, 1.25, angle, COLORS.trim);
    for (const [bandH, bandW] of ([[1.5, 1.1], [3.2, 1.0], [5.0, 0.98]] as any[])) {
      S.box(pos[0], pos[1], plazaY + bandH, plazaY + bandH + 0.14, bandW, bandW, angle, COLORS.trim); // banding on the shaft
    }
    // the head: four stacked, flaring tiers narrowing upward, then a lotus seat and bud (as in sv-B and sv-C)
    let tierY = headY + 0.3;
    for (const tierW of [1.08, 0.92, 0.76, 0.6]) {
      S.box(pos[0], pos[1], tierY, tierY + 0.12, tierW * 0.72, tierW * 0.72, angle, COLORS.yellowDark); // neck
      S.kind = KIND.GLAZED;
      S.box(pos[0], pos[1], tierY + 0.12, tierY + 0.41, tierW, tierW, angle, COLORS.roof, { taper: 0.78 }); // flared, dark-glazed cornice
      S.kind = KIND.PLAIN;
      tierY += 0.41;
    }
    S.cyl(pos[0], pos[1], tierY, tierY + 0.22, 0.18, 0.36, 8, COLORS.ridge, { cap: false, rot: angle }); // lotus seat
    S.cyl(pos[0], pos[1], tierY + 0.22, headY + 2.5, 0.36, 0.04, 8, COLORS.ridge, { rot: angle }); // bud, its tip at 9.85 m
  }
  return headY;
}

function buildNightLamps(group, at, platformY, screenMeta, headY) {
  const { upperTopY, screenCenter, finialBaseY, finialH } = screenMeta;
  // ---- after dark ("67 lamps on roof, walls, pillars" since the restoration) ----
  const pos = [];
  const col = [];
  const addLamp = (pt, y, rgb = LAMP_WARM) => {
    pos.push(pt[0], y, pt[1]);
    col.push(rgb[0], rgb[1], rgb[2]);
  };
  const addEaveRow = (b0, b1, y, offsetA, segCount) => {
    for (let i = 0; i <= segCount; i++) {
      for (const faceSign of [-1, 1]) addLamp(at(SCREEN_A + faceSign * offsetA, b0 + ((b1 - b0) * i) / segCount), y);
    }
  };
  addEaveRow(-CENTER_BAY.w / 2 - 0.6, CENTER_BAY.w / 2 + 0.6, platformY + CENTER_BAY.h - 0.15, SCREEN_THICK / 2 + 0.8, 4);
  addEaveRow(-UPPER_TIER.w / 2 - 0.5, UPPER_TIER.w / 2 + 0.5, upperTopY - 0.15, SCREEN_THICK * 0.425 + 0.7, 3);
  for (const side of [-1, 1]) {
    addEaveRow(side * (SIDE_BAY.centerB - SIDE_BAY.w / 2 - 0.4), side * (SIDE_BAY.centerB + SIDE_BAY.w / 2 + 0.4), platformY + SIDE_BAY.h - 0.15, SCREEN_THICK / 2 + 0.7, 3);
  }
  for (const side of [-1, 1]) {
    for (const faceSign of [-1, 1]) addLamp(at(PILLAR_A + faceSign * 0.6, side * PILLAR_B), headY + 0.5, LAMP_PILLAR); // under the heads' first tier
  }
  addLamp(screenCenter, finialBaseY + finialH * 0.85);
  const pts = glowPoints(pos, col, 3);
  pts.userData.glow = true;
  pts.userData.landmark = id;
  group.add(pts);
}

export function build({ data, S, group, place }) {
  const center = place && Number.isFinite(place.x) && Number.isFinite(place.z) ? [place.x, place.z] : FALLBACK_POS.slice();
  const { fwd, perp, angle } = resolveOrientation(data, center);
  const at = (a, b = 0): [number, number] => [center[0] + fwd[0] * a + perp[0] * b, center[1] + fwd[1] * a + perp[1] * b];

  // bed the whole precinct on the lowest ground under it; the paving tops clear the highest
  let minRise = Infinity;
  let maxRise = -Infinity;
  for (let a = -10; a <= 36; a += 4) {
    for (let b = -18; b <= 18; b += 4.5) {
      const pos = at(a, b);
      const localRise = rise(pos[0], pos[1]);
      minRise = Math.min(minRise, localRise);
      maxRise = Math.max(maxRise, localRise);
    }
  }
  if (!Number.isFinite(minRise)) return;
  const baseY = LAND_Y + minRise;
  const plazaY = LAND_Y + maxRise + 0.12;
  const terraceY = plazaY + 1.2;
  const platformY = terraceY + 0.7;
  S.base = minRise;

  const box = (a, b, y0, y1, da, db, color, opt?) => {
    const pos = at(a, b);
    S.box(pos[0], pos[1], y0, y1, da, db, angle, color, opt);
  };
  const hipAt = (a, b, wb, da, y, h, color, opt) => {
    const pos = at(a, b);
    S.hip(pos[0], pos[1], wb, da, angle + Math.PI / 2, y, h, color, opt);
  };
  const frame = { at, box, hipAt, angle };

  buildTerraceAndRailings(S, frame, baseY, plazaY, terraceY, platformY, minRise);
  const screenMeta = buildScreen(S, frame, plazaY, platformY);
  const headY = buildPillars(S, frame, baseY, plazaY);
  buildNightLamps(group, at, platformY, screenMeta, headY);

  S.kind = KIND.PLAIN;
  S.base = 0;
}
