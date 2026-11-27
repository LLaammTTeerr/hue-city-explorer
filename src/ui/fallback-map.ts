import { getLang } from './content.ts';
import { localizedPlaceName, localizedWaterName } from './place-names-en.ts';

const SVG_NS = 'http://www.w3.org/2000/svg';
const DECIMETRES_PER_METRE = 10;
const INITIAL_METRES_PER_PX = 10;
const MIN_METRES_PER_PX = 0.4;
const MAX_METRES_PER_PX = 40;
const FOCUS_MAX_METRES_PER_PX = 2.2;
const FIT_MIN_VIEW_PX = 100;
const FIT_PAD_X_PX = 80;
const FIT_PAD_Y_PX = 200;
const WIDE_BREAKPOINT_PX = 720;
const CARD_OFFSET_MAX_PX = 220;
const DRAG_THRESHOLD_PX = 4;
const WHEEL_LINE_SCALE = 0.05;
const WHEEL_PIXEL_SCALE = 0.0015;

const MARKER_RADIUS_PX = { selected: 7, tier1: 5, tier2: 4, default: 3 } as const;
const MARKER_STROKE_PX = 1.5;
const LABEL_OFFSET_X_PX = 9;
const LABEL_OFFSET_Y_PX = 4;
const LABEL_FONT_LARGE_PX = 13;
const LABEL_FONT_SMALL_PX = 11.5;
const LABEL_STROKE_PX = 3;
const TIER2_LABEL_MAX_MPP = 9;
const MINOR_LABEL_MAX_MPP = 3.5;
const WATER_LABEL_MAX_MPP = 6;
const WALL_STROKE_PX = 1.6;

interface MapMarker {
  place: any;
  group: SVGGElement;
  circle: SVGCircleElement;
  label: SVGTextElement;
  title: SVGTitleElement;
  x: number;
  z: number;
}

interface WaterLabelItem {
  rawName: string;
  textEl: SVGTextElement;
}

interface MapViewState {
  centerX: number;
  centerZ: number;
  metresPerPx: number;
  selectedId: string | null;
  focusedId: string | null;
  hasMoved: boolean;
}

function formatWaterText(viName: string, lang: string): string {
  const mapped = localizedWaterName(viName, lang);
  if (lang === 'en' && mapped === viName && !viName.startsWith('Sông ')) {
    const prefixed = localizedWaterName(`Sông ${viName}`, lang);
    if (prefixed !== `Sông ${viName}`) return prefixed;
  }
  return mapped;
}

function ringToSvgPath(ring: number[]): string {
  let pathData = '';
  for (let i = 0; i < ring.length; i += 2) {
    pathData += `${i ? 'L' : 'M'}${ring[i]} ${ring[i + 1]}`;
  }
  return `${pathData}Z`;
}

function appendPolysLayer(svg: SVGSVGElement, polys: number[][][], className: string): SVGPathElement {
  const pathEl = document.createElementNS(SVG_NS, 'path');
  pathEl.setAttribute('d', polys.map((poly) => poly.map(ringToSvgPath).join('')).join(''));
  pathEl.setAttribute('class', className);
  svg.append(pathEl);
  return pathEl;
}

function buildMapLayers(
  svg: SVGSVGElement,
  index: any,
  state: MapViewState,
  onPick: ((id: string) => void) | null,
  onFocusChange: () => void,
): { waterLayer: SVGGElement; waterItems: WaterLabelItem[]; markers: MapMarker[] } {
  const lang = getLang();
  const mapData = index.map || {};
  appendPolysLayer(svg, mapData.land || [], 'land');
  appendPolysLayer(svg, mapData.wall || [], 'wall');

  const waterItems: WaterLabelItem[] = [];
  const waterLayer = document.createElementNS(SVG_NS, 'g');
  waterLayer.setAttribute('aria-hidden', 'true');
  for (const label of index.waterLabels || []) {
    const rawName: string = label.n ?? label.name ?? '';
    const textEl = document.createElementNS(SVG_NS, 'text');
    textEl.setAttribute('class', `water t${label.t}`);
    textEl.textContent = formatWaterText(rawName, lang);
    textEl.dataset.x = String(label.x / DECIMETRES_PER_METRE);
    textEl.dataset.z = String(label.z / DECIMETRES_PER_METRE);
    waterLayer.append(textEl);
    waterItems.push({ rawName, textEl });
  }
  svg.append(waterLayer);

  const markers: MapMarker[] = [];
  const markerLayer = document.createElementNS(SVG_NS, 'g');
  for (const place of [...index.places].sort((a, b) => b.t - a.t)) {
    const name = localizedPlaceName(place.id, place.n, lang);
    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('class', `pt t${place.t} k-${place.k}`);
    group.setAttribute('tabindex', '0');
    group.setAttribute('role', 'button');
    group.setAttribute('aria-label', name);
    const circle = document.createElementNS(SVG_NS, 'circle');
    const label = document.createElementNS(SVG_NS, 'text');
    label.textContent = name;
    const title = document.createElementNS(SVG_NS, 'title');
    title.textContent = name;
    group.append(title, circle, label);
    group.addEventListener('click', (event) => {
      if (!state.hasMoved) { event.stopPropagation(); onPick?.(place.id); }
    });
    group.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        onPick?.(place.id);
      }
    });
    group.addEventListener('focus', () => {
      state.focusedId = place.id;
      onFocusChange();
    });
    group.addEventListener('blur', () => {
      if (state.focusedId === place.id) {
        state.focusedId = null;
        onFocusChange();
      }
    });
    markerLayer.append(group);
    markers.push({ place, group, circle, label, title, x: place.x / DECIMETRES_PER_METRE, z: place.z / DECIMETRES_PER_METRE });
  }
  svg.append(markerLayer);
  return { waterLayer, waterItems, markers };
}

