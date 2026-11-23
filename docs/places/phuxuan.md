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
- **Spans:** 11 spans, 10 piers. The two southern spans (16.3 m and 28.8 m from the south abutment) are short with 0.55 m beams, so the lim boardwalk keeps about 2 m of headroom under the lower deck; the other nine share the rest equally. The piers are round-nosed walls 9.5 × 1.5 m, with a crosshead and bearing seat on top.
- **Deck:** 5 girders 1.6 m deep, plus edge girders; a 12 m carriageway and two raised walkways about 2.5 m wide.
- **Railings:** simplified from Street View: a low grey concrete kerb, grey steel posts every 2.5 m with ball finials, top and bottom rails, and per bay a fine grey diagonal fretwork panel with a small medallion.
- **Lamps:** the bridge has its own posts (phuxuan.js): pale grey, 9.3 m to the arm, a curved swan-neck arm with a brace and a flat lantern, on the railing line, paired both sides every 30 m. The generic life.js posts are skipped for this road, and the night glows sit at the new lantern heads (city.js). Street View suggests the real posts may be closer (about 15 m) and partly staggered; 30 m follows the review.
- **Profile:** `ends` grades in `NAMED`: 5% for about 30 m off the south (Lê Lợi) end, which is the least that clears the lim boardwalk at s≈29 from a 2.6 m bank; about 2.2% for 50 m off the north end; then a parabolic crown of 2.1 m. The deck is about 4.0 m at the boardwalk and 4.8 m at mid-span (it was 7.2 m with a 9% climb).
- **Colours:** grey-beige concrete, dark asphalt, grey steel rails.
- **Width:** see "Google satellite and Street View check" below: the model now uses about 20.2 m.

## Google satellite and Street View check (rebuild, Nov 2026)
Measured on Google satellite captures (z19 0.286 m/px, z20 0.143 m/px, north up) and four Google-car Street View
panoramas. The captures stay in scratch/ and are not in the repository.
- **Axis:** the satellite deck runs at a bearing of 139.3°. The model's OSM carriageway runs at 139.2°.
- **Position:** the satellite deck's centre line lies about 1.5 m (at the ground-level approach) to 2.5 m (on the deck) north-east of the OSM axis. Some of that is image lean, since the deck stands about 7 m up. The car panoramas' positions match lanes centred on the OSM axis to within about 1 m (offsets of −3.9, −2.0, +3.9 and −5.3 m). The deck stays on the OSM road, which traffic and lamps also follow.
- **Width:** 20.2 m over the railings at both zooms. The carriageway is about 14.6 m wide, between tiled walkways of about 2.3–2.8 m. The OSM outline is 20.9 m wide. The Street View panoramas show a four-lane carriageway (a double solid yellow centre line and dashed white lane lines) with a wide outer lane, and wide walkways. The model now uses a 15 m carriageway (`ROAD_W[0]`, the road width the traffic drives on) and 2.6 m walkways, so the deck no longer steps in from the approach roads. Wikipedia gives 17 m (12 m carriageway) and VOV 24 m; the measured width is used, and the disagreement is noted for the owner.
- **Railing and lamps:** grey steel posts with pale ornamental panels on a low kerb. The lamps are double-arm, about 10 m tall, and stand on the railing line (now modelled in phuxuan.js).
- **Profile:** lowered after review (see Estimates). The real south end looks gentler still; reaching 2-3% would need the model's bank raised relative to the boardwalk, which is shared terrain data and left open.

## What changed
- New place module drawing:
  - carriageway, walkways and kerbs;
  - edge and inner girders, slab underside and expansion joints;
  - 10 piers with crossheads, plus the abutments;
  - approach retaining walls;
  - railings with fretwork panels and finials, lamp posts and centre-line markings.
- `src/geo/bridges.js` (shared):
  - a `'Cầu Phú Xuân'` NAMED entry `{ rise: 2.1, ends, lamps }`, with `endGrades` (per-end grade lengths) and `bridgeLamps` (lamp positions for a bridge that draws its own posts);
  - a new optional `climb` argument to `makeProfile` (fast ramp at the ends, then a low crown);
  - profiles now carry a `name` field.

  Traffic and glow follow the same curve as the deck; `life.js` skips its posts on this road when the replica is loaded.
- `src/geo/city.js`: an import of `replaced` and a one-line guard that skips the generic deck for this bridge when the replica is loaded.

## What is left
- Confirm the span count and pier shape from close photos or drawings.
- Confirm lamp spacing (30 m modelled, Street View hints about 15 m) and whether pairs are staggered.
- Check walkway widths and railing details.
- The white jetty slabs beside the south end were not drawn by this module.
