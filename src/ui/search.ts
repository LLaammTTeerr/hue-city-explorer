import { NOTES, PLACE_GROUPS } from './content.ts';
import { fromForm } from '../camera/controls.ts';

// The search box: a map-style bar whose panel lists the places of the model. Nothing is looked up online: the
// index is the place list in hue.json plus the titles, kinds and summaries of stories.json and the short notes.

const NAME_RANK_SCORES = [60, 85, 100] as const; // substring, word-start, prefix
const KIND_MATCH_SCORE = 40;
const TEXT_WORD_START_SCORE = 20;
const IME_COMPOSING_KEYCODE = 229;
const SHORT_PLACEHOLDER_BREAKPOINT_PX = 900;

// Fold a string for matching: lower case, no tone or vowel marks, đ as d, punctuation as a space. One output
// character per input character, so a match found in the folded text marks the same range of the original.
const foldChar = (ch: string) => {
  if (ch === 'đ' || ch === 'Đ') return 'd';
  const base = ch.normalize('NFD')[0].toLowerCase();
  return /[\p{L}\p{N}]/u.test(base) && base.length === 1 ? base : ' ';
};
export const fold = (str: string) => Array.from(
  String(str).normalize('NFC'),
  (ch) => (ch.length === 1 ? foldChar(ch) : ' '.repeat(ch.length)),
).join('');

// where token sits in folded text: start of the text (rank 2), start of a word (rank 1), or anywhere (rank 0); null if nowhere
function findToken(folded: string, token: string) {
  if (folded.startsWith(token)) return { at: 0, rank: 2 };
  const wordPos = folded.indexOf(` ${token}`);
  if (wordPos >= 0) return { at: wordPos + 1, rank: 1 };
  const anyPos = folded.indexOf(token);
  return anyPos >= 0 ? { at: anyPos, rank: 0 } : null;
}

const ICONS: Record<string, string> = {
  bridge: '<path d="M3 16.5h18M5 16.5c1.5-7 12.5-7 14 0M8.5 16.5v-3.6M12 16.5v-5.2M15.5 16.5v-3.6"/>',
  market: '<path d="M4 10l1.6-4h12.8L20 10M5.5 10v8.5h13V10M4 10h16M10 18.5v-4.5h4v4.5"/>',
  monument: '<path d="M3.5 11c3.2-.4 6.4-2.2 8.5-5.5 2.1 3.3 5.3 5.1 8.5 5.5M6.5 11v7.5M17.5 11v7.5M4 18.5h16M10 18.5v-4h4v4"/>',
  area: '<path d="M4.5 4.5h15v15h-15zM9 9h6v6H9z"/>',
  water: '<path d="M3 9.5c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 15.5c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>',
  place: '<path d="M12 20.5s-6-5.6-6-10.2a6 6 0 0112 0c0 4.6-6 10.2-6 10.2z"/><circle cx="12" cy="10.3" r="2.1"/>',
  gate: '<path d="M5 19.500V10a7 7 0 0114 0v9.500M9.5 19.500V14a2.5 2.5 0 015 0v5.500M3 19.500h18"/>',
  island: '<path d="M3 17.500c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0M6.5 14c1.2-3.2 3.2-4.8 5.5-4.800s4.3 1.6 5.5 4.8"/>',
  craft: '<path d="M9.5 4.5h5M10.5 4.5v3C7.5 8.7 6 11.1 6 14c0 3.3 2.7 5.5 6 5.5s6-2.2 6-5.5c0-2.9-1.5-5.3-4.5-6.5v-3M7 13.5h10"/>',
  overview: '<circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.500l-2 5-5 2 2-5z"/>',
};

// filter chips, in the order of STR.filters; null is "all"
const FILTERS = [null, ['monument', 'area'], ['bridge'], ['market'], ['gate'], ['water', 'island'], ['craft'], ['place']];

interface SearchEntry {
  names: string[];
  kinds: string;
  text: string;
}

