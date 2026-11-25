import { STR, NOTES, QUICK } from './content.ts';
import { createSearch } from './search.ts';
import { isCoarse } from '../config.ts';

const DECIMETRES_PER_METRE = 10;
const METRES_PER_DEG_LAT = 110574;
const METRES_PER_DEG_LON_EQ = 111319.49;
const CARD_IMAGE_MAX_ASPECT = 0.72;
const AUTHOR_MAX_LEN = 60;
const HINT_DEFAULT_MS = 5200;
const HINT_FIRST_MS = 7000;
const HINT_LABELS_OFF_MS = 4200;
const ZOOM_IN_FACTOR = 0.6;
const ZOOM_OUT_FACTOR = 1.6;
const TIME_OF_DAY_COUNT = 3;
const TIME_NIGHT_THRESHOLD = 1.55;
const BREAKPOINT_NARROW_PX = 720;
const BREAKPOINT_MID_PX = 900;
const THEME_COLOR_NIGHT = '#1d1727';
const THEME_COLOR_DAY = '#f5efe2';
const HEADING_TENTHS_FACTOR = 1800;

const byId = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const setVisible = (id: string, visible: boolean) => { byId(id).hidden = !visible; };

const store = {
  get(key: string) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key: string, val: string) { try { localStorage.setItem(key, val); } catch { /* not kept */ } },
};

function parseWebUrl(rawUrl: string | undefined): URL | null {
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl, location.href);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed : null;
  } catch {
    return null;
  }
}

function formatPlaceCoords(place: { x: number; z: number }, origin: { lat: number; lon: number }): string {
  const lat = origin.lat - place.z / DECIMETRES_PER_METRE / METRES_PER_DEG_LAT;
  const lon = origin.lon + place.x / DECIMETRES_PER_METRE / (Math.cos((origin.lat * Math.PI) / 180) * METRES_PER_DEG_LON_EQ);
  return `${lat.toFixed(4)}° N · ${lon.toFixed(4)}° E`;
}

function buildQuickStrip(placeById: Map<string, any>, handlers: any) {
  const listEl = byId('places');
  const buttons = new Map<string, HTMLButtonElement>();
  const overviewBtn = document.createElement('button');
  overviewBtn.type = 'button';
  overviewBtn.className = 'ov';
  overviewBtn.dataset.t = 'overview';
  overviewBtn.addEventListener('click', () => handlers.overview());
  listEl.appendChild(overviewBtn);

  for (const id of QUICK) {
    const place = placeById.get(id);
    if (!place) continue;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = place.n;
    btn.addEventListener('click', () => handlers.pick(id, true));
    listEl.appendChild(btn);
    buttons.set(id, btn);
  }
  return { listEl, buttons };
}

function createHintController() {
  let timer = 0;
  function hint(text: string, durationMs = HINT_DEFAULT_MS) {
    const el = byId('hint');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(timer);
    if (durationMs) timer = setTimeout(() => el.classList.remove('show'), durationMs);
  }
  function hideHint() {
    clearTimeout(timer);
    byId('hint').classList.remove('show');
  }
  return { hint, hideHint };
}

