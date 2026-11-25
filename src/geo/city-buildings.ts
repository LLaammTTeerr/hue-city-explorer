import * as THREE from 'three';
import { Buf, KIND, KIND_FLOOD, hex, shade, unflat, obb, signedArea, ringCentre, rand, pick } from './buf.ts';
import { cityMaterial } from './materials.ts';
import { LAND_Y, PAL } from '../config.ts';
import { rise, baseUnder } from './terrain.ts';
import { placeOwns } from '../landmarks/places/index.ts';
import { owns as dainoiOwns } from '../landmarks/places/dainoi.ts';

const DECIMETRES_PER_METRE = 10;
const BUILDINGS_BUF_INITIAL = 420000;
const FOUNDATION_BELOW_GROUND_M = 0.3;
const MIN_KNOWN_EAVE_M = 2.6;
const FLAG_OVER_WATER = 1;
const FLAG_QUOC_HOC = 2;
const FLAG_COLONIAL = 4;
const FLAG_TRAD = 8;
const FLAG_WHITEWASH = 128;
const FLAG_FLOODLIT = 256;

export const SILVER = hex('#c9ced1');
export const SILVER_DARK = hex('#8f979c');
const SILVER_CAP = hex('#dfe3e5');
const RIDGE_GOLD = hex('#f1d77a');
const RIDGE_GREY = hex('#cfc4a4');
const QUOC_HOC_WALL = hex('#a3352c');
const QUOC_HOC_ROOFS = [hex('#a65a44'), hex('#9a5540'), hex('#b0603f')];
const COLONIAL_FASCIA = hex('#f1e7d2');
const WATER_DECK_SIDE = hex('#8a7a66');
const WATER_DECK_TOP = hex('#b3a48c');
const WATER_PILE_COL = hex('#9c9488');

function waterTank(buf: Buf, x: number, z: number, baseY: number, ang: number, scale = 1) {
  // the stainless roof tank on its frame: as much a part of a Vietnamese roofscape as the tiles
  const prevKind = buf.kind;
  buf.kind = KIND.PLAIN;
  buf.box(x, z, baseY, baseY + 0.7 * scale, 1.1 * scale, 1.1 * scale, ang, SILVER_DARK, { taper: 0.9 });
  buf.cyl(x, z, baseY + 0.7 * scale, baseY + 2.0 * scale, 0.58 * scale, 0.58 * scale, 8, SILVER);
  buf.cyl(x, z, baseY + 2.0 * scale, baseY + 2.22 * scale, 0.58 * scale, 0.2 * scale, 8, SILVER_CAP);
  buf.kind = prevKind;
}