function buildSearchIndex(places: any[], stories: Record<string, any>, Tof: (lang: string) => any) {
  const index = new Map<string, SearchEntry>();
  for (const place of places) {
    const story = stories[place.id];
    const note = NOTES[place.id] || (place.k === 'gate' ? NOTES.gate : null);
    const names = [...new Set([place.n, story?.title?.vi, story?.title?.en].filter(Boolean))];
    const kindWords = [Tof('vi').kinds[place.k], Tof('en').kinds[place.k], story?.kind?.vi, story?.kind?.en].filter(Boolean);
    const text = [note?.vi, note?.en, story?.summary?.vi, story?.summary?.en].filter(Boolean);
    index.set(place.id, {
      names: names.map(fold),
      kinds: fold(kindWords.join(' ')),
      text: fold(text.join(' ')),
    });
  }
  return index;
}

function scorePlace(entry: SearchEntry, tokens: string[]) {
  let total = 0;
  for (const token of tokens) {
    let best = 0;
    for (const foldedName of entry.names) {
      const match = findToken(foldedName, token);
      if (match) best = Math.max(best, NAME_RANK_SCORES[match.rank]);
    }
    if (best < KIND_MATCH_SCORE && findToken(entry.kinds, token)) best = KIND_MATCH_SCORE;
    if (!best) {
      const match = findToken(entry.text, token);
      if (match && match.rank) best = TEXT_WORD_START_SCORE; // descriptions: whole-word starts only
    }
    if (!best) return 0;
    total += best;
  }
  return total;
}