function renderCardDetails(
  place: any,
  story: any,
  lang: string,
  strings: any,
  origin: { lat: number; lon: number },
  pickLocalized: (obj: any) => [string, string],
  setTextWithLang: (el: HTMLElement, text: string, textLang?: string) => void,
): void {
  const note = NOTES[place.id] || (place.k === 'gate' ? NOTES.gate : null);

  const kind = pickLocalized(story && story.kind);
  if (kind[0]) setTextWithLang(byId('card-kind'), ...kind);
  else setTextWithLang(byId('card-kind'), strings.kinds[place.k] || strings.kinds.place);

  const title = lang === 'en' && story && pickLocalized(story.title);
  if (title && title[0]) setTextWithLang(byId('card-name'), ...title);
  else setTextWithLang(byId('card-name'), place.n, 'vi');

  setTextWithLang(byId('card-when'), ...pickLocalized(story && story.when));
  setVisible('card-when', !!(story && story.when));

  const summary = pickLocalized(story && story.summary);
  if (summary[0]) setTextWithLang(byId('card-note'), ...summary);
  else setTextWithLang(byId('card-note'), note ? note[lang] : '');

  const storyEl = byId('card-story');
  storyEl.textContent = '';
  const [storyText, storyLang] = pickLocalized(story && story.story);
  for (const para of storyText.split(/\n\s*\n/)) {
    if (!para.trim()) continue;
    const paragraphEl = document.createElement('p');
    setTextWithLang(paragraphEl, para.trim(), storyLang);
    storyEl.append(paragraphEl);
  }
  setVisible('card-story', storyEl.childElementCount > 0);

  const factsEl = byId('card-facts');
  factsEl.textContent = '';
  for (const fact of (story && story.facts) || []) {
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    setTextWithLang(dt, ...pickLocalized(fact.label));
    setTextWithLang(dd, ...pickLocalized(fact.value));
    factsEl.append(dt, dd);
  }
  setVisible('card-facts', factsEl.childElementCount > 0);

  const sourcesEl = byId('card-sources');
  sourcesEl.textContent = '';
  const sourceList = (story && story.sources) || [];
  if (sourceList.length) {
    sourcesEl.append(`${strings.sources}: `);
    sourceList.forEach((source: any, idx: number) => {
      const url = parseWebUrl(source.url);
      const linkNode: HTMLAnchorElement | HTMLSpanElement = url
        ? Object.assign(document.createElement('a'), { href: url.href, target: '_blank', rel: 'noopener' })
        : document.createElement('span');
      linkNode.textContent = source.title || (url ? url.hostname : '');
      sourcesEl.append(linkNode, idx < sourceList.length - 1 ? ' · ' : '');
    });
  }
  setVisible('card-sources', sourceList.length > 0);
  byId('card-meta').textContent = formatPlaceCoords(place, origin);
}

function bindToolbarEvents(opts: {
  handlers: any;
  timeButtons: HTMLButtonElement[];
  getLang: () => string;
  getTimeIdx: () => number;
  getCurrentPlace: () => any;
  pickLang: (nextLang: string) => void;
  hideCard: () => void;
  nextShot: () => void;
  applyText: () => void;
  toggleCaptureMenu: (focusFirst?: boolean) => void;
  closeCaptureMenu: () => void;
  pickCapturePreset: (preset: string) => void;
}): void {
  const {
    handlers, timeButtons, getLang, getTimeIdx, getCurrentPlace, pickLang, hideCard, nextShot, applyText,
    toggleCaptureMenu, closeCaptureMenu, pickCapturePreset,
  } = opts;

  document.querySelectorAll<HTMLButtonElement>('#seg-lang button').forEach((btn) => {
    btn.addEventListener('click', () => { if (btn.dataset.lang && btn.dataset.lang !== getLang()) pickLang(btn.dataset.lang); });
  });
  new ResizeObserver(([entry]) => {
    const heightPx = Math.ceil(entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height);
    document.documentElement.style.setProperty('--tools-h', `${heightPx}px`);
  }).observe(byId('tools'));

  byId('btn-labels').addEventListener('click', () => handlers.labels());
  byId('btn-look').addEventListener('click', () => handlers.look());
  const captureBtn = byId('btn-capture');
  const captureMenu = byId('capture-menu');
  const captureItems = [...captureMenu.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')];
  captureBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleCaptureMenu(event.detail === 0);
  });
  captureItems.forEach((btn) => {
    btn.addEventListener('click', () => {
      closeCaptureMenu();
      if (btn.dataset.preset) pickCapturePreset(btn.dataset.preset);
    });
  });
  captureMenu.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeCaptureMenu();
      captureBtn.focus();
      return;
    }
    const delta = ({ ArrowUp: -1, ArrowDown: 1 } as Record<string, number>)[event.key];
    if (!delta) return;
    event.preventDefault();
    const cur = captureItems.indexOf(document.activeElement as HTMLButtonElement);
    captureItems[(cur + delta + captureItems.length) % captureItems.length].focus();
  });
  document.addEventListener('pointerdown', (event) => {
    if (!captureMenu.hidden && !byId('capture-wrap').contains(event.target as Node)) closeCaptureMenu();
  });
  const searchInput = byId<HTMLInputElement>('q');
  const syncSearchHasQ = () => byId('search').classList.toggle('has-q', searchInput.value.trim().length > 0);
  searchInput.addEventListener('input', syncSearchHasQ);
  byId('q-clear').addEventListener('click', syncSearchHasQ);
  byId('btn-about').addEventListener('click', () => byId<HTMLDialogElement>('about').showModal());
  byId('btn-share').addEventListener('click', () => handlers.share(getCurrentPlace()?.id));
  byId('card-share').addEventListener('click', () => handlers.share(getCurrentPlace()?.id));
  byId('attrib').addEventListener('click', () => byId<HTMLDialogElement>('about').showModal());
  byId('about-close').addEventListener('click', () => byId<HTMLDialogElement>('about').close());
  byId('about').addEventListener('click', (event) => { if (event.target === byId('about')) byId<HTMLDialogElement>('about').close(); });
  byId('osm-only').addEventListener('change', (event) => handlers.osmOnly((event.target as HTMLInputElement).checked));
  byId('btn-home').addEventListener('click', () => handlers.home());
  byId('btn-zin').addEventListener('click', () => handlers.zoom(ZOOM_IN_FACTOR));
  byId('btn-zout').addEventListener('click', () => handlers.zoom(ZOOM_OUT_FACTOR));
  byId('card-close').addEventListener('click', () => { hideCard(); handlers.cardClosed(); });
  byId('card-shot').addEventListener('click', nextShot);
  byId('btn-rain').addEventListener('click', () => handlers.rain());

  const timeSlider = byId<HTMLInputElement>('time-slider');
  timeSlider.addEventListener('input', () => handlers.time(parseFloat(timeSlider.value)));
  timeButtons.forEach((btn) => btn.addEventListener('click', () => handlers.time(+btn.dataset.time!)));
  byId('seg-time').addEventListener('keydown', (event) => {
    const delta = ({ ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 } as Record<string, number>)[event.key];
    if (!delta) return;
    event.preventDefault();
    event.stopPropagation();
    const nextIdx = (Math.round(getTimeIdx()) + delta + TIME_OF_DAY_COUNT) % TIME_OF_DAY_COUNT;
    handlers.time(nextIdx);
    timeButtons[nextIdx].focus();
  });

  let isNarrow = innerWidth <= BREAKPOINT_NARROW_PX;
  let isMid = innerWidth < BREAKPOINT_MID_PX;
  addEventListener('resize', () => {
    if (isNarrow === (innerWidth <= BREAKPOINT_NARROW_PX) && isMid === (innerWidth < BREAKPOINT_MID_PX)) return;
    isNarrow = innerWidth <= BREAKPOINT_NARROW_PX;
    isMid = innerWidth < BREAKPOINT_MID_PX;
    applyText();
  });
}

