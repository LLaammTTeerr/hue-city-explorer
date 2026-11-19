import { STR, NOTES, QUICK } from './content.js';
import { isCoarse } from '../config.js';

const $ = (id) => document.getElementById(id);

export function createUI(data, handlers) {
  let lang = (localStorage.getItem('hue-lang') || (navigator.language || 'vi').slice(0, 2)) === 'vi' ? 'vi' : 'en';
  let T = STR[lang];
  let current = null; // place shown in the card
  const placeById = new Map(data.places.map((p) => [p.id, p]));
  const seen = new Set();
  const origin = data.meta.origin;

  // ---- place list ----
  const list = $('places');
  const listButtons = new Map();
  const overview = document.createElement('button');
  overview.type = 'button';
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

  // ---- text ----
  function applyText() {
    T = STR[lang];
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = T[el.dataset.t]; });
    if (innerWidth <= 720) $('btn-ride').querySelector('span').textContent = T.rideShort;
    $('btn-lang').textContent = T.lang;
    const tips = { 'btn-labels': T.labels, 'btn-about': T.about, 'btn-home': T.home, 'btn-zin': T.zoomIn, 'btn-zout': T.zoomOut, 'card-close': T.close, 'about-close': T.close, 'btn-ride': T.ride, 'btn-rain': T.rain };
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
  function fillCard(p) {
    const note = NOTES[p.id] || (p.k === 'gate' ? NOTES.gate : null);
    $('card-kind').textContent = T.kinds[p.k] || T.kinds.place;
    $('card-name').textContent = p.n;
    $('card-note').textContent = note ? note[lang] : '';
    const lat = origin.lat - p.z / 10 / 110574, lon = origin.lon + p.x / 10 / (Math.cos((origin.lat * Math.PI) / 180) * 111319.49);
    $('card-meta').textContent = `${lat.toFixed(4)}° N · ${lon.toFixed(4)}° E`;
  }
  function showCard(id) {
    const p = placeById.get(id);
    if (!p) return;
    current = p;
    fillCard(p);
    const card = $('card');
    card.hidden = false;
    card.style.animation = 'none'; void card.offsetWidth; card.style.animation = '';
    document.body.classList.add('has-card');
    seen.add(id);
    listButtons.forEach((b, k) => { b.classList.toggle('active', k === id); if (seen.has(k)) b.classList.add('seen'); });
  }
  function hideCard() {
    current = null;
    $('card').hidden = true;
    document.body.classList.remove('has-card');
    listButtons.forEach((b) => b.classList.remove('active'));
  }

  // ---- hint ----
  let hintTimer = 0;
  function hint(text, ms = 5200) {
    const el = $('hint');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(hintTimer);
    if (ms) hintTimer = setTimeout(() => el.classList.remove('show'), ms);
  }
  const hideHint = () => { clearTimeout(hintTimer); $('hint').classList.remove('show'); };

  // ---- wiring ----
  $('btn-lang').addEventListener('click', () => { lang = lang === 'vi' ? 'en' : 'vi'; localStorage.setItem('hue-lang', lang); applyText(); handlers.lang(lang); });
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
  $('btn-ride').addEventListener('click', () => handlers.ride());
  $('btn-rain').addEventListener('click', () => handlers.rain());
  document.querySelectorAll('#seg-time button').forEach((b) => b.addEventListener('click', () => handlers.time(+b.dataset.time)));
  $('ride-exit').addEventListener('click', () => handlers.exitRide());
  const scrub = $('ride-scrub');
  scrub.addEventListener('input', () => handlers.seek(scrub.value / 1000, true));
  const release = () => handlers.seek(scrub.value / 1000, false);
  scrub.addEventListener('change', release);
  scrub.addEventListener('pointerup', release);

  applyText();

  let capIndex = -1;
  return {
    get lang() { return lang; },
    get T() { return T; },
    showCard, hideCard, hint, hideHint,
    get cardId() { return current && current.id; },
    firstHint() { hint(isCoarse() ? T.hintTouch : T.hintMouse, 7000); },
    setLabels(on) { $('btn-labels').classList.toggle('on', on); $('btn-labels').setAttribute('aria-pressed', on); if (!on) hint(T.hintLabels, 4200); },
    setMood({ rain, time }) {
      $('btn-rain').setAttribute('aria-pressed', !!rain);
      $('btn-rain').querySelector('span').textContent = rain ? T.rainOn : T.rain;
      document.querySelectorAll('#seg-time button').forEach((b) => b.setAttribute('aria-checked', +b.dataset.time === time));
    },
    setHeading(rad) { $('needle').style.transform = `rotate(${(-rad * 180) / Math.PI}deg)`; },
    setRide(active) {
      document.body.classList.toggle('riding', active);
      $('ride-hud').hidden = !active;
      capIndex = -1;
      if (active) { hideCard(); hint(T.hintRide, 4500); } else hideHint();
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
