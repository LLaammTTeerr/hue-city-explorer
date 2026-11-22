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
- Length 374.65 m, prestressed concrete girder bridge, 1971. Published width 17 m (carriageway 12 m); the bridge as it stands measures wider (below).
- Crosses the Hương River between Lê Lợi (south) and the Trần Hưng Đạo side (north), next to Trường Tiền.

## Estimates (not confirmed)
- **Spans:** 11 equal spans, so 10 piers. The piers are round-nosed walls 9.5 × 1.5 m, with a crosshead and bearing seat on top.
- **Deck:** 5 girders 1.6 m deep, plus edge girders; a 12 m carriageway and two raised walkways about 2.5 m wide.
- **Railings:** simplified from Street View: a low concrete kerb, grey steel posts every 2.5 m, top and bottom rails, and per bay a pale framed panel with a medallion between vertical bars. The lamps are the existing traffic-system lamp posts (life.js); they now stand on the walkway about 1.6 m inside the railing.
- **Profile:** the deck climbs about 4.2 m within roughly 40 m of each bank, then crowns gently, about 7 m above the water. This leaves headroom for the lim boardwalk that passes under the south end. `PROGRESS.md` notes the real deck is higher than the old flat model.
- **Colours:** grey-beige concrete, dark asphalt, grey steel rails.
- **Width:** see "Google satellite and Street View check" below: the model now uses about 20.2 m.

## Google satellite and Street View check (rebuild, Nov 2026)
Measured on Google satellite captures (z19 0.286 m/px, z20 0.143 m/px, north up) and four Google-car Street View
panoramas. The captures stay in scratch/ and are not in the repository.
- **Axis:** the satellite deck runs at a bearing of 139.3°. The model's OSM carriageway runs at 139.2°.
- **Position:** the satellite deck's centre line lies about 1.5 m (at the ground-level approach) to 2.5 m (on the deck) north-east of the OSM axis. Some of that is image lean, since the deck stands about 7 m up. The car panoramas' positions match lanes centred on the OSM axis to within about 1 m (offsets of −3.9, −2.0, +3.9 and −5.3 m). The deck stays on the OSM road, which traffic and lamps also follow.
- **Width:** 20.2 m over the railings at both zooms. The carriageway is about 14.6 m wide, between tiled walkways of about 2.3–2.8 m. The OSM outline is 20.9 m wide. The Street View panoramas show a four-lane carriageway (a double solid yellow centre line and dashed white lane lines) with a wide outer lane, and wide walkways. The model now uses a 15 m carriageway (`ROAD_W[0]`, the road width the traffic drives on) and 2.6 m walkways, so the deck no longer steps in from the approach roads. Wikipedia gives 17 m (12 m carriageway) and VOV 24 m; the measured width is used, and the disagreement is noted for the owner.
- **Railing and lamps:** grey steel posts with pale ornamental panels on a low kerb. The lamps are double-arm, about 10 m tall, and stand on the railing line (not modelled: the poles are the shared life.js ones).
- **Profile:** not changed. From the south-east end, the real deck seems to rise more gently than the model's quick climb. But the ironwood boardwalk passes under the deck about 29 m from the south-east end of the road and needs the headroom, and the panoramas give no reliable height. Open question.

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
