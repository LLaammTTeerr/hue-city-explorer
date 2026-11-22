# Nhà thờ Dòng Chúa Cứu Thế Huế (`dcct`)

Model: `src/landmarks/places/dcct.js`. The older `redemptorist()` in `src/landmarks/civic.js` now returns early when the replica is loaded (`replaced('dcct')`).

## Sources
- vi.wikipedia, Nhà thờ Dòng Chúa Cứu Thế, Huế: https://vi.wikipedia.org/wiki/Nh%C3%A0_th%E1%BB%9D_D%C3%B2ng_Ch%C3%BAa_C%E1%BB%A9u_Th%E1%BA%BF,_Hu%E1%BA%BF
- VietnamNet, "East meets West at a Catholic church in Vietnam's former imperial capital": https://vietnamnet.vn/en/east-meets-west-at-a-catholic-church-in-vietnam-s-former-imperial-capital-2565143.html
- VnExpress, "Vẻ đẹp của hai nhà thờ trên đất cố đô": https://vnexpress.net/ve-dep-cua-hai-nha-tho-tren-dat-co-do-4122447.html
- VietNamNet photo set in the article above (aerial, straight-down overhead, tower close-up, sides, front, interior) and Esri World Imagery z18 over the grounds: the 2026-11 photo audit.
- OpenStreetMap: church outline way 1172894102 (in `data/raw/hue-osm.json`); Nguyễn Huệ way 39419487, Nguyễn Khuyến way 35926988, the service lanes 656703162 / 895575335, and the monastery blocks 1174028274/5/6.

## Confirmed
- Architect Nguyễn Mỹ Lộc; built January 1959 to August 1962. The design blends East and West (wiki, VietnamNet).
- Plan 70 m deep and 15–37 m wide. Side corridors 26 m long and 4.2 m wide. Sanctuary 8.5 m deep (wiki).
- Roof 32 m high. A central three-tier bell tower with a spire to 53 m and four electrically driven bells (wiki, VietnamNet).
- Reinforced concrete and blue stone (đá xanh), with fired-clay tiles (wiki). The tiled roofs are red and overlap, after Huế's đình and pagodas (VietnamNet).
- The tower is octagonal, with broad tiered roofs (VietnamNet).
- A wide, open porch with doors that open fully (wiki). A great arched entrance, round openings, and a clock and cross on the axis (VietnamNet).
- The grounds are a triangle whose apex is the Nguyễn Huệ / Nguyễn Khuyến junction. A statue of Christ stands in front, and the grotto of Our Lady is at the rear left (wiki).
- The OSM outline is 80.6 m long. It is 27.4 m wide at the front, 38.6 m and then 50 m at the crossing, and narrows to a polygonal sanctuary. The church faces east toward the apex.