function resolveBuildingStyle(kind: number, flags: number, idx: number, height: number, area: number, box: any, rectness: number) {
  let wall: number[];
  let roof: number[];
  let pitched = false;
  let flare = 0;
  let over = 0.5;
  let roofHeight = 0;
  let ridge: number[] | null = null;
  let hips = false;

  switch (kind) {
    case 2: // inside the Imperial City: glazed yellow, a few jade
      wall = PAL.lacquer;
      roof = rand(idx, 3) < 0.22 ? PAL.jadeRoof : rand(idx, 4) < 0.5 ? PAL.imperialRoof : PAL.imperialRoof2;
      pitched = rectness > 0.72 && box.d < 34;
      flare = 0.5;
      over = 1.3;
      roofHeight = Math.min(6, Math.max(2, box.d * 0.3));
      ridge = RIDGE_GOLD;
      hips = true;
      break;
    case 3:
      wall = PAL.templeWall;
      roof = PAL.templeRoof;
      pitched = rectness > 0.72 && box.d < 28;
      flare = 0.4;
      over = 0.9;
      roofHeight = Math.min(5, Math.max(1.8, box.d * 0.3));
      ridge = RIDGE_GREY;
      hips = true;
      break;
    case 4:
      wall = PAL.church;
      roof = PAL.slate;
      pitched = rectness > 0.75 && box.d < 26;
      roofHeight = Math.min(8, box.d * 0.45);
      break;
    case 5:
      wall = pick(PAL.modernWall, idx, 1);
      roof = rand(idx, 2) < 0.45 ? pick(PAL.roofs, idx, 5) : pick(PAL.concrete, idx, 2);
      pitched = rectness > 0.86 && box.d < 17 && rand(idx, 2) < 0.45;
      roofHeight = Math.min(3.6, box.d * 0.24);
      break;
    case 6:
      wall = PAL.marketWall;
      roof = PAL.marketRoof;
      pitched = rectness > 0.8;
      roofHeight = Math.min(3.5, Math.max(1.2, box.d * 0.26));
      break;
    case 7:
      wall = PAL.glass;
      roof = shade(PAL.glass, 0.82);
      break;
    case 8:
      wall = shade(PAL.concrete[0], 0.9);
      roof = pick(PAL.roofs, idx, 2);
      break;
    case 1:
      wall = pick(PAL.modernWall, idx, 1);
      roof = pick(PAL.concrete, idx, 2);
      break;
    default:
      wall = pick(PAL.walls, idx, 1);
      roof = pick(PAL.roofs, idx, 2);
      pitched = rectness > 0.8 && box.d < 15.5 && area < 520;
      roofHeight = Math.min(3.6, Math.max(1.1, box.d * 0.26));
  }

  const quocHoc = (flags & FLAG_QUOC_HOC) !== 0;
  if (quocHoc) {
    wall = QUOC_HOC_WALL;
    roof = pick(QUOC_HOC_ROOFS, idx, 2);
    pitched = rectness > 0.6 && box.d < 30;
    over = 0.8;
    flare = 0;
    roofHeight = Math.min(4.2, Math.max(1.6, box.d * 0.22));
  }

  const colonial = (flags & FLAG_COLONIAL) !== 0 && !quocHoc;
  const trad = (flags & FLAG_TRAD) !== 0;
  const isBig = (kind === 0 && (area > 240 || height > 12)) || kind === 1 || kind === 5;
  if (colonial) {
    wall = pick(PAL.indochine, idx, 1);
    roof = pick(PAL.indochineRoof, idx, 2);
    pitched = rectness > 0.7 && box.d < 26;
    over = 1.0;
    flare = 0;
    roofHeight = Math.min(4.4, Math.max(1.6, box.d * 0.24));
  } else if (trad) {
    wall = pick(PAL.tradWall, idx, 1);
    roof = pick(PAL.tradRoof, idx, 2);
    pitched = rectness > 0.6 && box.d < 22;
    over = 1.2;
    flare = 0.3;
    roofHeight = Math.min(3.4, Math.max(1.4, box.d * 0.27));
    ridge = RIDGE_GREY;
  } else if ((kind === 0 || kind === 1 || kind === 5) && !quocHoc) {
    if (rand(idx, 61) < 0.75) wall = pick(PAL.pastel, idx, 1);
    if (isBig) pitched = false;
    else if (rand(idx, 62) < 0.25) roof = pick(PAL.metalRoof, idx, 63);
  }

  // the roof family seen from orbit (flags bits 4-6) outranks the district's guess; a whitewashed ward paints walls white
  const roofFamily = (flags >> 4) & 7;
  if (!quocHoc && !trad && kind !== 2 && kind !== 3 && kind !== 7) {
    if (roofFamily) {
      roof = pick(PAL.roofFamily[roofFamily], idx, 64);
      if (roofFamily >= 3 && (kind === 0 || kind === 1 || kind === 5)) pitched = false;
    }
    if (flags & FLAG_WHITEWASH) wall = pick(PAL.whitewash, idx, 65);
  }

  const wallJitter = quocHoc ? 0.96 + rand(idx, 7) * 0.08 : 0.92 + rand(idx, 7) * 0.16;
  return {
    wall: shade(wall, wallJitter),
    roof: shade(roof, 0.9 + rand(idx, 9) * 0.2),
    pitched, flare, over, roofHeight, ridge, hips,
    quocHoc, colonial, trad, isBig, roofFamily,
  };
}

function buildWaterPiles(buf: Buf, ring: number[][], box: any, floorY: number) {
  buf.kind = KIND.PLAIN;
  const cx = box.c[0];
  const cz = box.c[1];
  const deckRing = ring.map((pt) => [cx + (pt[0] - cx) * 1.12, cz + (pt[1] - cz) * 1.12]);
  const deckTop = LAND_Y + floorY;
  buf.prism(deckRing, deckTop - 0.7, deckTop - 0.02, WATER_DECK_SIDE, WATER_DECK_TOP, { topKind: KIND.ROAD });
  const step = Math.max(1, Math.round(ring.length / 10));
  for (let k = 0; k < ring.length; k += step) {
    buf.cyl(cx + (ring[k][0] - cx) * 0.94, cz + (ring[k][1] - cz) * 0.94, deckTop - 6.6, deckTop - 0.7, 0.42, 0.42, 6, WATER_PILE_COL, { cap: false });
  }
  buf.cyl(cx, cz, deckTop - 6.6, deckTop - 0.7, 0.6, 0.6, 6, WATER_PILE_COL, { cap: false });
}

function buildFlatRoofExtras(buf: Buf, box: any, roofY: number, area: number, wall: number[], lid: number[], idx: number) {
  const ux = Math.cos(box.a);
  const uz = Math.sin(box.a);
  if (area > 140 && rand(idx, 11) < 0.65) {
    const size = 2.6 + rand(idx, 12) * 2.2;
    const dx = (rand(idx, 13) - 0.5) * box.w * 0.3;
    const dz = (rand(idx, 14) - 0.5) * box.d * 0.3;
    buf.box(box.c[0] + ux * dx - uz * dz, box.c[1] + uz * dx + ux * dz, roofY, roofY + 2.3 + rand(idx, 15), size, size * 0.8, box.a, shade(wall, 0.94), { top: shade(lid, 0.85), topKind: KIND.FLAT });
  }
  const tankCount = area > 400 ? 2 : rand(idx, 18) < 0.7 ? 1 : 0;
  for (let k = 0; k < tankCount; k++) {
    const dx = (rand(idx, 19 + k) - 0.5) * box.w * 0.45;
    const dz = (rand(idx, 23 + k) - 0.5) * box.d * 0.45;
    waterTank(buf, box.c[0] + ux * dx - uz * dz, box.c[1] + uz * dx + ux * dz, roofY, box.a, 0.9 + rand(idx, 27 + k) * 0.4);
  }
}

