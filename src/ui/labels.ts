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

// HTML labels pinned to places. Nearer views reveal more of them, and overlapping labels yield to the more important one.
export function createLabels(root: HTMLElement, data: any, camera: THREE.PerspectiveCamera, onPick: (id: string) => void) {
  const items: LabelItem[] = [];
  data.places.forEach((place: any) => items.push(createLabelItem(root, place, false, onPick)));
  data.waterLabels.forEach((place: any) => items.push(createLabelItem(root, place, true, onPick)));
  items.sort((a, b) => a.priority - b.priority);

  const projected = new THREE.Vector3();
  const visited = new Set<string>();
  const panels = PANEL_SELECTORS.map((sel) => document.querySelector<HTMLElement>(sel)).filter(Boolean) as HTMLElement[];

  let enabled = true;
  let frameCount = 0;
  let blocked: RectBox[] = [];
  let activeId: string | null = null;
  let isMeasured = false;

  // widths taken with a fallback font are wrong once the web fonts (and their Vietnamese subsets) arrive
  if (document.fonts) {
    document.fonts.ready.then(() => { isMeasured = false; });
    document.fonts.addEventListener('loadingdone', () => { isMeasured = false; });
  }

  function measureLabels() {
    for (const item of items) {
      const span = item.el.querySelector('span')!;
      item.width = span.offsetWidth;
      item.height = span.offsetHeight + (item.isWater ? 0 : STEM_HEIGHT_PX - 2);
    }
    isMeasured = true;
  }

  return {
    setEnabled(on: boolean) { enabled = on; root.classList.toggle('off', !on); },
    setActive(id: string | null) { activeId = id || null; },
    invalidateLayout() { frameCount = 0; },
    markVisited(id: string) {
      visited.add(id);
      const item = items.find((entry) => entry.place.id === id);
      if (item) item.el.classList.add('seen');
    },
    remeasure() { isMeasured = false; },
    get visited() { return visited; },
    get anchors() { return items.filter((item) => !item.isWater).map((item) => [item.place.id, item.pos.y]); },
    update(width: number, height: number) {
      if (!isMeasured) measureLabels();
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
    },
  };
}
