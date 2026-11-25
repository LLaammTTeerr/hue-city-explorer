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

function ringToSvgPath(ring: number[]) {
  let pathData = '';
  for (let i = 0; i < ring.length; i += 2) {
    pathData += `${i ? 'L' : 'M'}${ring[i]} ${ring[i + 1]}`;
  }
  return `${pathData}Z`;
}

function appendPolysLayer(svg: SVGSVGElement, polys: number[][][], className: string) {
  const pathEl = document.createElementNS(SVG_NS, 'path');
  pathEl.setAttribute('d', polys.map((poly) => poly.map(ringToSvgPath).join('')).join(''));
  pathEl.setAttribute('class', className);
  svg.append(pathEl);
  return pathEl;
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
  svg.setAttribute('role', 'img');
  svg.setAttribute('hidden', '');

  const mapData = index.map || {};
  appendPolysLayer(svg, mapData.land || [], 'land');
  appendPolysLayer(svg, mapData.wall || [], 'wall');

  const waterLayer = document.createElementNS(SVG_NS, 'g');
  for (const label of index.waterLabels || []) {
    const textEl = document.createElementNS(SVG_NS, 'text');
    textEl.setAttribute('class', `water t${label.t}`);
    textEl.textContent = label.n;
    textEl.dataset.x = String(label.x / DECIMETRES_PER_METRE);
    textEl.dataset.z = String(label.z / DECIMETRES_PER_METRE);
    waterLayer.append(textEl);
  }
  svg.append(waterLayer);

  let hasMoved = false;
  const markers: { place: any; group: SVGGElement; circle: SVGCircleElement; label: SVGTextElement; x: number; z: number }[] = [];
  const markerLayer = document.createElementNS(SVG_NS, 'g');
  // biggest tier last, so the main landmarks draw over the minor ones
  for (const place of [...index.places].sort((a, b) => b.t - a.t)) {
    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('class', `pt t${place.t} k-${place.k}`);
    const circle = document.createElementNS(SVG_NS, 'circle');
    const label = document.createElementNS(SVG_NS, 'text');
    label.textContent = place.n;
    const title = document.createElementNS(SVG_NS, 'title');
    title.textContent = place.n;
    group.append(title, circle, label);
    group.addEventListener('click', (event) => {
      if (!hasMoved) { event.stopPropagation(); onPick?.(place.id); }
    });
    markerLayer.append(group);
    markers.push({ place, group, circle, label, x: place.x / DECIMETRES_PER_METRE, z: place.z / DECIMETRES_PER_METRE });
  }
  svg.append(markerLayer);
  svg.addEventListener('click', () => { if (!hasMoved && ui?.cardId) ui.hideCard(); });
  document.getElementById('labels')!.before(svg);

  // ---- view: centre (centerX, centerZ) in metres and metresPerPx ----
  let centerX = 0;
  let centerZ = 0;
  let metresPerPx = INITIAL_METRES_PER_PX;
  let selectedId: string | null = null;

  function applyView() {
    const width = svg.clientWidth || innerWidth;
    const height = svg.clientHeight || innerHeight;
    svg.setAttribute('viewBox', `${centerX - (width / 2) * metresPerPx} ${centerZ - (height / 2) * metresPerPx} ${width * metresPerPx} ${height * metresPerPx}`);
    for (const marker of markers) {
      const isMajor = marker.place.t === 1;
      const isSelected = marker.place.id === selectedId;
      const radius = isSelected ? MARKER_RADIUS_PX.selected : isMajor ? MARKER_RADIUS_PX.tier1 : marker.place.t === 2 ? MARKER_RADIUS_PX.tier2 : MARKER_RADIUS_PX.default;
      marker.circle.setAttribute('cx', String(marker.x));
      marker.circle.setAttribute('cy', String(marker.z));
      marker.circle.setAttribute('r', String(radius * metresPerPx));
      marker.circle.setAttribute('stroke-width', String(MARKER_STROKE_PX * metresPerPx));
      const showLabel = isSelected || isMajor || (marker.place.t === 2 && metresPerPx < TIER2_LABEL_MAX_MPP) || metresPerPx < MINOR_LABEL_MAX_MPP;
      marker.label.style.display = showLabel ? '' : 'none';
      marker.label.setAttribute('x', String(marker.x + LABEL_OFFSET_X_PX * metresPerPx));
      marker.label.setAttribute('y', String(marker.z + LABEL_OFFSET_Y_PX * metresPerPx));
      marker.label.setAttribute('font-size', String((isMajor || isSelected ? LABEL_FONT_LARGE_PX : LABEL_FONT_SMALL_PX) * metresPerPx));
      marker.label.setAttribute('stroke-width', String(LABEL_STROKE_PX * metresPerPx));
      marker.group.classList.toggle('on', isSelected);
    }
    for (const textEl of [...waterLayer.children] as SVGTextElement[]) {
      textEl.setAttribute('x', textEl.dataset.x!);
      textEl.setAttribute('y', textEl.dataset.z!);
      textEl.setAttribute('font-size', String(LABEL_FONT_LARGE_PX * metresPerPx));
      textEl.style.display = textEl.classList.contains('t1') || metresPerPx < WATER_LABEL_MAX_MPP ? '' : 'none';
    }
    svg.querySelector('.wall')?.setAttribute('stroke-width', String(WALL_STROKE_PX * metresPerPx));
  }

  function fit() {
    const xs = markers.map((marker) => marker.x);
    const zs = markers.map((marker) => marker.z);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);
    centerX = (minX + maxX) / 2;
    centerZ = (minZ + maxZ) / 2;
    const width = svg.clientWidth || innerWidth;
    const height = svg.clientHeight || innerHeight;
    metresPerPx = Math.max(
      (maxX - minX) / Math.max(FIT_MIN_VIEW_PX, width - FIT_PAD_X_PX),
      (maxZ - minZ) / Math.max(FIT_MIN_VIEW_PX, height - FIT_PAD_Y_PX),
    );
    applyView();
  }

  function focusOn(id: string) {
    const marker = markers.find((item) => item.place.id === id);
    selectedId = id;
    if (marker) {
      metresPerPx = Math.min(metresPerPx, FOCUS_MAX_METRES_PER_PX);
      // keep the point clear of the card: on a wide window the card is on the left, on a phone at the bottom
      const width = svg.clientWidth || innerWidth;
      const height = svg.clientHeight || innerHeight;
      const offsetX = width > WIDE_BREAKPOINT_PX ? Math.min(CARD_OFFSET_MAX_PX, width / 4) : 0;
      const offsetZ = width > WIDE_BREAKPOINT_PX ? 0 : -height / 5;
      centerX = marker.x - offsetX * metresPerPx;
      centerZ = marker.z - offsetZ * metresPerPx;
    }
    applyView();
  }

  function zoomAt(clientX: number, clientY: number, scaleFactor: number) {
    const rect = svg.getBoundingClientRect();
    const worldX = centerX + (clientX - rect.left - rect.width / 2) * metresPerPx;
    const worldZ = centerZ + (clientY - rect.top - rect.height / 2) * metresPerPx;
    const nextMpp = Math.max(MIN_METRES_PER_PX, Math.min(MAX_METRES_PER_PX, metresPerPx * scaleFactor));
    centerX = worldX + (centerX - worldX) * (nextMpp / metresPerPx);
    centerZ = worldZ + (centerZ - worldZ) * (nextMpp / metresPerPx);
    metresPerPx = nextMpp;
    applyView();
  }

  // ---- pan and zoom: drag, wheel, two-finger pinch ----
  const pointers = new Map<number, { x: number; y: number }>();
  let pinchDist = 0;

  svg.addEventListener('pointerdown', (event) => {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1) hasMoved = false;
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
      if (!hasMoved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      if (!hasMoved) svg.setPointerCapture(event.pointerId);
      hasMoved = true;
      centerX -= dx * metresPerPx;
      centerZ -= dy * metresPerPx;
    }
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) {
      hasMoved = true;
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

  return {
    svg,
    fit,
    focusOn,
    select(id: string | null) { selectedId = id; applyView(); },
    zoom: (factor: number) => zoomAt(innerWidth / 2, innerHeight / 2, factor),
  };
}