function createKindIcon(kind: string) {
  const span = document.createElement('span');
  span.className = 'ic';
  span.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[kind] || ICONS.place}</svg>`;
  return span;
}

function highlightMatches(name: string, tokens: string[]) {
  const bold = document.createElement('b');
  const folded = fold(name);
  const highlighted = new Array<boolean>(name.length).fill(false);
  for (const token of tokens) {
    const match = findToken(folded, token);
    if (match) {
      for (let i = match.at; i < match.at + token.length; i++) highlighted[i] = true;
    }
  }
  for (let i = 0; i < name.length;) {
    let end = i;
    while (end < name.length && highlighted[end] === highlighted[i]) end++;
    if (highlighted[i]) {
      const mark = document.createElement('mark');
      mark.textContent = name.slice(i, end);
      bold.append(mark);
    } else {
      bold.append(name.slice(i, end));
    }
    i = end;
  }
  return bold;
}

export function createSearch(ctx: any) {
  const byId = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
  const box = byId('search');
  const input = byId<HTMLInputElement>('q');
  const clearBtn = byId('q-clear');
  const toggleBtn = byId('q-toggle');
  const panel = byId('panel');
  const kindsBar = byId('kinds');
  const resultsEl = byId('results');
  const emptyMsgEl = byId('no-results');

  const localize = (obj: any) => (obj && (obj[ctx.lang()] || obj.vi || obj.en)) || '';
  const displayNameOf = (place: any) => {
    const story = (ctx.stories() || {})[place.id];
    return ((ctx.lang() === 'en' && story && localize(story.title)) || place.n).normalize('NFC');
  };

  let isOpen = false;
  let activeFilter = 0;
  let activeRowIdx = -1;
  let rows: { id: string | null; el: HTMLButtonElement }[] = [];
  let shownName: string | null = null;
  let searchIndex: Map<string, SearchEntry> | null = null;
  let indexedStories: any = null;

  const queryText = () => (shownName !== null && input.value === shownName ? '' : input.value.trim());

  function addRow(id: string | null, kind: string, nameEl: HTMLElement, subtitle: string) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'row';
    btn.tabIndex = -1;
    btn.id = `opt-${rows.length}`;
    btn.setAttribute('role', 'option');

    const textWrap = document.createElement('span');
    textWrap.className = 'tx';
    textWrap.append(nameEl);
    if (subtitle) {
      const subEl = document.createElement('small');
      subEl.textContent = subtitle;
      textWrap.append(subEl);
    }
    btn.append(createKindIcon(kind), textWrap);
    if (id && ctx.seen.has(id)) btn.classList.add('seen');
    if (id && id === ctx.currentId()) btn.classList.add('current');
    resultsEl.append(btn);
    rows.push({ id, el: btn });
  }

  function addPlaceRow(place: any, tokens: string[]) {
    const strings = ctx.T();
    const story = (ctx.stories() || {})[place.id];
    const note = NOTES[place.id] || (place.k === 'gate' ? NOTES.gate : null);
    const name = displayNameOf(place);
    const parts = [localize(story && story.kind) || strings.kinds[place.k] || strings.kinds.place];
    if (name !== place.n.normalize('NFC')) parts.push(place.n);
    const blurb = localize(story && story.summary) || (note ? note[ctx.lang()] : '');
    if (blurb) parts.push(blurb);
    addRow(place.id, place.k, highlightMatches(name, tokens), parts.join(' · '));
  }

  function setActiveRow(index: number, shouldScroll: boolean) {
    activeRowIdx = index;
    rows.forEach((row, idx) => {
      row.el.classList.toggle('active', idx === index);
      row.el.setAttribute('aria-selected', String(idx === index));
    });
    if (index >= 0 && rows[index]) {
      input.setAttribute('aria-activedescendant', rows[index].el.id);
      if (shouldScroll) rows[index].el.scrollIntoView({ block: 'nearest' });
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  }

  function renderGroupedOverview(tokens: string[]) {
    const strings = ctx.T();
    const overviewLabel = document.createElement('b');
    overviewLabel.textContent = strings.overview;
    addRow(null, 'overview', overviewLabel, '');
    rows[0].el.classList.add('ov');

    const byPlaceId = new Map(ctx.places.map((place: any) => [place.id, place]));
    PLACE_GROUPS.forEach((group, groupIdx) => {
      const groupPlaces = group.ids.map((id) => byPlaceId.get(id)).filter(Boolean);
      if (!groupPlaces.length) return;
      const heading = document.createElement('div');
      heading.className = 'rgroup';
      heading.textContent = strings.groups[groupIdx];
      heading.setAttribute('role', 'presentation');
      resultsEl.append(heading);
      groupPlaces.forEach((place) => addPlaceRow(place, tokens));
    });
  }

  function render() {
    const strings = ctx.T();
    if (!searchIndex || indexedStories !== ctx.stories()) {
      indexedStories = ctx.stories();
      searchIndex = buildSearchIndex(ctx.places, indexedStories || {}, ctx.Tof);
    }
    const query = queryText();
    const tokens = fold(query).split(' ').filter(Boolean);
    resultsEl.textContent = '';
    rows = [];
    let emptyMessage = '';

    if (!tokens.length && activeFilter === 0) {
      renderGroupedOverview(tokens);
    } else {
      const allowedKinds = FILTERS[activeFilter];
      const matches = ctx.places
        .filter((place: any) => !allowedKinds || allowedKinds.includes(place.k))
        .map((place: any) => ({ place, score: tokens.length ? scorePlace(searchIndex!.get(place.id)!, tokens) : 1 }))
        .filter((item: any) => item.score > 0);
      matches.sort((a: any, b: any) => b.score - a.score || a.place.t - b.place.t || a.place.n.localeCompare(b.place.n, 'vi'));
      matches.forEach((item: any) => addPlaceRow(item.place, tokens));
      if (!matches.length) emptyMessage = !tokens.length ? strings.noneOfKind : strings.noResults.replace('{q}', query);
    }

    emptyMsgEl.textContent = emptyMessage;
    emptyMsgEl.hidden = !emptyMessage;
    resultsEl.hidden = !rows.length;
    resultsEl.scrollTop = 0;
    setActiveRow(tokens.length && rows.length ? 0 : -1, false);
    [...kindsBar.children].forEach((btn, idx) => btn.setAttribute('aria-pressed', String(idx === activeFilter)));
    clearBtn.hidden = !input.value;
  }

  function setOpen(nextOpen: boolean) {
    if (isOpen === nextOpen) return;
    isOpen = nextOpen;
    panel.hidden = !nextOpen;
    box.classList.toggle('open', nextOpen);
    input.setAttribute('aria-expanded', String(nextOpen));
    toggleBtn.setAttribute('aria-expanded', String(nextOpen));
    if (nextOpen) { ctx.loadStories(); render(); }
    else input.removeAttribute('aria-activedescendant');
  }

  function chooseRow(row: { id: string | null; el: HTMLButtonElement } | undefined | null) {
    if (!row) return;
    setOpen(false);
    input.blur();
    // the input is blurred by now, so it is passed as the card's opener: closing the card returns focus here
    if (row.id) {
      ctx.pick(row.id, input);
    } else {
      if (shownName === null) input.value = '';
      clearBtn.hidden = !input.value;
      ctx.overview();
    }
  }

  // ---- filter chips & events ----
  FILTERS.forEach((_, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.addEventListener('click', () => { activeFilter = idx; render(); });
    kindsBar.append(btn);
  });

  input.addEventListener('focus', () => {
    setOpen(true);
    if (shownName !== null && input.value === shownName) input.select();
  });
  input.addEventListener('input', () => { if (isOpen) render(); else setOpen(true); });
  input.addEventListener('keydown', (event) => {
    if (event.isComposing || event.keyCode === IME_COMPOSING_KEYCODE) return; // IME (Telex, VNI) is still composing
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen) { setOpen(true); return; }
      if (rows.length) {
        const delta = event.key === 'ArrowDown' ? 1 : -1;
        const wrapOffset = activeRowIdx < 0 && event.key === 'ArrowUp' ? 1 : 0;
        setActiveRow((activeRowIdx + delta + rows.length + wrapOffset) % rows.length, true);
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (!isOpen) { setOpen(true); return; }
      chooseRow(rows[activeRowIdx] || (queryText() ? rows[0] : null));
    }
  });

  box.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (!isOpen && document.activeElement !== input) return;
    event.preventDefault();
    setOpen(false);
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });

  // a press inside the panel must not take focus from the box (the panel would close before the click lands)
  panel.addEventListener('mousedown', (event) => event.preventDefault());
  resultsEl.addEventListener('click', (event) => {
    const rowEl = (event.target as Element)?.closest('.row');
    if (rowEl) chooseRow(rows.find((row) => row.el === rowEl));
  });
  toggleBtn.addEventListener('click', () => {
    if (isOpen) setOpen(false);
    else if (matchMedia('(pointer: coarse)').matches) setOpen(true);
    else input.focus();
  });
  clearBtn.addEventListener('click', () => {
    const hadShown = shownName !== null;
    input.value = '';
    shownName = null;
    if (hadShown) ctx.clear();
    input.focus();
    setOpen(true);
    render();
  });
  document.addEventListener('pointerdown', (event) => {
    if (isOpen && !box.contains(event.target as Node)) setOpen(false);
  }, true);
  box.addEventListener('focusout', (event) => {
    if (event.relatedTarget && !box.contains(event.relatedTarget as Node)) setOpen(false);
  });
  addEventListener('keydown', (event) => {
    if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
    if (fromForm(event) || byId<HTMLDialogElement>('about').open) return;
    event.preventDefault();
    input.focus();
  });

  return {
    // the card's place is written in the box, as a map does; closing the card takes it out again
    setShown(place: any) {
      const prevShown = shownName;
      shownName = place ? displayNameOf(place) : null;
      if (place) input.value = shownName!;
      else if (prevShown !== null && input.value === prevShown) input.value = '';
      clearBtn.hidden = !input.value;
      if (isOpen) render();
    },
    close() { setOpen(false); },
    // language, period or stories changed
    refresh(currentPlace: any) {
      const strings = ctx.T();
      input.placeholder = innerWidth < SHORT_PLACEHOLDER_BREAKPOINT_PX ? strings.searchShort : strings.search;
      input.setAttribute('aria-label', strings.search);
      clearBtn.title = strings.clear;
      clearBtn.setAttribute('aria-label', strings.clear);
      toggleBtn.title = strings.browse;
      toggleBtn.setAttribute('aria-label', strings.browse);
      resultsEl.setAttribute('aria-label', strings.places);
      kindsBar.setAttribute('aria-label', strings.filterBy);
      [...kindsBar.children].forEach((btn, idx) => { btn.textContent = strings.filters[idx]; });
      if (currentPlace && shownName !== null) {
        const keepValue = input.value === shownName;
        shownName = displayNameOf(currentPlace);
        if (keepValue) input.value = shownName;
      }
      if (isOpen) render();
    },
  };
}