## Estimated (photo-derived figures are marked *est.*)
Scale for the photo readings: the nave ridge at 25 m. Every figure below is estimated unless marked sourced.
- **One tower, over the crossing** (a≈45 m from the front), not over the door. The overhead, the aerial and the interior (the octagonal lantern above the crossing) show a single tower; the old model built it twice (a front tower and a 32 m crossing crown). The crown is the same tower.
- Tower: square slate-lattice shaft 8.6 m across up to the nave ridge (*est.*). Then octagonal tiers with flared skirts: 25–29.7 m, r 4.9, skirt r 8.4; an open balustraded gallery at 30.5–34 m, r 4.8, skirt r 6.6; 34.8–38.3 m, r 3.1, skirt r 4.8 (all *est.*). A dark spire (satellite; unverified) from 38.5 to 50 m (*est.*), and the cross to **53 m (sourced)**; `npm run check` measures it.
- Four small square turrets with gabled caps at the crossing's step corners, 3 m square to 15.5 m (*est.*).
- **Front block**, 10 m deep and 27.4 m wide (OSM width). Rebuild of 2026-11-22, measured on the Street View front pano from the plaza (scaled by the 27.4 m width, about 18 px/m; all *est.*): the gable shaft is 13.8 m wide with straight sides to a cornice at 18–18.4 m. Three steps follow, 8 m wide to 20.4, 5 m to 22, and a 2.8 m summit block to 24.4 with a niche and figure. Each step has corner pinnacles, and a small cross tops it at about 25.9 m. The great window (revised by the review fixes below to a pointed head with a lattice band, and four narrower steps): its sides lean in from 6.2 m at the sill (8 m) to 5.4 m at the springing (14.6 m), the head reaches 17.3 m, and it carries a square grid of bars and a large cross. The clock sits at 19.4 m on the first step, and dotted bands curve down the shaft. A tiled canopy 13.8 m wide at 5–5.4 m stands on four stone pillars over three blue-framed doors (2.3 × 4 m). The side wings are 5.8 m at the corners rising to 8.4 m beside the gable. The old front, with its summit at 29 m and star at 31.4 m, was about 25% too tall for the photo. The wiki's "roof 32 m" therefore cannot be the front gable; it may be the tower body or a rounded figure (owner question).
- **Transept ends** (b ±25): each arm ends in a small entrance front seen from Nguyễn Huệ. It has a white gable shaft 8 m wide to 14.5 m, a step to 16.4 m, a summit to 17.9 m with a cross, and a round-headed window 6.2–11.6 m (+head). Curved-coped wings rise from 5.5 to 8 m, with white claustra lattice panels, and a tiled canopy on four pillars stands over three doors and steps (all *est.*). The arms' low roof is a gable from 5.5 m to an 11.4 m ridge.
- Nave wall-head 15 m, ridge 25 m; corridor roofs 6.6–9.6 m (*est.*). The corridor walls are grey-brown stone to 6 m with five round-arched windows a side under a white band. The clerestory has eight pointed windows (1.4 m) with a mullion and transom, each under a gabled dormer head (*est.*).
- The choir keeps its fanned roof. **No sanctuary lantern**: the overhead shows none, so the 22.5 m lantern was removed.
- Colours from Street View (2026-11 rebuild): a smooth white render with a blue cast `#d3dbe1` (lighter `#e4e9ec`), drawn plain without masonry joints, over a grey-brown stone base `#8f8a7f`. Trim is off-white `#f1f0ea`, tiles are red-orange `#b0573c`, and the door frames are blue `#3d5f99`. The tower shaft is a white claustra grid over dark panels.
- The precinct ring is set in from the carriageways, with gates at the apex, on Nguyễn Khuyến and on Nguyễn Huệ (estimated), and the grotto position (estimated). The satellite shows the forecourt east of the front as one paved plaza: no lawns, no drive and no statue on the axis. The forecourt is now paved and the axis statue of Christ is removed (owner question: the wiki mentions a statue in front; it may stand elsewhere in the grounds).

## What changed
- The church follows the real OSM plan in an axis frame, not an oriented bounding box. That plan gives the nave and corridors, the stepped crossing, and the narrowing choir with its polygonal sanctuary.
- 2026-11 photo audit: the front tower, porch arcades and sanctuary lantern are gone. The front is now its own block (stepped gable, pointed window, clock, canopy on pillars, curved wings), and the one tower stands over the crossing with the sourced 53 m cross.
- The whole triangular compound is fenced. The paved forecourt has the statue of Christ, and the grotto is at the rear left. At night the cross is lit, and the three doors and the big window glow.
- 2026-11-22 rebuild against Google satellite and Street View. Position and axis already matched the satellite to about 1–3 m and 0.5° (front bearing about 87° against the model's 86.5°), so data/ is unchanged. The front was re-proportioned (lower, round-headed window, new steps, clock and bands); the forecourt was paved and the statue removed; the render is plain blue-white over a stone base; the corridors got round-arched windows; the transept ends got their own entrance fronts; and the tower shaft got its claustra grid.
- 2026-11-22 review fixes. The OSM outline sits about 2.3 m south of the satellite and is turned about 1.5°, so the place file now uses its own axis frame (front bearing 87.96°, origin 2.3 m north); data/ is unchanged. The crossing is gabled transept arms (ridge 17 m) meeting the tower, with low hipped roofs in the corners, replacing the square pyramid roof. The west end has a half-ellipse apse with a pleated fan roof, four round chapels with conical roofs, and a large low polygonal hall with a hipped roof. The apse, turrets, tower and tiers are drawn in plain render, not ashlar. The tower's openings are seated on the tier walls, and its skirts have fascias and soffits. Claustra panels were added on the front's wing sides and gable flanks and on the tower shaft. The front piers are pale grey dressed stone. The great window has a pointed (two-centred) head with a lattice border band. The gable has four narrower steps to 24.3 m, with no pinnacles or top cross. The spire is dark grey, as the satellite shows it; no photo confirms this yet.
- Named views `dcct-front` and `dcct-aerial` in `scripts/views.json`.

## Left to do
- The spire colour (dark in the satellite) and the west-end chapel layout need a close photo to confirm.
- Measured drawings would replace the photo-scaled heights.
- The real gate positions and the grotto's exact place.
- Two user-contributed panos (north-east and north of the church) disagree with the satellite on position or heading, and the plaza pano puts the axis about 12 m further south than the satellite. The satellite was trusted.
- The north side between the church and Nguyễn Huệ is also paved in the satellite; the model's ground there is the generic lot.
- The precinct fence uses the shared `FENCE.church` style; the photos show an iron railing on a low stone wall.