function bindMapInteractions(
  svg: SVGSVGElement,
  state: MapViewState,
  applyView: () => void,
  zoomAt: (clientX: number, clientY: number, scaleFactor: number) => void,
  isFlatActive: () => boolean,
): void {
  const pointers = new Map<number, { x: number; y: number }>();
  let pinchDist = 0;

  svg.addEventListener('pointerdown', (event) => {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1) state.hasMoved = false;
    if (pointers.size === 2) {
      const [first, second] = [...pointers.values()];
      pinchDist = Math.hypot(first.x - second.x, first.y - second.y);
    }
  });

  svg.addEventListener('pointermove', (event) => {
    const prev = pointers.get(event.pointerId);
    if (!prev) return;
    if (pointers.size === 1) {
      const dx = event.clientX - prev.x;
      const dy = event.clientY - prev.y;
      if (!state.hasMoved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      if (!state.hasMoved) svg.setPointerCapture(event.pointerId);
      state.hasMoved = true;
      state.centerX -= dx * state.metresPerPx;
      state.centerZ -= dy * state.metresPerPx;
    }
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) {
      state.hasMoved = true;
      const [first, second] = [...pointers.values()];
      const dist = Math.hypot(first.x - second.x, first.y - second.y);
      if (pinchDist > 0 && dist > 0) zoomAt((first.x + second.x) / 2, (first.y + second.y) / 2, pinchDist / dist);
      pinchDist = dist;
      return;
    }
    applyView();
  });

  const handlePointerUp = (event: PointerEvent) => { pointers.delete(event.pointerId); pinchDist = 0; };
  svg.addEventListener('pointerup', handlePointerUp);
  svg.addEventListener('pointercancel', handlePointerUp);
  svg.addEventListener('wheel', (event) => {
    event.preventDefault();
    const scale = Math.exp(event.deltaY * (event.deltaMode ? WHEEL_LINE_SCALE : WHEEL_PIXEL_SCALE));
    zoomAt(event.clientX, event.clientY, scale);
  }, { passive: false });
  addEventListener('resize', () => { if (isFlatActive()) applyView(); });
}

