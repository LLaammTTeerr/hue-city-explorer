# Nhà thờ Dòng Chúa Cứu Thế Huế (`dcct`)

Model: `src/landmarks/places/dcct.js`. The older `redemptorist()` in `src/landmarks/civic.js` now returns early when the replica is loaded (`replaced('dcct')`).

## Sources
- vi.wikipedia, Nhà thờ Dòng Chúa Cứu Thế, Huế: https://vi.wikipedia.org/wiki/Nh%C3%A0_th%E1%BB%9D_D%C3%B2ng_Ch%C3%BAa_C%E1%BB%A9u_Th%E1%BA%BF,_Hu%E1%BA%BF
- VietnamNet, "East meets West at a Catholic church in Vietnam's former imperial capital": https://vietnamnet.vn/en/east-meets-west-at-a-catholic-church-in-vietnam-s-former-imperial-capital-2565143.html
- VnExpress, "Vẻ đẹp của hai nhà thờ trên đất cố đô": https://vnexpress.net/ve-dep-cua-hai-nha-tho-tren-dat-co-do-4122447.html
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

## Estimated
- The tower stands over the door at the front. Its square shaft rises to 21 m, then come three octagonal tiers (to 30, 37 and 42.6 m) under flared skirts, then the slate spire and the cross from 50 to 53 m. The stage heights are estimated; the 53 m total is sourced, and `npm run check` measures 53.1 m.
- Nave wall-head 15 m, ridge 25 m. Corridor roofs 6.6–9.6 m. The crossing core is 18 m to the wall-head, with an eight-sided crown whose top is at 32 m. That 32 m is the sourced roof height; its placement over the crossing is our reading of "arches leading up to an octagonal structure".
- The choir has a fanned roof, with an octagonal lantern over the sanctuary (22.5 m).
- Window counts and sizes, the porch arcades (three arches each side), colours (blue-grey stone `#8f9ca3`, terracotta `#9c4d3a`).
- The precinct ring is set in from the carriageways. It includes the monastery blocks, up to the west service lane. Gate positions are estimated: main gate at the apex, side gates on Nguyễn Khuyến and Nguyễn Huệ.
- The forecourt (30 m paved, lawns either side) and the positions of the statue and grotto.

## What changed
- The church follows the real OSM plan in an axis frame, not an oriented bounding box. That plan gives the nave and corridors, the stepped crossing, and the narrowing choir with its polygonal sanctuary.
- The bell tower is octagonal with three tiers over the porch, a clock and round window, and the 53 m cross. The old cross-shaped massing and side turrets are gone.
- The whole triangular compound is fenced. The paved forecourt has the statue of Christ, and the grotto is at the rear left. Generated infill houses inside the grounds east of the monastery are removed. At night the cross and spire are lit, the door and round window glow, and lamps light the forecourt and gates.

## Left to do
- Check against photos: the true tower shaft proportions, the porch form, the window rhythm, and whether the 32 m crown sits over the crossing or the sanctuary.
- The real gate positions and the grotto's exact place.
