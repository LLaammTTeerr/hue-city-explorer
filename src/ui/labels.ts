import * as THREE from 'three';
import { LAND_Y } from '../config.ts';
import { rise } from '../geo/terrain.ts';

const DECIMETRES_PER_METRE = 10;
const TIER_MAX_DIST_M: Record<number, number> = { 1: 9000, 2: 3000, 3: 1500, 4: 750 };
// Lesser places also wait for the camera to come down: the opening view (250-430 m up) and the overview show only
// the landmarks of tiers 1-2; the framed views of single places (mostly 30-150 m up) bring the rest in.
const TIER_MAX_ALT_M: Record<number, number> = { 3: 210, 4: 160 };
const FADE_FRACTION = 0.2; // the last fifth of a tag's range (distance or height) fades it out
const STEM_HEIGHT_PX = 14; // .label-place > span sits this far above its anchor (style.css), stem included
const ANCHOR_CLEARANCE_M = 3; // a tag's anchor floats this far above the model
const DEFAULT_PLACE_HEIGHT_M = 10;
const WATER_ANCHOR_Y_M = 1;
const WATER_PRIORITY = 3.5;
const MIN_VISIBLE_DIST_M = 40;
const NEAR_FADE_SPAN_M = 20;
const MIN_FADE_ALPHA = 0.25;
const NDC_MARGIN = 1.2;
const LAYOUT_REFRESH_FRAMES = 30;
const PANEL_PAD_X_PX = 6;
const PANEL_PAD_Y_PX = 4;
const SHOWN_PRIORITY_BONUS = 0.75;
const NEWCOMER_PAD_PX = 4;
const LABEL_PAD_X_PX = 6;
const LABEL_PAD_Y_PX = 4;
const PANEL_SELECTORS = ['#places', '#search .bar', '#panel', '#tools', '#nav', '#actions', '#card'];

// Street labels: aligned along carriageways when zoomed in, staying out of the opening/far view.
const STREET_POOL_SIZE = 44;
const STREET_Y_OFFSET_M = 0.35;
const STREET_TANGENT_SPAN_M = 10;
const STREET_MIN_DIST_M = 18;
const STREET_NEAR_FADE_M = 14;
const STREET_FADE_FRACTION = 0.25;
const STREET_MIN_PROJ_PX = 4; // skip roads nearly end-on to the camera
const STREET_EDGE_MARGIN_PX = 24;
const STREET_SAME_NAME_PX = 220; // minimum screen distance between repeats of the same street name
const STREET_PAD_X_PX = 8;
const STREET_PAD_Y_PX = 5;
const STREET_EST_CHAR_W_PX = 6.8;
const STREET_EST_H_PX = 16;
// Per road class (0 primary/trunk, 1 secondary, 2 tertiary, 3 residential, 4 service):
// Opening desktop view sits at ~247 m altitude, so all classes stay hidden there and fade in as you zoom down.
const STREET_MAX_ALT_M = [235, 230, 215, 200, 130];
const STREET_MAX_DIST_M = [950, 820, 680, 560, 320];
const STREET_GLOBAL_MAX_ALT_M = 238;

type RawStreetLabel = [string, number, number, number, number, number];

interface StreetAnchor {
  name: string;
  cls: number;
  groundY: number;
  pos: THREE.Vector3;
  pos2: THREE.Vector3;
  estW: number;
}

interface StreetSlot {
  el: HTMLDivElement;
  span: HTMLSpanElement;
  anchorIdx: number;
  shown: boolean;
  lastName: string;
  lastCls: string;
  lastTransform: string;
  lastFade: string;
}

interface StreetCandidate {
  idx: number;
  name: string;
  cls: number;
  sx: number;
  sy: number;
  angleDeg: number;
  fade: number;
}

interface RectBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface LabelItem {
  place: any;
  el: HTMLElement;
  isWater: boolean;
  groundY: number;
  pos: THREE.Vector3;
  width: number;
  height: number;
  shown: boolean;
  priority: number;
  lastTransform?: string;
  lastFade?: string;
}

