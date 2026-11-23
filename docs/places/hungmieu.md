# Hưng Miếu (`hungmieu`)

Replica in `src/landmarks/places/hungmieu.js`. It covers the temple north-west of Thế Miếu in the Imperial City, the court in front of it, its Miếu Môn gate, the four small gates, the two side walls of its compound, and the Thần Khố and Thần Trù halls.

## Sources
- https://vi.wikipedia.org/wiki/H%C6%B0ng_Mi%E1%BA%BFu: plan, platform, columns, bays, court, gate names, steles, history.
- OpenStreetMap outlines, hard-coded in model metres:
  - Hall: way 172657565.
  - Miếu Môn, the Chương Khánh, Dục Khánh, Ứng Tường and Trí Tường gates, Thần Khố and Thần Trù: ways read from `data/raw/hue-osm*.json`.
  - Compound walls: 695810851 (outer) and 695810842 (dividing wall).
- City survey height of 7.0 m (`scripts/build-data.mjs` TRUE_H 8.5 / `docs/heights-reference.json`). The heights check still passes.

## Confirmed
- The hall is about 19 × 19.2 m, on a 0.68 m stone platform, with yellow glazed tiles.
- It is a *trùng thiềm điệp ốc* building (a main house and a front house joined), with 9 × 8 columns.
  - Main house: 3 bays plus 2 lean-to bays (*kép*).
  - Front house: 5 bays plus 2 end bays (*chái*).
- Six free-standing columns stand in front of the hall.
- The court is 20 × 18.45 m, with a 2.15 m stone central path (*thần đạo*), six planters and a bronze incense burner.
- There are two steles, from 1804 and 1821.
- The gates are Chương Khánh, Dục Khánh, Ứng Tường and Trí Tường. Thần Khố and Thần Trù stand to the sides.
- The hall was rebuilt in 1951 and restored in 1995, with red lacquer and gilding (the state modelled).

## Estimated
- The depth split between the front house and the main house, the eave and ridge heights (ridge about 7.3 m), and the ridge ornament (a flaming pearl and two dragons).
- The form of the Miếu Môn: I modelled it as a three-door tam quan with a raised centre bay. I also moved it onto the hall axis; OSM places it 2.1 m off.
- The form of the four small gates and the two service halls, and the side the steles stand on.
- The colours of the court brick and the walls.

## Changed
- Before: Hưng Miếu was a generic extruded OSM building.
- Now: the double-roofed hall stands on its platform, with a five-door facade, gold panels and six court columns.
- The brick court has its stone thần đạo, planters, burner and steles, and the Miếu Môn tam quan with screen walls.
- Also new: the four small gates, the two side walls (`FENCE.imperial`), and Thần Khố and Thần Trù.
- The outer and dividing walls are left to civic.js and the Thế Miếu replica, so they are not drawn twice. No `replaced()` guard was needed.

## Satellite and Street View check (2026)
- On the satellite (Google, zoom 19 and 20, kept in scratch only) the hall's roof has OSM's size and axis (bearing about 54°) but both eaves lie about 2 m further back (north-north-west) than the OSM outline. The hall, platform and court are now framed from the outline moved back 2 m (`HALL_BACK`); the Miếu Môn keeps its mapped distance, so the court is 2 m longer. Gates, walls and service halls stay on OSM.
- Street View near the hall is all user photospheres: the hall's interior (red lacquer, gilding, encaustic-tile floor), walls, and ornate arched gates whose identity is uncertain. The hall's exterior is not visible, so its heights and roofs are unchanged.
- Gates: every gate of the precinct seen in the photospheres is a masonry arched gate (red-plastered round arch between yellow piers with relief panels, a stepped mock roof of two or three tiers with blue-and-white porcelain and dragon finials, about twice the wall's height). None is a hip-roofed gatehouse. All four small gates and the Miếu Môn are now drawn in that type by the shared builder `src/landmarks/archgate.js`. The Miếu Môn is in no photo, so its three openings (taller centre) are an estimate. Thế Miếu's replica can use the same builder.

## Review fixes (2026)
- Side walls: weathered dark grey-brown lime plaster under a dark coping (FENCE.imperial's proportions with new colours), with a band of pierced tile panels on the two west walls toward the garden, as in the photospheres. The front and rear walls belong to civic.js and are unchanged.
- Court and apron: pale grey paving, as on the satellite, not red brick.
- Hall tiles: weathered brown ochre (#b98a4c), as on the satellite, instead of the shared bright imperial tile.
- Front: four lattice-topped door leaves per bay between lacquered posts, as in the interior photosphere.
- An unmapped hall outside the east side wall (satellite roof about 12 x 7 m, long side across the axis, 33 m across and 16 m forward of the hall's centre): a plain hall under a weathered hip roof. Its use and elevation are estimates.
- Canopy: 23 shade trees added to data.trees round the hall, court and gates, and clipped shrubs along the court's sides.

## Left to do
- Two data trees still stand in the court. Low paving does not keep trees off.
- There are no night lights.
- Thần Khố and Thần Trù are drawn here. Check that the Thế Miếu replica does not also claim them; at the moment it does not.
