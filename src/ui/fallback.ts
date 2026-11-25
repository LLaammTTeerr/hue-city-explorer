import { STR } from './content.ts';
import { buildFallbackMap } from './fallback-map.ts';

// When the scene cannot start. Two cases:
//  - no WebGL (the renderer could not get a context): the loader turns into a recovery screen with "Retry 3D", which
//    tries the renderer again in place, and "Browse places", a flat 2D map with the search box and the cards working
//    as usual. Neither needs hue.json: the map and the place list come from the small place index (data/places.json).
//  - anything else that breaks the start (a failed download, an exception while building): the same screen, where
//    "Retry" reloads the page.
// Both texts are shown in both languages: the language switch is still behind the loader at that point.

const RETRY_HINT_MS = 4200;
const byId = (id: string) => document.getElementById(id)!;

function setBilingualLabel(btn: HTMLElement, primaryLang: string, secondaryLang: string, key: string) {
  btn.textContent = '';
  const primarySpan = document.createElement('span');
  primarySpan.textContent = STR[primaryLang][key];
  const secondarySmall = document.createElement('small');
  secondarySmall.textContent = STR[secondaryLang][key];
  secondarySmall.lang = secondaryLang;
  btn.append(primarySpan, secondarySmall);
}

function buildFlatModeBar(onRetry: () => void) {
  const barEl = document.createElement('div');
  barEl.id = 'flat-bar';
  barEl.hidden = true;
  const noteEl = document.createElement('span');
  noteEl.dataset.t = 'flatNote';
  const retryBtn = document.createElement('button');
  retryBtn.type = 'button';
  retryBtn.className = 'tog';
  const labelSpan = document.createElement('span');
  labelSpan.dataset.t = 'retry3d';
  retryBtn.append(labelSpan);
  retryBtn.addEventListener('click', onRetry);
  barEl.append(noteEl, retryBtn);
  byId('actions').after(barEl);
  return barEl;
}

export function createFallback({ ui = null, index = null, tryRenderer = null, onPick = null }: any = {}) {
  const getLang = () => (ui ? ui.lang : (navigator.language || 'vi').slice(0, 2) === 'vi' ? 'vi' : 'en');
  let isFlat = false;
  let map: ReturnType<typeof buildFallbackMap> | null = null;
  let resolveRenderer: ((renderer: any) => void) | null = null;
  let flatBar: HTMLDivElement | null = null;
  let failureMode: 'gl' | 'load' = 'gl';

  function showRecoveryScreen(isGlFailure: boolean) {
    failureMode = isGlFailure ? 'gl' : 'load';
    const primaryLang = getLang();
    const secondaryLang = primaryLang === 'vi' ? 'en' : 'vi';
    const primaryStrings = STR[primaryLang];
    const secondaryStrings = STR[secondaryLang];
    const [titleKey, bodyKey] = isGlFailure ? ['noGlTitle', 'noGlBody'] : ['loadFailTitle', 'loadFailBody'];

    byId('loader').classList.remove('done');
    byId('loader').classList.add('failed');
    byId('loader-text').hidden = true;
    byId('loader-bar').parentElement!.hidden = true;
    byId('fail-title').textContent = primaryStrings[titleKey];
    // without the index there is no 2D map to offer
    byId('fail-body').textContent = index ? primaryStrings[bodyKey] : primaryStrings[bodyKey].split(/(?<=\.)\s/)[0];
    const altEl = byId('fail-alt');
    altEl.textContent = `${secondaryStrings[titleKey]}. ${index ? secondaryStrings[bodyKey] : secondaryStrings[bodyKey].split(/(?<=\.)\s/)[0]}`;
    altEl.lang = secondaryLang;

    setBilingualLabel(byId('btn-retry'), primaryLang, secondaryLang, 'retry3d');
    setBilingualLabel(byId('btn-browse'), primaryLang, secondaryLang, 'browse2d');
    byId('btn-browse').hidden = !index;
    byId('fail-status').textContent = '';
    byId('fail').hidden = false;
    byId('btn-retry').onclick = isGlFailure ? retryRenderer : () => location.reload();
    byId('btn-browse').onclick = enterFlat;
    byId('btn-retry').focus({ preventScroll: true });
  }

  function hideRecoveryScreen() {
    byId('fail').hidden = true;
    byId('loader').classList.remove('failed');
    byId('loader-text').hidden = false;
    byId('loader-bar').parentElement!.hidden = false;
  }

  // one more try at the renderer; on success the start carries on where it stopped
  function retryRenderer() {
    const renderer = tryRenderer && tryRenderer();
    if (!renderer) {
      const primaryLang = getLang();
      const secondaryLang = primaryLang === 'vi' ? 'en' : 'vi';
      const msg = `${STR[primaryLang].stillNoGl} · ${STR[secondaryLang].stillNoGl}`;
      if (isFlat) {
        ui.hint(STR[primaryLang].stillNoGl, RETRY_HINT_MS);
      } else {
        byId('fail-status').textContent = '';
        requestAnimationFrame(() => { byId('fail-status').textContent = msg; });
      }
      return;
    }
    leaveFlat(true); // an open card stays: the 3D view flies to it once the city is in
    hideRecoveryScreen();
    if (ui) ui.lock();
    const resolve = resolveRenderer;
    resolveRenderer = null;
    if (resolve) resolve(renderer);
  }

  function enterFlat() {
    if (isFlat || !index) return;
    isFlat = true;
    if (!map) map = buildFallbackMap({ index, ui, onPick, isFlatActive: () => isFlat });
    if (!flatBar) flatBar = buildFlatModeBar(() => (failureMode === 'gl' ? retryRenderer() : location.reload()));
    document.body.classList.add('flat');
    map.svg.removeAttribute('hidden'); // SVG elements have no .hidden property
    flatBar.hidden = false;
    map.fit();
    map.svg.setAttribute('aria-label', STR[getLang()].map2d);
    hideRecoveryScreen();
    ui.loaderDone();
    ui.applyText();
  }

  function leaveFlat(keepCard = false) {
    if (!isFlat) return;
    isFlat = false;
    document.body.classList.remove('flat');
    map!.svg.setAttribute('hidden', '');
    flatBar!.hidden = true;
    if (!keepCard) ui.hideCard();
  }

  addEventListener('keydown', (event) => {
    if (isFlat && event.key === 'Escape' && !(document.getElementById('about') as HTMLDialogElement).open) {
      ui.hideCard();
    }
  });

  return {
    get flat() { return isFlat; },
    // no WebGL: show the recovery screen; resolves with a renderer once "Retry 3D" gets one
    recover() { return new Promise((resolve) => { resolveRenderer = resolve; showRecoveryScreen(true); }); },
    // the start failed for another reason: the recovery screen, with a reload
    fail() { leaveFlat(); showRecoveryScreen(false); },
    show(id: string) { if (isFlat && map) map.focusOn(id); },
    home() { if (isFlat && map) { map.select(null); map.fit(); } },
    zoom(factor: number) { if (isFlat && map) map.zoom(factor); },
    relabel() { if (map) map.svg.setAttribute('aria-label', STR[getLang()].map2d); },
  };
}
