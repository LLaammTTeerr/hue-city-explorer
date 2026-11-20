import { STR, NOTES, QUICK } from './content.js';
import { createSearch } from './search.js';
import { isCoarse } from '../config.js';
import { era, setEra, onEra, existsIn } from '../era.js';

const $ = (id) => document.getElementById(id);

export function createUI(data, handlers) {
  let lang = (localStorage.getItem('hue-lang') || (navigator.language || 'vi').slice(0, 2)) === 'vi' ? 'vi' : 'en';
  let T = STR[lang];
  let current = null; // place shown in the card
  const placeById = new Map(data.places.map((p) => [p.id, p]));
  const seen = new Set();
  const origin = data.meta.origin;

  // ---- quick strip (phones): the whole-model button, then the short walk through the city ----
  const list = $('places');
  const listButtons = new Map();
  {
    const overview = document.createElement('button');
    overview.type = 'button';
    overview.className = 'ov';
    overview.dataset.t = 'overview';
    overview.addEventListener('click', () => handlers.overview());
    list.appendChild(overview);
    for (const id of QUICK) {
      const p = placeById.get(id);
      if (!p) continue;
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = p.n;
      b.addEventListener('click', () => handlers.pick(id, true));
      list.appendChild(b);
      listButtons.set(id, b);
    }
  }

  // ---- search box: every place in the data, found by name, kind or description ----
  let stories = null, storiesAsked = false, shot = 0;
  const search = createSearch({
    places: data.places,
    T: () => T, Tof: (l) => STR[l], lang: () => lang,
    stories: () => stories, loadStories: () => loadStories(),
    seen, currentId: () => current && current.id,
    pick: (id) => handlers.pick(id, true),
    overview: () => handlers.overview(),
    clear: () => { hideCard(); handlers.cardClosed(); },
  });

  // ---- text ----
  function applyText() {
    T = STR[lang];
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = T[el.dataset.t]; });
    list.setAttribute('aria-label', T.places);
    search.refresh(current);
    if (innerWidth <= 720) $('btn-ride').querySelector('span').textContent = T.rideShort;
    $('btn-rain').querySelector('span').textContent = $('btn-rain').getAttribute('aria-pressed') === 'true' ? T.rainOn : T.rain;
    $('btn-lang').textContent = innerWidth <= 720 ? T.langShort : T.lang;
    $('btn-lang').title = T.lang; $('btn-lang').setAttribute('aria-label', T.lang);
    const tips = { 'btn-labels': T.labels, 'btn-about': T.about, 'btn-home': T.home, 'btn-zin': T.zoomIn, 'btn-zout': T.zoomOut, 'card-close': T.close, 'about-close': T.close, 'btn-ride': T.ride, 'btn-rain': T.rain };
    $('era').setAttribute('aria-label', T.era);
    document.querySelectorAll('#era button').forEach((b) => {
      const i = +b.dataset.era;
      b.querySelector('.long').textContent = T.eras[i];
      b.querySelector('.short').textContent = T.erasShort[i];
      b.querySelector('small').textContent = T.eraYears[i];
      b.setAttribute('aria-label', T.eras[i] + (T.eraYears[i] ? ' ' + T.eraYears[i] : ''));
    });
    document.querySelectorAll('#seg-time button').forEach((b) => { const tip = T.times[+b.dataset.time]; b.title = tip; b.setAttribute('aria-label', tip); });
    for (const [id, tip] of Object.entries(tips)) { $(id).title = tip; $(id).setAttribute('aria-label', tip); }
    $('attrib').textContent = T.attrib;
    $('ride-exit').textContent = T.exitRide;
    $('about-title').textContent = T.aboutTitle;
    const n = (v) => v.toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US');
    $('about-body').innerHTML = T.aboutBody.replace('{buildings}', n(data.meta.counts.buildings)).replace('{infill}', n(data.meta.counts.infill));
    const ts = (data.meta.osmTimestamp || '').slice(0, 10);
    $('about-fine').textContent = (lang === 'vi' ? 'Dữ liệu OSM trích ngày ' : 'OSM extract dated ') + ts + ' · Overpass API · three.js';
    $('loader-text').textContent = T.loading;
    if (current) fillCard(current);
  }

  // ---- card ----
  // The explorer: stories, facts and picture references live in data/stories.json, fetched the first time a card
  // opens. Pictures are Wikimedia Commons files under free licences, shown with their credit; without a
  // connection the card simply has no picture.
  function loadStories() {
    if (storiesAsked) return;
    storiesAsked = true;
    fetch('data/stories.json').then((r) => (r.ok ? r.json() : {})).then((j) => { stories = j || {}; if (current) fillCard(current); search.refresh(current); }).catch(() => { stories = {}; });
  }
  const show = (id, on) => { $(id).hidden = !on; };
  function fillMedia(st) {
    const imgs = (st && st.images) || [];
    if (!imgs.length) { show('card-media', false); return; }
    const im = imgs[shot % imgs.length], img = $('card-img');
    img.onerror = () => show('card-media', false);
    img.style.aspectRatio = im.width && im.height ? `${im.width} / ${Math.min(im.height, im.width * 0.72)}` : '';
    img.src = im.thumb;
    img.alt = (im.caption && im.caption[lang]) || '';
    img.title = imgs.length > 1 ? `${T.nextPhoto} (${(shot % imgs.length) + 1}/${imgs.length})` : '';
    img.classList.toggle('more', imgs.length > 1);
    $('card-caption').textContent = (im.caption && im.caption[lang]) || '';
    const credit = $('card-credit');
    credit.textContent = '';
    const a = document.createElement('a');
    a.href = im.page; a.target = '_blank'; a.rel = 'noopener';
    a.textContent = `${T.photoBy}: ${(im.author || 'Wikimedia Commons').slice(0, 60)} · ${im.license || ''}`;
    credit.append(a);
    show('card-media', true);
  }
  function fillCard(p) {
    const note = NOTES[p.id] || (p.k === 'gate' ? NOTES.gate : null);
    const st = stories && stories[p.id];
    const tx = (o) => (o && (o[lang] || o.vi || o.en)) || '';
    $('card-kind').textContent = tx(st && st.kind) || T.kinds[p.k] || T.kinds.place;
    $('card-name').textContent = (lang === 'en' && st && tx(st.title)) || p.n;
    $('card-when').textContent = tx(st && st.when); show('card-when', !!(st && st.when));
    $('card-note').textContent = tx(st && st.summary) || (note ? note[lang] : '');
    const then = st && st.eras && era.value < 2 ? tx(st.eras[era.value]) : '';
    $('card-era').textContent = then ? `${T.then[era.value]}: ${then}` : ''; show('card-era', !!then);
    const story = $('card-story'); story.textContent = '';
    for (const para of tx(st && st.story).split(/\n\s*\n/)) if (para.trim()) { const el = document.createElement('p'); el.textContent = para.trim(); story.append(el); }
    show('card-story', story.childElementCount > 0);
    const facts = $('card-facts'); facts.textContent = '';
    for (const f of (st && st.facts) || []) { const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = tx(f.label); dd.textContent = tx(f.value); facts.append(dt, dd); }
    show('card-facts', facts.childElementCount > 0);
    const src = $('card-sources'); src.textContent = '';
    const list = (st && st.sources) || [];
    if (list.length) {
      src.append(`${T.sources}: `);
      list.forEach((q, i) => { const a = document.createElement('a'); a.href = q.url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = q.title || new URL(q.url).hostname; src.append(a, i < list.length - 1 ? ' · ' : ''); });
    }
    show('card-sources', list.length > 0);
    fillMedia(st);
    const lat = origin.lat - p.z / 10 / 110574, lon = origin.lon + p.x / 10 / (Math.cos((origin.lat * Math.PI) / 180) * 111319.49);
    $('card-meta').textContent = `${lat.toFixed(4)}° N · ${lon.toFixed(4)}° E`;
  }
  function showCard(id) {
    const p = placeById.get(id);
    if (!p) return;
    current = p;
    shot = 0;
    loadStories();
    fillCard(p);
    $('card-scroll').scrollTop = 0;
    const card = $('card');
    card.hidden = false;
    card.style.animation = 'none'; void card.offsetWidth; card.style.animation = '';
    document.body.classList.add('has-card');
    seen.add(id);
    search.setShown(p);
    listButtons.forEach((b, k) => { b.classList.toggle('active', k === id); if (seen.has(k)) b.classList.add('seen'); });
  }
  function hideCard() {
    current = null;
    search.setShown(null);
    $('card').hidden = true;
    document.body.classList.remove('has-card');
    listButtons.forEach((b) => b.classList.remove('active'));
  }

  // ---- hint ----
  let hintTimer = 0;
  function hint(text, ms = 5200) {
    const el = $('hint');
    el.textContent = text;
    el.classList.remove('long');
    el.classList.add('show');
    clearTimeout(hintTimer);
    if (ms) hintTimer = setTimeout(() => el.classList.remove('show'), ms);
  }
  const hideHint = () => { clearTimeout(hintTimer); $('hint').classList.remove('show'); };

  // ---- wiring ----
  $('btn-lang').addEventListener('click', () => { lang = lang === 'vi' ? 'en' : 'vi'; localStorage.setItem('hue-lang', lang); applyText(); if (current) fillCard(current); handlers.lang(lang); });
  $('btn-labels').addEventListener('click', () => handlers.labels());
  $('btn-about').addEventListener('click', () => $('about').showModal());
  $('attrib').addEventListener('click', () => $('about').showModal());
  $('about-close').addEventListener('click', () => $('about').close());
  $('about').addEventListener('click', (e) => { if (e.target === $('about')) $('about').close(); });
  $('osm-only').addEventListener('change', (e) => handlers.osmOnly(e.target.checked));
  $('btn-home').addEventListener('click', () => handlers.home());
  $('btn-zin').addEventListener('click', () => handlers.zoom(0.6));
  $('btn-zout').addEventListener('click', () => handlers.zoom(1.6));
  $('card-close').addEventListener('click', () => { hideCard(); handlers.cardClosed(); });
  $('card-img').addEventListener('click', () => { if (current) { shot++; fillMedia(stories && stories[current.id]); } });
  onEra(() => { if (current) fillCard(current); });
  $('btn-ride').addEventListener('click', () => handlers.ride());
  $('btn-rain').addEventListener('click', () => handlers.rain());
  document.querySelectorAll('#seg-time button').forEach((b) => b.addEventListener('click', () => handlers.time(+b.dataset.time)));
  $('ride-exit').addEventListener('click', () => handlers.exitRide());

  // ---- period: the switcher calls setEra itself; everything here follows onEra ----
  const eraButtons = [...document.querySelectorAll('#era button')];
  eraButtons.forEach((b) => b.addEventListener('click', () => setEra(+b.dataset.era)));
  $('era').addEventListener('keydown', (e) => {
    const d = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key];
    if (!d) return;
    e.preventDefault(); e.stopPropagation();
    setEra((era.value + d + 3) % 3);
    eraButtons[era.value].focus();
  });
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  let dipTimer = 0;
  function applyEra(e, dip) {
    document.body.dataset.era = e;
    eraButtons.forEach((b) => { const on = +b.dataset.era === e; b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1; });
    listButtons.forEach((b, id) => { b.hidden = !existsIn(id, e); });
    if (current && !existsIn(current.id, e)) { hideCard(); handlers.cardClosed(); }
    search.refresh(current);
    if (dip && !calm.matches) {
      const body = document.body;
      body.classList.remove('era-dip'); void body.offsetWidth; body.classList.add('era-dip');
      clearTimeout(dipTimer); dipTimer = setTimeout(() => body.classList.remove('era-dip'), 450);
    }
  }
  onEra((e) => { applyEra(e, true); hint(T.eraHints[e], 4500); $('hint').classList.add('long'); });
  applyEra(era.value, false);
  const scrub = $('ride-scrub');
  scrub.addEventListener('input', () => handlers.seek(scrub.value / 1000, true));
  const release = () => handlers.seek(scrub.value / 1000, false);
  scrub.addEventListener('change', release);
  scrub.addEventListener('pointerup', release);

  applyText();
  // the short wordings (phone) and the placeholder follow the window across its breakpoints
  let narrow = innerWidth <= 720, mid = innerWidth < 900;
  addEventListener('resize', () => {
    if (narrow === innerWidth <= 720 && mid === innerWidth < 900) return;
    narrow = innerWidth <= 720; mid = innerWidth < 900;
    applyText();
  });

  let capIndex = -1;
  return {
    get lang() { return lang; },
    get T() { return T; },
    showCard, hideCard, hint, hideHint,
    get cardId() { return current && current.id; },
    firstHint() { hint(isCoarse() ? T.hintTouch : T.hintMouse, 7000); },
    setLabels(on) { $('btn-labels').classList.toggle('on', on); $('btn-labels').setAttribute('aria-pressed', on); if (!on) hint(T.hintLabels, 4200); },
    setMood({ rain, time }) {
      document.body.dataset.time = time; // the sheets turn to dark lacquer once the lights are on (style.css)
      $('btn-rain').setAttribute('aria-pressed', !!rain);
      $('btn-rain').querySelector('span').textContent = rain ? T.rainOn : T.rain;
      document.querySelectorAll('#seg-time button').forEach((b) => b.setAttribute('aria-checked', +b.dataset.time === time));
    },
    setHeading(rad) { $('needle').style.transform = `rotate(${(-rad * 180) / Math.PI}deg)`; },
    setRide(active) {
      document.body.classList.toggle('riding', active);
      $('ride-hud').hidden = !active;
      capIndex = -1;
      if (active) { search.close(); hideCard(); hint(T.hintRide, 4500); } else hideHint();
    },
    setRideProgress(t) {
      if (document.activeElement !== scrub || !scrub.matches(':active')) scrub.value = Math.round(t * 1000);
      scrub.style.setProperty('--p', (t * 100).toFixed(1) + '%');
      const i = t < 0.2 ? 0 : t < 0.4 ? 1 : t < 0.56 ? 2 : t < 0.78 ? 3 : 4;
      if (i !== capIndex) {
        capIndex = i;
        const cap = $('ride-cap');
        cap.style.opacity = 0;
        setTimeout(() => { cap.textContent = T.caps[i]; cap.style.opacity = 1; }, capIndex === 0 ? 0 : 320);
      }
    },
    loaderProgress(p) { $('loader-bar').style.width = Math.round(p * 100) + '%'; },
    loaderDone() { $('loader').classList.add('done'); },
  };
}