export function createUI(data: any, handlers: any) {
  let lang = (store.get('hue-lang') || (navigator.language || 'vi').slice(0, 2)) === 'vi' ? 'vi' : 'en';
  const liveIds = new Set(['top-left', 'card']);
  const behindLoader = [...document.body.children].filter(
    (el) => el.id !== 'loader' && el.tagName !== 'SCRIPT' && !liveIds.has(el.id),
  ) as HTMLElement[];

  function lock() {
    byId('loader').classList.remove('done');
    document.body.classList.add('loading');
    behindLoader.forEach((el) => { el.inert = true; });
  }
  lock();

  let strings = STR[lang];
  let currentPlace: any = null;
  const placeById = new Map<string, any>(data.places.map((place: any) => [place.id, place]));
  const seen = new Set<string>();
  const origin = data.meta.origin;

  const { listEl, buttons: listButtons } = buildQuickStrip(placeById, handlers);
  const { hint, hideHint } = createHintController();

  let stories: Record<string, any> | null = null;
  let storiesAsked = false;
  let shotIndex = 0;
  let mediaGen = 0;
  let openerEl: Element | null = null;
  let timeIdx = 1;
  let capturePreset = 'screen';

  function refreshCaptureSizes() {
    document.querySelectorAll<HTMLButtonElement>('#capture-menu [role="menuitem"]').forEach((btn) => {
      const size = btn.dataset.preset && handlers.captureSize?.(btn.dataset.preset);
      const small = btn.querySelector('small');
      if (small) small.textContent = size ? `${size.width}×${size.height}` : '';
    });
  }

  function closeCaptureMenu() {
    const menu = byId('capture-menu');
    if (menu.hidden) return;
    menu.hidden = true;
    byId('btn-capture').setAttribute('aria-expanded', 'false');
  }

  function toggleCaptureMenu(focusFirst = false) {
    const menu = byId('capture-menu');
    const opening = menu.hidden;
    if (!opening) { closeCaptureMenu(); return; }
    refreshCaptureSizes();
    menu.hidden = false;
    byId('btn-capture').setAttribute('aria-expanded', 'true');
    if (focusFirst) menu.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
  }

  const pickLocalized = (obj: any): [string, string] => (
    !obj ? ['', lang] : obj[lang] ? [obj[lang], lang] : obj.vi ? [obj.vi, 'vi'] : obj.en ? [obj.en, 'en'] : ['', lang]
  );
  const setTextWithLang = (el: HTMLElement, text: string, textLang = lang) => {
    el.textContent = text;
    if (textLang !== lang) el.lang = textLang;
    else el.removeAttribute('lang');
  };

  const search = createSearch({
    places: data.places,
    T: () => strings,
    Tof: (code: string) => STR[code],
    lang: () => lang,
    stories: () => stories,
    loadStories: () => loadStories(),
    seen,
    currentId: () => currentPlace && currentPlace.id,
    pick: (id: string, from: HTMLElement) => handlers.pick(id, true, from),
    overview: () => handlers.overview(),
    clear: () => { hideCard(); handlers.cardClosed(); },
  });

  function refreshQuickStrip() {
    listButtons.forEach((btn, id) => {
      const place = placeById.get(id);
      const story = stories && stories[id];
      const title = lang === 'en' && story && pickLocalized(story.title);
      btn.textContent = (title && title[0]) || place.n;
    });
  }

  function applyText() {
    strings = STR[lang];
    document.documentElement.lang = lang;
    document.title = `Huế · ${strings.tagline}`;
    document.querySelectorAll<HTMLElement>('[data-t]').forEach((el) => { el.textContent = strings[el.dataset.t!]; });
    listEl.setAttribute('aria-label', strings.places);
    refreshQuickStrip();
    search.refresh(currentPlace);

    const rainTip = byId('btn-rain').getAttribute('aria-pressed') === 'true' ? strings.rainOn : strings.rain;
    byId('btn-rain').querySelector('span')!.textContent = rainTip;
    byId('seg-lang').setAttribute('aria-label', strings.langGroup);
    document.querySelectorAll<HTMLButtonElement>('#seg-lang button').forEach(
      (btn) => btn.setAttribute('aria-checked', String(btn.dataset.lang === lang)),
    );
    const tooltips: Record<string, string> = {
      'btn-capture': strings.capture, 'btn-share': strings.share, 'btn-labels': strings.labels, 'btn-look': strings.look,
      'btn-about': strings.about, 'btn-home': strings.home, 'btn-zin': strings.zoomIn,
      'btn-zout': strings.zoomOut, 'card-close': strings.close, 'about-close': strings.close,
      'btn-rain': rainTip,
    };
    document.querySelectorAll<HTMLButtonElement>('#seg-time button').forEach((btn) => {
      const idx = +btn.dataset.time!;
      const tip = strings.times[idx];
      btn.textContent = strings.timesShort[idx];
      btn.title = tip;
      btn.setAttribute('aria-label', tip);
    });
    byId('time-slider').setAttribute('aria-label', strings.timeOfDay);
    for (const [id, tip] of Object.entries(tooltips)) {
      byId(id).title = tip;
      byId(id).setAttribute('aria-label', tip);
    }

    byId('plaque-sub').textContent = strings.plaqueSub;
    const formatCount = (val: number) => val.toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US');
    const totalBuildings = (data.meta.counts?.buildings || 0) + (data.meta.counts?.infill || 0);
    byId('stat-buildings').textContent = formatCount(totalBuildings);
    byId('stat-places').textContent = formatCount(data.places.length);
    byId('stat-coords').textContent = `${origin.lat.toFixed(2)}°N`;

    byId('attrib').textContent = strings.attrib;
    byId('about-title').textContent = strings.aboutTitle;
    byId('about-body').innerHTML = strings.aboutBody
      .replace('{buildings}', formatCount(data.meta.counts.buildings))
      .replace('{infill}', formatCount(data.meta.counts.infill));
    const osmDate = (data.meta.osmTimestamp || '').slice(0, 10);
    const datePrefix = lang === 'vi' ? 'Dữ liệu OSM trích ngày ' : 'OSM extract dated ';
    const commitSuffix = __APP_COMMIT__ ? ` (${__APP_COMMIT__})` : '';
    byId('about-fine').textContent = `${datePrefix}${osmDate} · Overpass API · three.js · v${__APP_VERSION__}${commitSuffix}`;
    byId('loader-text').textContent = strings.loading;
    byId('scene').setAttribute('aria-label', strings.scene);
    byId('seg-time').setAttribute('aria-label', strings.timeOfDay);
    if (currentPlace) fillCard(currentPlace);
  }

  function loadStories() {
    if (stories || storiesAsked) return;
    storiesAsked = true;
    fetch(`${import.meta.env.BASE_URL}data/stories.json`)
      .then((res) => { if (!res.ok) throw new Error(`stories.json: HTTP ${res.status}`); return res.json(); })
      .then((json) => {
        stories = json || {};
        refreshQuickStrip();
        if (currentPlace) fillCard(currentPlace);
        search.refresh(currentPlace);
      })
      .catch((err) => { console.warn(err); storiesAsked = false; });
  }

  function fillMedia(story: any, tried = 0) {
    const gen = ++mediaGen;
    const images = (story && story.images) || [];
    const image = images.length ? images[shotIndex % images.length] : null;
    const thumbUrl = image && parseWebUrl(image.thumb);
    const imgEl = byId<HTMLImageElement>('card-img');
    const nextBtn = byId<HTMLButtonElement>('card-shot');
    imgEl.onload = null;
    imgEl.onerror = null;
    setVisible('card-media', false);
    if (!thumbUrl) { imgEl.removeAttribute('src'); return; }

    imgEl.style.aspectRatio = image.width && image.height
      ? `${image.width} / ${Math.min(image.height, image.width * CARD_IMAGE_MAX_ASPECT)}`
      : '';
    imgEl.alt = (image.caption && image.caption[lang]) || '';
    const tip = images.length > 1 ? `${strings.nextPhoto} (${(shotIndex % images.length) + 1}/${images.length})` : '';
    nextBtn.title = tip;
    nextBtn.disabled = !tip;
    if (tip) nextBtn.setAttribute('aria-label', tip);
    else nextBtn.removeAttribute('aria-label');
    imgEl.classList.toggle('more', images.length > 1);
    byId('card-caption').textContent = (image.caption && image.caption[lang]) || '';

    const creditEl = byId('card-credit');
    creditEl.textContent = '';
    const pageUrl = parseWebUrl(image.page);
    const creditNode: HTMLAnchorElement | HTMLSpanElement = pageUrl
      ? Object.assign(document.createElement('a'), { href: pageUrl.href, target: '_blank', rel: 'noopener' })
      : document.createElement('span');
    creditNode.textContent = [
      `${strings.photoBy}: ${(image.author || 'Wikimedia Commons').slice(0, AUTHOR_MAX_LEN)}`,
      image.license,
    ].filter(Boolean).join(' · ');
    creditEl.append(creditNode);

    imgEl.onload = () => { if (gen === mediaGen) setVisible('card-media', true); };
    imgEl.onerror = () => {
      if (gen !== mediaGen) return;
      if (tried + 1 < images.length) { shotIndex++; fillMedia(story, tried + 1); }
      else setVisible('card-media', false);
    };
    imgEl.removeAttribute('src');
    imgEl.src = thumbUrl.href;
  }

  function fillCard(place: any) {
    const story = stories && stories[place.id];
    renderCardDetails(place, story, lang, strings, origin, pickLocalized, setTextWithLang);
    fillMedia(story);
  }

  function showCard(id: string, from: Element | null = document.activeElement) {
    const place = placeById.get(id);
    if (!place) return;
    const cardEl = byId('card');
    if (from && from !== document.body && !cardEl.contains(from)) openerEl = from;
    currentPlace = place;
    shotIndex = 0;
    loadStories();
    fillCard(place);
    byId('card-scroll').scrollTop = 0;
    cardEl.hidden = false;
    byId('card-name').focus({ preventScroll: true });
    cardEl.style.animation = 'none';
    void cardEl.offsetWidth;
    cardEl.style.animation = '';
    document.body.classList.add('has-card');
    seen.add(id);
    search.setShown(place);
    listButtons.forEach((btn, key) => {
      btn.classList.toggle('active', key === id);
      if (seen.has(key)) btn.classList.add('seen');
    });
    byId('search').classList.toggle('has-q', byId<HTMLInputElement>('q').value.trim().length > 0);
  }

  function hideCard() {
    currentPlace = null;
    search.setShown(null);
    const cardEl = byId('card');
    const hadFocus = cardEl.contains(document.activeElement);
    cardEl.hidden = true;
    if (hadFocus && openerEl instanceof HTMLElement && openerEl.isConnected) openerEl.focus({ preventScroll: true });
    openerEl = null;
    document.body.classList.remove('has-card');
    listButtons.forEach((btn) => btn.classList.remove('active'));
    byId('search').classList.toggle('has-q', byId<HTMLInputElement>('q').value.trim().length > 0);
  }

  const timeButtons = [...document.querySelectorAll<HTMLButtonElement>('#seg-time button')];
  bindToolbarEvents({
    handlers,
    timeButtons,
    getLang: () => lang,
    getTimeIdx: () => timeIdx,
    getCurrentPlace: () => currentPlace,
    pickLang: (nextLang) => {
      lang = nextLang;
      store.set('hue-lang', lang);
      applyText();
      handlers.lang(lang);
    },
    hideCard,
    nextShot: () => { if (currentPlace) { shotIndex++; fillMedia(stories && stories[currentPlace.id]); } },
    applyText,
    toggleCaptureMenu,
    closeCaptureMenu,
    pickCapturePreset: (preset: string) => {
      capturePreset = preset;
      handlers.capture?.(preset);
    },
  });

  applyText();

  let lastHeadingDeg = NaN;
  return {
    get lang() { return lang; },
    get T() { return strings; },
    showCard,
    hideCard,
    hint,
    hideHint,
    get cardId() { return currentPlace && currentPlace.id; },
    get capturePreset() { return capturePreset; },
    closeCaptureMenu,
    setCapturing(busy: boolean) {
      const btn = byId<HTMLButtonElement>('btn-capture');
      btn.classList.toggle('busy', busy);
      btn.disabled = busy;
      btn.setAttribute('aria-busy', String(busy));
    },
    firstHint() { hint(isCoarse() ? strings.hintTouch : strings.hintMouse, HINT_FIRST_MS); },
    setLabels(on: boolean) {
      byId('btn-labels').classList.toggle('on', on);
      byId('btn-labels').setAttribute('aria-pressed', String(on));
      if (!on) hint(strings.hintLabels, HINT_LABELS_OFF_MS);
    },
    setLook(isInk: boolean | number) {
      byId('btn-look').classList.toggle('on', !!isInk);
      byId('btn-look').setAttribute('aria-pressed', String(!!isInk));
    },
    setMood({ rain, time }: { rain: boolean | number; time: number }) {
      const isNight = time >= TIME_NIGHT_THRESHOLD;
      const snappedIdx = Math.max(0, Math.min(2, Math.round(time)));
      document.body.dataset.time = isNight ? '2' : String(snappedIdx);
      const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      if (themeMeta) themeMeta.content = isNight ? THEME_COLOR_NIGHT : THEME_COLOR_DAY;
      const rainTip = rain ? strings.rainOn : strings.rain;
      const rainBtn = byId('btn-rain');
      rainBtn.setAttribute('aria-pressed', String(!!rain));
      rainBtn.querySelector('span')!.textContent = rainTip;
      rainBtn.title = rainTip;
      rainBtn.setAttribute('aria-label', rainTip);
      timeIdx = time;
      const slider = byId<HTMLInputElement>('time-slider');
      if (Math.abs(parseFloat(slider.value) - time) > 0.005) slider.value = String(time);
      timeButtons.forEach((btn) => {
        const active = +btn.dataset.time! === snappedIdx;
        btn.setAttribute('aria-checked', String(active));
        btn.tabIndex = active ? 0 : -1;
      });
    },
    setHeading(rad: number) {
      const deg = Math.round((-rad * HEADING_TENTHS_FACTOR) / Math.PI) / 10;
      if (deg !== lastHeadingDeg) {
        lastHeadingDeg = deg;
        byId('needle').style.transform = `rotate(${deg}deg)`;
      }
    },
    loaderProgress(progress: number) { byId('loader-bar').style.width = `${Math.round(progress * 100)}%`; },
    loaderDone() {
      byId('loader').classList.add('done');
      document.body.classList.remove('loading');
      behindLoader.forEach((el) => { el.inert = false; });
    },
    lock,
    applyText,
  };
}