// `a` is the highest point of the built model over the place (roof, spire, flagpole, bridge bow), in decimetres,
// found by the data build (scripts/build-label-tops.mjs), so a tag sits just over what it names. Open ground, water
// and whole districts have none and keep the height given in the data.
function computeAnchorY(place: any) {
  if (place.a != null) return place.a / DECIMETRES_PER_METRE + ANCHOR_CLEARANCE_M;
  return LAND_Y + rise(place.x / DECIMETRES_PER_METRE, place.z / DECIMETRES_PER_METRE) + (place.h || DEFAULT_PLACE_HEIGHT_M);
}

function createLabelItem(root: HTMLElement, place: any, isWater: boolean, onPick: (id: string) => void): LabelItem {
  const el = document.createElement(isWater ? 'div' : 'button');
  el.className = `label ${isWater ? 'label-water' : `label-place t${place.t}${place.k === 'area' ? ' area' : ''}`}`;
  // built node by node: the names come from OSM, so none of them is ever parsed as markup
  if (!isWater) el.append(document.createElement('i'));
  const nameSpan = document.createElement('span');
  nameSpan.textContent = place.n;
  el.append(nameSpan);
  el.setAttribute('aria-hidden', 'true'); // hidden until shown (with visibility, style.css), so off-screen tags are not tabbed through
  if (!isWater) {
    (el as HTMLButtonElement).type = 'button';
    el.tabIndex = -1;
    el.addEventListener('click', (event) => { event.stopPropagation(); onPick(place.id); });
  }
  root.appendChild(el);
  const px = place.x / DECIMETRES_PER_METRE;
  const pz = place.z / DECIMETRES_PER_METRE;
  return {
    place,
    el,
    isWater,
    groundY: isWater ? 0 : LAND_Y + rise(px, pz),
    pos: new THREE.Vector3(px, isWater ? WATER_ANCHOR_Y_M : computeAnchorY(place), pz),
    width: 0,
    height: 0,
    shown: false,
    priority: isWater ? WATER_PRIORITY : place.t,
  };
}

function collectBlockedRects(panels: HTMLElement[]): RectBox[] {
  const blocked: RectBox[] = [];
  for (const el of panels) {
    if (el.hidden) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      blocked.push({
        left: rect.left - PANEL_PAD_X_PX,
        right: rect.right + PANEL_PAD_X_PX,
        top: rect.top - PANEL_PAD_Y_PX,
        bottom: rect.bottom + PANEL_PAD_Y_PX,
      });
    }
  }
  return blocked;
}

function overlapsAny(placed: RectBox[], left: number, right: number, top: number, bottom: number) {
  for (const box of placed) {
    if (left < box.right && right > box.left && top < box.bottom && bottom > box.top) return true;
  }
  return false;
}

