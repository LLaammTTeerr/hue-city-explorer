import { NOTES, PLACE_GROUPS } from './content.js';
import { existsIn } from '../era.js';

// The search box: a map-style bar whose panel lists the places of the model. Nothing is looked up online: the
// index is the place list in hue.json plus the titles, kinds and summaries of stories.json and the short notes.

// Fold a string for matching: lower case, no tone or vowel marks, đ as d, punctuation as a space. One output
// character per input character, so a match found in the folded text marks the same range of the original.
const foldChar = (c) => {
  if (c === 'đ' || c === 'Đ') return 'd';
  const b = c.normalize('NFD')[0].toLowerCase();
  return /[\p{L}\p{N}]/u.test(b) && b.length === 1 ? b : ' ';
};
export const fold = (s) => Array.from(String(s).normalize('NFC'), (c) => (c.length === 1 ? foldChar(c) : ' '.repeat(c.length))).join('');

// where token t sits in folded text f: start of the text, start of a word, or anywhere; -1 if nowhere
function findToken(f, t) {
  if (f.startsWith(t)) return { at: 0, rank: 2 };
  const w = f.indexOf(' ' + t);
  if (w >= 0) return { at: w + 1, rank: 1 };
  const a = f.indexOf(t);
  return a >= 0 ? { at: a, rank: 0 } : null;
}

const ICONS = {
  bridge: '<path d="M3 16.5h18M5 16.5c1.5-7 12.5-7 14 0M8.5 16.5v-3.6M12 16.5v-5.2M15.5 16.5v-3.6"/>',
  market: '<path d="M4 10l1.6-4h12.8L20 10M5.5 10v8.5h13V10M4 10h16M10 18.5v-4.5h4v4.5"/>',
  monument: '<path d="M3.5 11c3.2-.4 6.4-2.2 8.5-5.5 2.1 3.3 5.3 5.1 8.5 5.5M6.5 11v7.5M17.5 11v7.5M4 18.5h16M10 18.5v-4h4v4"/>',
  area: '<path d="M4.5 4.5h15v15h-15zM9 9h6v6H9z"/>',
  water: '<path d="M3 9.5c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 15.5c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>',
  place: '<path d="M12 20.5s-6-5.6-6-10.2a6 6 0 0112 0c0 4.6-6 10.2-6 10.2z"/><circle cx="12" cy="10.3" r="2.1"/>',
  gate: '<path d="M5 19.500V10a7 7 0 0114 0v9.500M9.5 19.500V14a2.5 2.5 0 015 0v5.500M3 19.500h18"/>',
  island: '<path d="M3 17.500c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0M6.5 14c1.2-3.2 3.2-4.8 5.5-4.800s4.3 1.6 5.5 4.8"/>',
  overview: '<circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.500l-2 5-5 2 2-5z"/>',
};
// filter chips, in the order of STR.filters; null is "all"
const FILTERS = [null, ['monument', 'area'], ['bridge'], ['market'], ['gate'], ['water', 'island'], ['place']];