export function buildBuildings(data: any, group: THREE.Group, off: any = null, roofOff: any = null) {
  const buf = new Buf(BUILDINGS_BUF_INITIAL);

  function drawBuilding(rec: any, idx: number) {
    const ring = unflat(rec[0]);
    let height = rec[1] / DECIMETRES_PER_METRE;
    const kind = rec[2];
    const flags = rec[4] || 0;
    const baseY = LAND_Y + baseUnder(ring) - FOUNDATION_BELOW_GROUND_M;
    const area = Math.abs(signedArea(ring));
    const box = obb(ring);

    // on a slope the floors start at the highest ground under the footprint; what shows below is plain foundation
    let floorRise = rise(box.c[0], box.c[1]);
    for (const pt of ring) floorRise = Math.max(floorRise, rise(pt[0], pt[1]));
    buf.base = floorRise;

    const rectness = area / Math.max(1, box.w * box.d);
    const style = resolveBuildingStyle(kind, flags, idx, height, area, box, rectness);

    if (rec[5]) height = Math.max(MIN_KNOWN_EAVE_M, rec[5] / DECIMETRES_PER_METRE - (style.pitched ? style.roofHeight + 0.3 : 0.8));
    const eaveY = LAND_Y + floorRise + height;
    if (style.pitched && roofOff && roofOff(box, style.over, eaveY, style.roofHeight)) return;
    if (flags & FLAG_OVER_WATER) buildWaterPiles(buf, ring, box, floorRise);

    buf.kind = kind === 8 ? KIND.PLAIN
      : kind === 2 || style.trad ? KIND.TIMBER
        : style.colonial || style.quocHoc ? KIND.COLONIAL
          : kind === 3 || kind === 4 ? KIND.CIVIC
            : style.isBig ? KIND.MODERN : KIND.FACADE;

    if (style.pitched) {
      buf.prism(ring, baseY, eaveY, style.wall, shade(style.roof, 0.85), { top: rectness < 0.96, topKind: KIND.TILE });
      const fasciaCol = style.colonial || style.quocHoc ? COLONIAL_FASCIA : style.flare ? shade(style.wall, 0.7) : shade(style.wall, 0.86);
      buf.hip(box.c[0], box.c[1], box.w, box.d, box.a, eaveY + 0.02, style.roofHeight, style.roof, {
        flare: style.flare,
        over: style.over,
        fascia: style.flare ? 0.34 : 0.24,
        fasciaCol,
        ridgeCol: style.ridge,
        hips: style.hips,
        glazed: kind === 2,
      });
    } else {
      const isTiled = style.quocHoc || style.trad
        || ((style.roofFamily === 1 || !style.roofFamily) && style.colonial)
        || (style.roofFamily === 1 && kind === 0 && !style.isBig)
        || (kind === 0 && !style.isBig && rand(idx, 16) < 0.45)
        || kind === 8 || kind === 6 || kind === 2 || kind === 3 || kind === 4;
      if (isTiled) {
        buf.prism(ring, baseY, eaveY, style.wall, style.roof, { topKind: KIND.TILE });
      } else {
        const lid = kind === 7 || style.roofFamily >= 2 ? style.roof : pick(PAL.concrete, idx, 17);
        buf.prism(ring, baseY, eaveY, style.wall, shade(lid, 0.92), { topKind: KIND.FLAT, parapet: kind === 7 ? 1.6 : 0.8 });
        if (area > 70 && kind !== 7 && !rec[6]) buildFlatRoofExtras(buf, box, eaveY, area, style.wall, lid, idx);
      }
    }
  }

  // neighbouring pitched roofs (a row of temple halls, houses wall to wall) meet in valleys (Buf.joined)
  buf.joined(() => data.bld.forEach((rec: any, idx: number) => {
    const ring = unflat(rec[0]);
    if (off && off(ring, ringCentre(ring))) return;
    if (rec[2] === 2 && dainoiOwns(ring)) return;
    if (placeOwns(ring)) return;
    const startVert = buf.n;
    buf.mark = rec[4] & FLAG_FLOODLIT ? KIND_FLOOD : 0;
    drawBuilding(rec, idx);
    if (buf.mark) for (let vert = startVert; vert < buf.n; vert++) buf.knd[vert] |= KIND_FLOOD;
  }));
  buf.mark = 0;

  const mesh = new THREE.Mesh(buf.geometry(), cityMaterial({ windows: true }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = 'buildings';
  group.add(mesh);
  return mesh;
}
