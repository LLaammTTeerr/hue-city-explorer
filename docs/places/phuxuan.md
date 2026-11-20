# Cầu Phú Xuân (Phú Xuân Bridge)

Model: `src/landmarks/places/phuxuan.js` (id `phuxuan`). It replaces the generic slab and piers that `src/geo/city.js` used to draw for this bridge.

## Sources
- https://vi.wikipedia.org/wiki/Cầu_Phú_Xuân : prestressed concrete, opened 1971, 374.65 m long, 17 m wide.
- https://khamphahue.com.vn : built 1970–72 by a French contractor (Eiffel).
- https://tuoitre.vn/ngam-nhung-cay-cau-noi-nhip-dong-huong-20241112092907293.htm : history of the Hương River bridges.
- https://huongrivercruises.com/cau-phu-xuan-hue/ : description and photos.
- VOV gives 433 m × 24 m. This disagrees with Wikipedia, so it was not used.
- https://commons.wikimedia.org/wiki/Category:Phu_Xuan_Bridge : photos (general form: flat girder spans on wall piers, light railings, lamp posts).
- Position and axis come from the OSM-derived `public/data/hue.json` (bridge ring and road). The live Overpass API could not be reached from this machine.

## Confirmed
- Length 374.65 m, width 17 m, prestressed concrete girder bridge, 1971.
- Crosses the Hương River between Lê Lợi (south) and the Trần Hưng Đạo side (north), next to Trường Tiền.

## Estimates (not confirmed)
- **Spans:** 11 equal spans, so 10 piers. The piers are round-nosed walls 9.5 × 1.5 m, with a crosshead and bearing seat on top.
- **Deck:** 5 girders 1.6 m deep, plus edge girders; a 12 m carriageway and two raised walkways about 2.5 m wide.
- **Railings:** concrete posts every 2 m with two steel rails. The lamps are the existing traffic-system lamp posts (life.js), standing on small corbels outside the railing.
- **Profile:** the deck climbs about 4.2 m within roughly 40 m of each bank, then crowns gently, about 7 m above the water. This leaves headroom for the lim boardwalk that passes under the south end. `PROGRESS.md` notes the real deck is higher than the old flat model.
- **Colours:** grey-beige concrete, dark asphalt, grey steel rails.
- **Width:** the OSM outline is about 21.5 m wide. The model uses the sourced 17 m.

## What changed
- New place module drawing:
  - carriageway, walkways and kerbs;
  - edge and inner girders, slab underside and expansion joints;
  - 10 piers with crossheads, plus the abutments;
  - approach retaining walls;
  - railings, lamp corbels and centre-line markings.
- `src/geo/bridges.js` (shared):
  - a `'Cầu Phú Xuân'` NAMED entry `{ rise: 4.2, ramp: 0.1 }`;
  - a new optional `climb` argument to `makeProfile` (fast ramp at the ends, then a low crown);
  - profiles now carry a `name` field.

  Traffic, lamp posts and glow follow the same curve as the deck.
- `src/geo/city.js`: an import of `replaced` and a one-line guard that skips the generic deck for this bridge when the replica is loaded.

## What is left
- Confirm the span count and pier shape from close photos or drawings.
- Check the real lamp design (the posts here are the generic ones) and whether there is night lighting.
- Check walkway widths and railing details.
- The white jetty slabs beside the south end were not drawn by this module.
