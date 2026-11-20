# Cầu Trường Tiền (`truongtien`)

Model: `src/landmarks/truongtien.js` (edited in place: the form was already right). Traffic deck frame: `truongTienFrame` in `src/landmarks/life.js` now uses the same length.

## Sources
- vi.wikipedia, Cầu Trường Tiền: https://vi.wikipedia.org/wiki/C%E1%BA%A7u_Tr%C6%B0%E1%BB%9Dng_Ti%E1%BB%81n
  - 402.60 m long, 6 steel bow spans of 67 m, carriageway 6 m, "Cao 5m45".
  - Walkways widened to 1.95 m in the 1937–39 rebuild.
  - The 1991–95 restoration removed the pier balconies, added guard pipes (narrowing the carriageway) and repainted the steel grey (it was silver).
  - Colour-changing lights since Festival Huế 2002.
- en.wikipedia, Trường Tiền Bridge: https://en.wikipedia.org/wiki/Tr%C6%B0%E1%BB%9Dng_Ti%E1%BB%81n_Bridge (same figures: 403 m, 67 m arches, 6 m width, height 5.45 m, 1.95 m sidewalks).
- Wikimedia Commons, used to measure the proportions:
  - "2024-07 Cầu Trường Tiền - Truong Tien Bridge - Huế - img 01.jpg", a side-on panorama. Taking one span as 67 m: the bow crown is 5.5–5.7 m over the bottom chord, the bow ends sit on a short end post about 1.5 m tall, there are about 16–17 panels per span, and the deck girder is a dark band about 1.2 m deep. The stone piers stop about 1.5–2 m under the girders, which sit on steel trestles, and each pier is about 4–5 m along the axis.
  - "Truong Tien Bridge.jpg" (aerial, 2008) and "Motos wizzing over Truong Tien Bridge (40433799602).jpg" (deck level): grey riveted lattice trusses, top wind bracing only in the middle of each span, twin guard pipes on the carriageway side, tiled walkways outside the trusses.
- OSM way 1431129413 (bridge outline, via `data.truongtien`): position, axis and width (11.4 m).

## Confirmed
- Total length 402.6 m and six equal spans (now 67.1 m each, was 64.7 m).
- 6 m carriageway between the truss planes, with a 1.95 m walkway outside each (the OSM width of 11.4 m fits this).
- Bow height about 5.45 m (Wikipedia, plus the panorama measurement). The previous model had 10.4 m, almost double.

## Estimated
- Exact bow curve: the existing rounded profile `(1-u²)^0.62` is kept, now on a 1.3 m end post.
- Deck girder depth 1.2 m, trestle height 1.5 m, pier plan (4.2–4.5 m along the axis, pointed cutwaters).
- Deck height 6.4 m above the river: unchanged, because other code (life.js, more.js) shares it.
- Panel count: 16 per span.
- The OSM outline is only 388 m long. The 402.6 m deck is centred on it, so each end reaches about 7 m further into the bank.

## What changed
- Bows lowered from 10.4 m to 5.45 m, each standing on an end post. Panels went from 14 to 16, and the wind bracing threshold was lowered so the struts still appear mid-span.
- Length set to 402.6 m (`TT_LENGTH`, exported; life.js traffic lanes use it).
- Piers now stop under steel bearing trestles (posts, raking struts, a cross-tie); the piers are wider along the axis and the cap sits inside the deck width. The deck side is darker grey, closer to the girder band in photos.
- Added the twin guard pipes on the carriageway side of each truss (1991–95).
- Night light show unchanged. The pier floodlight wash is retargeted to the new pier height.

## Left to do
- No source found for pier dimensions, deck height above mean water, or the exact panel/diagonal pattern.
- The lamp posts and their arms are generic.