// A 2D SVG plan of the place points over the land (water is the background), north up, in metres.
export function buildFallbackMap(opts: {
  index: any;
  ui: any;
  onPick: ((id: string) => void) | null;
  isFlatActive: () => boolean;
}) {
  const { index, ui, onPick, isFlatActive } = opts;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.id = 'map2d';
  svg.setAttribute('role', 'region');
  svg.setAttribute('hidden', '');

  const state: MapViewState = {
    centerX: 0,
    centerZ: 0,
    metresPerPx: INITIAL_METRES_PER_PX,
    selectedId: null,
    focusedId: null,
    hasMoved: false,
  };

  const { waterLayer, waterItems, markers } = buildMapLayers(svg, index, state, onPick, () => applyView());
  svg.addEventListener('click', () => { if (!state.hasMoved && ui?.cardId) ui.hideCard(); });
  document.getElementById('labels')!.before(svg);

  function relabel() {
    const lang = getLang();
    for (const marker of markers) {
      const name = localizedPlaceName(marker.place.id, marker.place.n, lang);
      if (marker.label.textContent !== name) {
        marker.label.textContent = name;
        marker.title.textContent = name;
        marker.group.setAttribute('aria-label', name);
      }
    }
    for (const water of waterItems) {
      const name = formatWaterText(water.rawName, lang);
      if (water.textEl.textContent !== name) {
        water.textEl.textContent = name;
      }
    }
  }

  const langObserver = new MutationObserver(() => relabel());
  langObserver.observe(svg, { attributes: true, attributeFilter: ['aria-label'] });
  if (document.documentElement) {
    langObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  }

  function applyView() {
    const width = svg.clientWidth || innerWidth;
    const height = svg.clientHeight || innerHeight;
    const mpp = state.metresPerPx;
    svg.setAttribute('viewBox', `${state.centerX - (width / 2) * mpp} ${state.centerZ - (height / 2) * mpp} ${width * mpp} ${height * mpp}`);
    for (const marker of markers) {
      const isMajor = marker.place.t === 1;
      const isSelected = marker.place.id === state.selectedId;
      const isFocused = marker.place.id === state.focusedId;
      const radius = isSelected || isFocused ? MARKER_RADIUS_PX.selected : isMajor ? MARKER_RADIUS_PX.tier1 : marker.place.t === 2 ? MARKER_RADIUS_PX.tier2 : MARKER_RADIUS_PX.default;
      marker.circle.setAttribute('cx', String(marker.x));
      marker.circle.setAttribute('cy', String(marker.z));
      marker.circle.setAttribute('r', String(radius * mpp));
      marker.circle.setAttribute('stroke-width', String(MARKER_STROKE_PX * mpp));
      const showLabel = isSelected || isFocused || isMajor || (marker.place.t === 2 && mpp < TIER2_LABEL_MAX_MPP) || mpp < MINOR_LABEL_MAX_MPP;
      marker.label.style.display = showLabel ? '' : 'none';
      marker.label.setAttribute('x', String(marker.x + LABEL_OFFSET_X_PX * mpp));
      marker.label.setAttribute('y', String(marker.z + LABEL_OFFSET_Y_PX * mpp));
      marker.label.setAttribute('font-size', String((isMajor || isSelected || isFocused ? LABEL_FONT_LARGE_PX : LABEL_FONT_SMALL_PX) * mpp));
      marker.label.setAttribute('stroke-width', String(LABEL_STROKE_PX * mpp));
      marker.group.classList.toggle('on', isSelected);
    }
    for (const textEl of [...waterLayer.children] as SVGTextElement[]) {
      textEl.setAttribute('x', textEl.dataset.x!);
      textEl.setAttribute('y', textEl.dataset.z!);
      textEl.setAttribute('font-size', String(LABEL_FONT_LARGE_PX * mpp));
      textEl.style.display = textEl.classList.contains('t1') || mpp < WATER_LABEL_MAX_MPP ? '' : 'none';
    }
    svg.querySelector('.wall')?.setAttribute('stroke-width', String(WALL_STROKE_PX * mpp));
  }

  function fit() {
    const xs = markers.map((marker) => marker.x);
    const zs = markers.map((marker) => marker.z);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minZ = Math.min(...zs), maxZ = Math.max(...zs);
    state.centerX = (minX + maxX) / 2;
    state.centerZ = (minZ + maxZ) / 2;
    const width = svg.clientWidth || innerWidth;
    const height = svg.clientHeight || innerHeight;
    state.metresPerPx = Math.max(
      (maxX - minX) / Math.max(FIT_MIN_VIEW_PX, width - FIT_PAD_X_PX),
      (maxZ - minZ) / Math.max(FIT_MIN_VIEW_PX, height - FIT_PAD_Y_PX),
    );
    applyView();
  }

  function focusOn(id: string) {
    const marker = markers.find((item) => item.place.id === id);
    state.selectedId = id;
    if (marker) {
      state.metresPerPx = Math.min(state.metresPerPx, FOCUS_MAX_METRES_PER_PX);
      const width = svg.clientWidth || innerWidth;
      const height = svg.clientHeight || innerHeight;
      const offsetX = width > WIDE_BREAKPOINT_PX ? Math.min(CARD_OFFSET_MAX_PX, width / 4) : 0;
      const offsetZ = width > WIDE_BREAKPOINT_PX ? 0 : -height / 5;
      state.centerX = marker.x - offsetX * state.metresPerPx;
      state.centerZ = marker.z - offsetZ * state.metresPerPx;
    }
    applyView();
  }

  function zoomAt(clientX: number, clientY: number, scaleFactor: number) {
    const rect = svg.getBoundingClientRect();
    const worldX = state.centerX + (clientX - rect.left - rect.width / 2) * state.metresPerPx;
    const worldZ = state.centerZ + (clientY - rect.top - rect.height / 2) * state.metresPerPx;
    const nextMpp = Math.max(MIN_METRES_PER_PX, Math.min(MAX_METRES_PER_PX, state.metresPerPx * scaleFactor));
    state.centerX = worldX + (state.centerX - worldX) * (nextMpp / state.metresPerPx);
    state.centerZ = worldZ + (state.centerZ - worldZ) * (nextMpp / state.metresPerPx);
    state.metresPerPx = nextMpp;
    applyView();
  }

  bindMapInteractions(svg, state, applyView, zoomAt, isFlatActive);

  return {
    svg,
    fit,
    focusOn,
    relabel,
    select(id: string | null) { state.selectedId = id; applyView(); },
    zoom: (factor: number) => zoomAt(innerWidth / 2, innerHeight / 2, factor),
  };
}
