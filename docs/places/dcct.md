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
- Tower: square slate-lattice shaft 8.6 m across up to the nave ridge (*est.*). Then octagonal tiers with flared skirts: 25–29.7 m, r 4.9, skirt r 8.4; an open balustraded gallery at 30.5–34 m, r 4.8, skirt r 6.6; 34.8–38.3 m, r 3.1, skirt r 4.8 (all *est.*). A terracotta spire from 38.5 to 50 m (*est.*), and the cross to **53 m (sourced)**; `npm run check` measures it.
- Four small square turrets with gabled caps at the crossing's step corners, 3 m square to 15.5 m (*est.*).
- **Front block**, 10 m deep and 27.7 m wide (OSM width): a central stepped gable 14 m wide (*est.*), shaft to 20 m, steps to the summit at 29 m, star to about 31.4 m (*est.*; the wiki's "roof 32 m" is read as this front). A pointed window 7.4 m wide from 7.2 to 15.2 m plus a 4.6 m arch, a clock above it, and portholes (*est.*). A canopy 14 m wide at 5–5.5 m on four pillars over three doors (*est.*). Side wings 5.6 m high at the corners rising to 9.2 m beside the gable, with curved tiled copings (*est.*).
- Nave wall-head 15 m, ridge 25 m; corridor roofs 6.6–9.6 m; eight clerestory slits with gabled dormer heads a side (*est.*).
- The choir keeps its fanned roof. **No sanctuary lantern**: the overhead shows none, so the 22.5 m lantern was removed.
- Colours from the photos: pale blue-grey render `#bcc6cb` (lighter `#d3dadc`), on a tan stone base `#a8977a`, white trim; terracotta `#9c4d3a`.
- The precinct ring is set in from the carriageways, with gates at the apex, on Nguyễn Khuyến and on Nguyễn Huệ (estimated), and the forecourt, statue and grotto positions (estimated).

## What changed
- The church follows the real OSM plan in an axis frame, not an oriented bounding box. That plan gives the nave and corridors, the stepped crossing, and the narrowing choir with its polygonal sanctuary.
- 2026-11 photo audit: the front tower, porch arcades and sanctuary lantern are gone. The front is now its own block (stepped gable, pointed window, clock, canopy on pillars, curved wings), and the one tower stands over the crossing with the sourced 53 m cross.
- The whole triangular compound is fenced. The paved forecourt has the statue of Christ, and the grotto is at the rear left. At night the cross is lit, and the three doors and the big window glow.
- Named views `dcct-front` and `dcct-aerial` in `scripts/views.json`.

## Left to do
- Measured drawings would replace the photo-scaled heights.
- The real gate positions and the grotto's exact place.