// HTML labels pinned to places, plus rotated street labels aligned along roads when zoomed in.
export function createLabels(
  root: HTMLElement,
  data: any,
  camera: THREE.PerspectiveCamera,
  onPick: (id: string) => void,
  rawStreets: RawStreetLabel[] = [],
) {
  const streetPool: StreetSlot[] = [];
  for (let i = 0; i < STREET_POOL_SIZE; i++) {
    const el = document.createElement('div');
    el.className = 'label label-street';
    el.setAttribute('aria-hidden', 'true');
    const span = document.createElement('span');
    el.append(span);
    root.appendChild(el);
    streetPool.push({ el, span, anchorIdx: -1, shown: false, lastName: '', lastCls: '', lastTransform: '', lastFade: '' });
  }

  const streetAnchors: StreetAnchor[] = rawStreets.map(([name, xDm, zDm, dxK, dzK, cls]) => {
    const x = xDm / DECIMETRES_PER_METRE;
    const z = zDm / DECIMETRES_PER_METRE;
    const groundY = LAND_Y + rise(x, z);
    const x2 = x + (dxK / 1000) * STREET_TANGENT_SPAN_M;
    const z2 = z + (dzK / 1000) * STREET_TANGENT_SPAN_M;
    const y2 = LAND_Y + rise(x2, z2) + STREET_Y_OFFSET_M;
    return {
      name,
      cls,
      groundY,
      pos: new THREE.Vector3(x, groundY + STREET_Y_OFFSET_M, z),
      pos2: new THREE.Vector3(x2, y2, z2),
      estW: name.length * STREET_EST_CHAR_W_PX + 10,
    };
  });

  const items: LabelItem[] = [];
  data.places.forEach((place: any) => items.push(createLabelItem(root, place, false, onPick)));
  data.waterLabels.forEach((place: any) => items.push(createLabelItem(root, place, true, onPick)));
  items.sort((a, b) => a.priority - b.priority);

  const projected = new THREE.Vector3();
  const projected2 = new THREE.Vector3();
  const visited = new Set<string>();
  const panels = PANEL_SELECTORS.map((sel) => document.querySelector<HTMLElement>(sel)).filter(Boolean) as HTMLElement[];

  let enabled = true;
  let frameCount = 0;
  let blocked: RectBox[] = [];
  let activeId: string | null = null;
  let isMeasured = false;
  let dirty = true;
  let lastW = 0;
  let lastH = 0;
  const lastViewProj = new Float32Array(16);
  const curViewProj = new THREE.Matrix4();

  // widths taken with a fallback font are wrong once the web fonts (and their Vietnamese subsets) arrive
  if (document.fonts) {
    document.fonts.ready.then(() => { isMeasured = false; dirty = true; });
    document.fonts.addEventListener('loadingdone', () => { isMeasured = false; dirty = true; });
  }

  function measureLabels() {
    for (const item of items) {
      const span = item.el.querySelector('span')!;
      item.width = span.offsetWidth;
      item.height = span.offsetHeight + (item.isWater ? 0 : STEM_HEIGHT_PX - 2);
    }
    isMeasured = true;
  }

  function updateStreetLabels(width: number, height: number, placed: RectBox[]) {
    const camX = camera.position.x;
    const camY = camera.position.y;
    const camZ = camera.position.z;
    const camGroundAlt = camY - (LAND_Y + rise(camX, camZ));

    const chosen: StreetCandidate[] = [];
    if (enabled && streetAnchors.length > 0 && camGroundAlt < STREET_GLOBAL_MAX_ALT_M) {
      const placedByName = new Map<string, [number, number][]>();
      for (let i = 0; i < streetAnchors.length && chosen.length < STREET_POOL_SIZE; i++) {
        const a = streetAnchors[i];
        const maxAlt = STREET_MAX_ALT_M[a.cls] ?? 95;
        const alt = camY - a.groundY;
        if (alt > maxAlt) continue;
        const maxDist = STREET_MAX_DIST_M[a.cls] ?? 280;
        const dx = a.pos.x - camX;
        const dy = a.pos.y - camY;
        const dz = a.pos.z - camZ;
        const distSq = dx * dx + dy * dy + dz * dz;
        if (distSq > maxDist * maxDist || distSq < STREET_MIN_DIST_M * STREET_MIN_DIST_M) continue;

        const dist = Math.sqrt(distSq);
        const fade = Math.min(
          1,
          (maxDist - dist) / (maxDist * STREET_FADE_FRACTION),
          (dist - STREET_MIN_DIST_M) / STREET_NEAR_FADE_M,
          (maxAlt - alt) / (maxAlt * STREET_FADE_FRACTION),
        );
        if (fade < MIN_FADE_ALPHA) continue;

        projected.copy(a.pos).project(camera);
        if (projected.z >= 1 || projected.z <= -1) continue;
        const sx = (projected.x * 0.5 + 0.5) * width;
        const sy = (-projected.y * 0.5 + 0.5) * height;
        if (sx < STREET_EDGE_MARGIN_PX || sx > width - STREET_EDGE_MARGIN_PX || sy < STREET_EDGE_MARGIN_PX || sy > height - STREET_EDGE_MARGIN_PX) continue;

        projected2.copy(a.pos2).project(camera);
        if (projected2.z >= 1 || projected2.z <= -1) continue;
        const sx2 = (projected2.x * 0.5 + 0.5) * width;
        const sy2 = (-projected2.y * 0.5 + 0.5) * height;
        const segDx = sx2 - sx;
        const segDy = sy2 - sy;
        if (segDx * segDx + segDy * segDy < STREET_MIN_PROJ_PX * STREET_MIN_PROJ_PX) continue;

        let angle = Math.atan2(segDy, segDx);
        if (angle > Math.PI * 0.5) angle -= Math.PI;
        else if (angle < -Math.PI * 0.5) angle += Math.PI;

        // Avoid repeating the same street name too close together on screen
        const sameList = placedByName.get(a.name);
        if (sameList) {
          let tooClose = false;
          for (const [px, py] of sameList) {
            if ((sx - px) * (sx - px) + (sy - py) * (sy - py) < STREET_SAME_NAME_PX * STREET_SAME_NAME_PX) {
              tooClose = true;
              break;
            }
          }
          if (tooClose) continue;
        }

        const absCos = Math.abs(Math.cos(angle));
        const absSin = Math.abs(Math.sin(angle));
        const halfW = (a.estW * absCos + STREET_EST_H_PX * absSin) * 0.5 + STREET_PAD_X_PX;
        const halfH = (a.estW * absSin + STREET_EST_H_PX * absCos) * 0.5 + STREET_PAD_Y_PX;
        if (overlapsAny(placed, sx - halfW, sx + halfW, sy - halfH, sy + halfH)) continue;

        placed.push({ left: sx - halfW, right: sx + halfW, top: sy - halfH, bottom: sy + halfH });
        if (sameList) sameList.push([sx, sy]);
        else placedByName.set(a.name, [[sx, sy]]);
        chosen.push({ idx: i, name: a.name, cls: a.cls, sx, sy, angleDeg: (angle * 180) / Math.PI, fade });
      }
    }

    // Reuse existing pool slots for anchors that stayed visible so DOM text & transitions stay calm
    const assigned = new Map<number, StreetCandidate>();
    for (const cand of chosen) assigned.set(cand.idx, cand);
    const freeSlots: StreetSlot[] = [];
    for (const slot of streetPool) {
      const cand = slot.anchorIdx >= 0 ? assigned.get(slot.anchorIdx) : undefined;
      if (cand) {
        assigned.delete(slot.anchorIdx);
        applyStreetSlot(slot, cand);
      } else {
        freeSlots.push(slot);
      }
    }
    let freeIdx = 0;
    for (const cand of assigned.values()) {
      applyStreetSlot(freeSlots[freeIdx++], cand);
    }
    for (; freeIdx < freeSlots.length; freeIdx++) {
      const slot = freeSlots[freeIdx];
      slot.anchorIdx = -1;
      if (slot.shown) {
        slot.shown = false;
        slot.el.classList.remove('show');
      }
    }
  }

  function applyStreetSlot(slot: StreetSlot, cand: StreetCandidate) {
    slot.anchorIdx = cand.idx;
    if (slot.lastName !== cand.name) {
      slot.lastName = cand.name;
      slot.span.textContent = cand.name;
    }
    const clsName = cand.cls <= 1 ? 'label label-street major show' : cand.cls >= 3 ? 'label label-street minor show' : 'label label-street show';
    if (slot.lastCls !== clsName) {
      slot.lastCls = clsName;
      slot.el.className = clsName;
    } else if (!slot.shown) {
      slot.el.classList.add('show');
    }
    slot.shown = true;
    const transform = `translate3d(${cand.sx.toFixed(1)}px, ${cand.sy.toFixed(1)}px, 0) rotate(${cand.angleDeg.toFixed(1)}deg)`;
    if (slot.lastTransform !== transform) {
      slot.lastTransform = transform;
      slot.el.style.transform = transform;
    }
    const fadeStr = Math.max(0, cand.fade).toFixed(2);
    if (slot.lastFade !== fadeStr) {
      slot.lastFade = fadeStr;
      slot.el.style.setProperty('--fade', fadeStr);
    }
  }

  return {
    setEnabled(on: boolean) { enabled = on; dirty = true; root.classList.toggle('off', !on); },
    setActive(id: string | null) { activeId = id || null; dirty = true; },
    invalidateLayout() { frameCount = 0; dirty = true; },
    markVisited(id: string) {
      visited.add(id);
      const item = items.find((entry) => entry.place.id === id);
      if (item) item.el.classList.add('seen');
    },
    remeasure() { isMeasured = false; dirty = true; },
    get visited() { return visited; },
    get anchors() { return items.filter((item) => !item.isWater).map((item) => [item.place.id, item.pos.y]); },
    update(width: number, height: number) {
      if (!isMeasured) { measureLabels(); dirty = true; }
      curViewProj.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      const el = curViewProj.elements;
      let camMoved = width !== lastW || height !== lastH;
      if (!camMoved) {
        for (let i = 0; i < 16; i++) {
          if (Math.abs(el[i] - lastViewProj[i]) > 1e-6) { camMoved = true; break; }
        }
      }
      if (!dirty && !camMoved) return;
      dirty = false;
      lastW = width;
      lastH = height;
      for (let i = 0; i < 16; i++) lastViewProj[i] = el[i];
      // keep labels out from under the interface: its panels count as already-placed boxes
      if (frameCount++ % LAYOUT_REFRESH_FRAMES === 0) blocked = collectBlockedRects(panels);
      const placed = blocked.slice();

      // A tag already showing keeps its slot against newcomers of its own tier, and a newcomer needs a little more room
      // than a tag that is staying, so an orbit does not flip neighbouring tags on and off from frame to frame.
      const ordered = items.slice().sort(
        (a, b) => (a.priority - (a.shown ? SHOWN_PRIORITY_BONUS : 0)) - (b.priority - (b.shown ? SHOWN_PRIORITY_BONUS : 0)),
      );

      for (const item of ordered) {
        let show = enabled;
        let fade = 1;
        let screenX = 0;
        let screenY = 0;
        let onScreen = false;

        if (show) {
          const dist = camera.position.distanceTo(item.pos);
          const isActive = !item.isWater && item.place.id === activeId;
          const farLimit = TIER_MAX_DIST_M[item.place.t];
          const altCeiling = isActive ? 0 : TIER_MAX_ALT_M[item.place.t];
          const altitude = camera.position.y - item.groundY;
          show = dist < farLimit && dist > MIN_VISIBLE_DIST_M && (item.isWater || !altCeiling || !(altitude > altCeiling));
          // fade with distance (and, for lesser places, with height) instead of popping at the cut-off
          fade = Math.min(
            1,
            (farLimit - dist) / (farLimit * FADE_FRACTION),
            (dist - MIN_VISIBLE_DIST_M) / NEAR_FADE_SPAN_M,
            item.isWater || !altCeiling ? 1 : (altCeiling - altitude) / (altCeiling * FADE_FRACTION),
          );
          if (fade < MIN_FADE_ALPHA) show = false;
          projected.copy(item.pos).project(camera);
          onScreen = projected.z < 1 && projected.z > -1;
          screenX = (projected.x * 0.5 + 0.5) * width;
          screenY = (-projected.y * 0.5 + 0.5) * height;
          if (show) show = onScreen && Math.abs(projected.x) < NDC_MARGIN && Math.abs(projected.y) < NDC_MARGIN;
        }

        if (show) {
          const pad = item.shown ? 0 : NEWCOMER_PAD_PX;
          const halfW = item.width / 2 + LABEL_PAD_X_PX + pad;
          const top = (item.isWater ? screenY - item.height / 2 : screenY - item.height - LABEL_PAD_Y_PX) - pad;
          const bottom = (item.isWater ? screenY + item.height / 2 : screenY + LABEL_PAD_Y_PX) + pad;
          if (overlapsAny(placed, screenX - halfW, screenX + halfW, top, bottom)) show = false;
          else placed.push({ left: screenX - halfW + pad, right: screenX + halfW - pad, top: top + pad, bottom: bottom - pad });
        }

        // Keep moving a tag with its place while it fades out, so it doesn't ghost behind the orbiting city.
        if (onScreen && (show || item.shown)) {
          const transform = `translate3d(${screenX.toFixed(1)}px, ${screenY.toFixed(1)}px, 0)`;
          if (item.lastTransform !== transform) { item.lastTransform = transform; item.el.style.transform = transform; }
        }
        if (show) {
          const fadeStr = Math.max(0, fade).toFixed(2);
          if (item.lastFade !== fadeStr) { item.lastFade = fadeStr; item.el.style.setProperty('--fade', fadeStr); }
        }
        if (show !== item.shown) {
          item.shown = show;
          item.el.classList.toggle('show', show);
          item.el.setAttribute('aria-hidden', String(!show));
          if (!item.isWater) item.el.tabIndex = show ? 0 : -1;
        }
      }
      updateStreetLabels(width, height, placed);
    },
  };
}