export function createSearch(ctx) {
  // ctx: { places, T(), lang(), stories(), loadStories(), seen, currentId(), pick(id), overview(), clear() }
  const $ = (id) => document.getElementById(id);
  const box = $('search'), input = $('q'), clearBtn = $('q-clear'), toggle = $('q-toggle');
  const panel = $('panel'), kinds = $('kinds'), results = $('results'), none = $('no-results');
  const tx = (o) => (o && (o[ctx.lang()] || o.vi || o.en)) || '';
  let open = false, filter = 0, active = -1, rows = [], shown = null, index = null, indexedStories = null;

  // ---- index: folded names, kinds and descriptive text of every place, in both languages ----
  function buildIndex() {
    const stories = ctx.stories() || {};
    indexedStories = ctx.stories();
    index = new Map();
    for (const p of ctx.places) {
      const st = stories[p.id], note = NOTES[p.id] || (p.k === 'gate' ? NOTES.gate : null);
      const names = [...new Set([p.n, st && st.title && st.title.vi, st && st.title && st.title.en].filter(Boolean))];
      const kindWords = [ctx.Tof('vi').kinds[p.k], ctx.Tof('en').kinds[p.k], st && st.kind && st.kind.vi, st && st.kind && st.kind.en].filter(Boolean);
      const text = [note && note.vi, note && note.en, st && st.summary && st.summary.vi, st && st.summary && st.summary.en].filter(Boolean);
      index.set(p.id, { names: names.map(fold), kinds: fold(kindWords.join(' ')), text: fold(text.join(' ')) });
    }
  }
  function score(p, tokens) {
    const e = index.get(p.id);
    let total = 0;
    for (const t of tokens) {
      let best = 0;
      for (const f of e.names) { const m = findToken(f, t); if (m) best = Math.max(best, [60, 85, 100][m.rank]); }
      if (best < 40 && findToken(e.kinds, t)) best = 40;
      if (!best) { const m = findToken(e.text, t); if (m && m.rank) best = 20; } // descriptions: whole-word starts only
      if (!best) return 0;
      total += best;
    }
    return total;
  }

  const nameOf = (p) => { const st = (ctx.stories() || {})[p.id]; return ((ctx.lang() === 'en' && st && tx(st.title)) || p.n).normalize('NFC'); };
  const queryText = () => (shown !== null && input.value === shown ? '' : input.value.trim());

  // ---- rows ----
  function icon(kind) {
    const s = document.createElement('span');
    s.className = 'ic';
    s.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[kind] || ICONS.place}</svg>`;
    return s;
  }
  function marked(name, tokens) {
    const el = document.createElement('b');
    const f = fold(name), on = new Array(name.length).fill(false);
    for (const t of tokens) { const m = findToken(f, t); if (m) for (let i = m.at; i < m.at + t.length; i++) on[i] = true; }
    for (let i = 0; i < name.length;) {
      let j = i;
      while (j < name.length && on[j] === on[i]) j++;
      if (on[i]) { const mk = document.createElement('mark'); mk.textContent = name.slice(i, j); el.append(mk); } else el.append(name.slice(i, j));
      i = j;
    }
    return el;
  }
  function addRow(id, kind, nameEl, sub) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'row'; b.tabIndex = -1;
    b.id = 'opt-' + rows.length;
    b.setAttribute('role', 'option');
    const t = document.createElement('span'); t.className = 'tx';
    t.append(nameEl);
    if (sub) { const s = document.createElement('small'); s.textContent = sub; t.append(s); }
    b.append(icon(kind), t);
    if (id && ctx.seen.has(id)) b.classList.add('seen');
    if (id && id === ctx.currentId()) b.classList.add('current');
    results.append(b);
    rows.push({ id, el: b });
  }
  function placeRow(p, tokens) {
    const T = ctx.T(), st = (ctx.stories() || {})[p.id], note = NOTES[p.id] || (p.k === 'gate' ? NOTES.gate : null);
    const name = nameOf(p);
    const parts = [tx(st && st.kind) || T.kinds[p.k] || T.kinds.place];
    if (name !== p.n.normalize('NFC')) parts.push(p.n);
    const blurb = tx(st && st.summary) || (note ? note[ctx.lang()] : '');
    if (blurb) parts.push(blurb);
    addRow(p.id, p.k, marked(name, tokens), parts.join(' · '));
  }
  function setActive(i, scroll) {
    active = i;
    rows.forEach((r, k) => { r.el.classList.toggle('active', k === i); r.el.setAttribute('aria-selected', k === i); });
    if (i >= 0 && rows[i]) { input.setAttribute('aria-activedescendant', rows[i].el.id); if (scroll) rows[i].el.scrollIntoView({ block: 'nearest' }); } else input.removeAttribute('aria-activedescendant');
  }

  function render() {
    const T = ctx.T();
    if (!index || indexedStories !== ctx.stories()) buildIndex();
    const q = queryText(), tokens = fold(q).split(' ').filter(Boolean);
    results.textContent = ''; rows = [];
    let message = '';
    if (!tokens.length && filter === 0) {
      // nothing asked yet: the whole model, then the short walk through the city in its three groups
      const ov = document.createElement('b'); ov.textContent = T.overview;
      addRow(null, 'overview', ov, '');
      rows[0].el.classList.add('ov');
      const byId = new Map(ctx.places.map((p) => [p.id, p]));
      PLACE_GROUPS.forEach((g, gi) => {
        const ps = g.ids.map((id) => byId.get(id)).filter((p) => p && existsIn(p.id));
        if (!ps.length) return;
        const h = document.createElement('div'); h.className = 'rgroup'; h.textContent = T.groups[gi]; h.setAttribute('role', 'presentation');
        results.append(h);
        ps.forEach((p) => placeRow(p, tokens));
      });
    } else {
      const want = FILTERS[filter];
      let found = ctx.places.filter((p) => !want || want.includes(p.k)).map((p) => ({ p, s: tokens.length ? score(p, tokens) : 1 })).filter((r) => r.s > 0);
      const here = found.filter((r) => existsIn(r.p.id));
      here.sort((a, b) => b.s - a.s || a.p.t - b.p.t || a.p.n.localeCompare(b.p.n, 'vi'));
      here.forEach((r) => placeRow(r.p, tokens));
      if (!here.length) message = !tokens.length ? T.noneOfKind : found.length ? T.noResultsEra : T.noResults.replace('{q}', q);
    }
    none.textContent = message; none.hidden = !message;
    results.hidden = !rows.length;
    results.scrollTop = 0;
    setActive(tokens.length && rows.length ? 0 : -1, false);
    [...kinds.children].forEach((b, i) => b.setAttribute('aria-pressed', i === filter));
    clearBtn.hidden = !input.value;
  }

  function setOpen(on) {
    if (open === on) return;
    open = on;
    panel.hidden = !on;
    box.classList.toggle('open', on);
    input.setAttribute('aria-expanded', on);
    toggle.setAttribute('aria-expanded', on);
    if (on) { ctx.loadStories(); render(); } else { input.removeAttribute('aria-activedescendant'); }
  }
  function choose(row) {
    if (!row) return;
    setOpen(false);
    input.blur();
    if (row.id) ctx.pick(row.id); else { if (shown === null) input.value = ''; clearBtn.hidden = !input.value; ctx.overview(); }
  }

  // ---- filter chips ----
  FILTERS.forEach((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.addEventListener('click', () => { filter = i; render(); });
    kinds.append(b);
  });

  // ---- wiring ----
  input.addEventListener('focus', () => { setOpen(true); if (shown !== null && input.value === shown) input.select(); });
  input.addEventListener('input', () => { if (open) render(); else setOpen(true); });
  input.addEventListener('keydown', (e) => {
    if (e.isComposing || e.keyCode === 229) return; // an IME (Telex, VNI) is still composing: its Enter commits the word, not a pick
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      if (rows.length) setActive((active + (e.key === 'ArrowDown' ? 1 : -1) + rows.length + (active < 0 && e.key === 'ArrowUp' ? 1 : 0)) % rows.length, true);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      choose(rows[active] || (queryText() ? rows[0] : null));
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      input.blur();
    }
  });
  // a press inside the panel must not take the focus from the box (the panel would close before the click lands)
  panel.addEventListener('mousedown', (e) => e.preventDefault());
  results.addEventListener('click', (e) => { const el = e.target.closest('.row'); if (el) choose(rows.find((r) => r.el === el)); });
  toggle.addEventListener('click', () => { if (open) setOpen(false); else if (matchMedia('(pointer: coarse)').matches) setOpen(true); else input.focus(); });
  clearBtn.addEventListener('click', () => {
    const had = shown !== null;
    input.value = ''; shown = null;
    if (had) ctx.clear();
    input.focus();
    setOpen(true);
    render();
  });
  document.addEventListener('pointerdown', (e) => { if (open && !box.contains(e.target)) setOpen(false); }, true);
  box.addEventListener('focusout', (e) => { if (e.relatedTarget && !box.contains(e.relatedTarget)) setOpen(false); });
  addEventListener('keydown', (e) => {
    if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target instanceof HTMLInputElement || document.getElementById('about').open || document.body.classList.contains('riding')) return;
    e.preventDefault();
    input.focus();
  });

  return {
    // the card's place is written in the box, as a map does; closing the card takes it out again
    setShown(p) {
      const was = shown;
      shown = p ? nameOf(p) : null;
      if (p) input.value = shown; else if (was !== null && input.value === was) input.value = '';
      clearBtn.hidden = !input.value;
      if (open) render();
    },
    close() { setOpen(false); },
    // language, period or stories changed
    refresh(current) {
      const T = ctx.T();
      input.placeholder = innerWidth < 900 ? T.searchShort : T.search;
      input.setAttribute('aria-label', T.search);
      clearBtn.title = T.clear; clearBtn.setAttribute('aria-label', T.clear);
      toggle.title = T.browse; toggle.setAttribute('aria-label', T.browse);
      results.setAttribute('aria-label', T.places);
      kinds.setAttribute('aria-label', T.filterBy);
      [...kinds.children].forEach((b, i) => { b.textContent = T.filters[i]; });
      if (current && shown !== null) { const keep = input.value === shown; shown = nameOf(current); if (keep) input.value = shown; }
      if (open) render();
    },
  };
}
