# Cung Diên Thọ (`dientho`)

The queen mothers' residence in the north-west of the Imperial City. The model is in `src/landmarks/places/dientho.js`.

## Sources
- vi.wikipedia.org/wiki/Cung_Diên_Thọ: the plan, the sizes, the bay counts, the roofs, the gates and the restoration dates.
- vinwonders.com/vi/wonderpedia/news/cung-dien-tho-cung-dien-quy-mo-bac-nhat-con-sot-lai-o-hue/: Phước Thọ Am's court (bát tràng brick, a shallow pond, rockwork) and the tạ's bridge to the south bank.
- artsandculture.google.com, "Truong Du Pavilion of Dien Tho Palace" and "Tinh Minh Mansion": the tạ is close to the pond's north bank and faces south; Tịnh Minh Lâu was built in 1927 on the base of the Thông Minh theatre.
- OpenStreetMap ways, read from `data/raw/hue-osm.json`:
  - Halls: main hall 172763420, Thọ Ninh 172763421, Trường Du Tạ 531031538, Tịnh Minh Lâu 531031540 (wing 695810800), Khương Ninh Các 531031542 (back hall 695810779), Tả Trà 617437911.
  - Pond 695810794.
  - Screens 617991230 and 695810776. Gates: Thọ Chỉ 695810806 and Diễn Trạch 695810777.
  - Corridors 617991231/32/33 and 695810799.
  - Walls 695810801/02/74/75/96/97.

## Confirmed
- The precinct measures 138.5 × 126.4 m. The OSM wall loop measures 138.4 × 126.5 m, square to the hall.
- The brick wall is over 2 m high, with four gates:
  - Thọ Chỉ at the front, a two-storey gate (cửa lầu chồng) with the side doors Trinh Ứng and Thụy Quang.
  - Diễn Trạch at the rear, Địch Tường on the west, Thiện Khánh on the east.
- Brick screens stand inside Thọ Chỉ and inside Diễn Trạch.
- Main hall:
  - About 34.7 × 27.5 m (the OSM outline is 36.8 × 26.8 m, and the model uses it). Platform about 0.56 m. Three stone steps in front, and two at the back on each side.
  - It is a double house (trùng thiềm điệp ốc). The front house has 7 bays and 2 chái; the main house has 5 bays and 2 double chái.
  - Verandahs: 2 m in front, 4.5 m at the back. Yellow glazed tiles, and a gourd on the ridge.
- Điện Thọ Ninh stands about 20 m behind the main hall. It is half the hall's size, with 3 bays and 2 chái (its 1930 form).
- Tạ Trường Du (1849):
  - Its pond is 28 × 20 m (OSM: 28.1 × 20.4 m), and the tạ covers half of it, by the north bank.
  - It is a square pavilion of one bay and four chái on 16 columns, with glass walls and green glazed tiles.
  - A cloisonné gourd sits on the ridge. Two rockeries stand in the pond, and a bridge runs to the south bank.
- Khương Ninh Các / Phước Thọ Am (1830): two storeys of timber, 3 bays, facing west into its own walled court.
- Tịnh Minh Lâu: a two-storey Western house (1927), enlarged in 1950 and restored in 2005.
- Tả Trà: 3 bays and 2 chái, rebuilt 2011–2014.
- The halls are joined by covered corridors with green glazed tiles.

## Estimated
- All heights:

  | Building | Ridge height (m) |
  |---|---|
  | Main hall | 8.6, plus the gourd (the 9 m `TRUE_H` in build-data) |
  | Thọ Ninh | 7.5 |
  | Tả Trà | 7.1 |
  | Khương Ninh Các | 9.4 |
  | Tịnh Minh Lâu | about 11 |
  | Thọ Chỉ | 7 |
  | Walls | 2.5 |

- How the hall's depth splits between its two roofs, and the column rows.
- The colours:
  - Tịnh Minh Lâu: cream walls, white trim, green shutters, red-brown tiles. No source gives them.
  - The halls: dark lacquer with red columns.
  - Tả Trà and Khương Ninh Các: yellow tiles.
- Where the east and west gates stand:
  - Thiện Khánh is at the end of the walled lane east of Tả Trà (OSM walls 695810796/97).
  - Địch Tường is on Khương Ninh Các's axis, in its court.
- The Thọ Chỉ form: a raised central bay with a timber upper storey, and the side doors under lower roofs.
- The rockeries, the two kiosks in Khương Ninh Các's court, and the basin there.

## Changed
- Before: the main hall was one generic extruded OSM building with a 9 m height. The other halls were plain mapped buildings, and there was no precinct wall.
- Now the whole precinct is modelled:
  - The double-roofed main hall and Thọ Ninh.
  - Tả Trà and Tịnh Minh Lâu with its wing.
  - Khương Ninh Các with its walled court.
  - Tạ Trường Du on its pond, with the Lương Phong porch, the bridge and the rockeries.
  - The green-tiled corridors and the brick courts.
  - Both screens and all four gates.
  - The precinct wall and the inner walls.
- Google satellite and Street View check (2026-11): the hall, Thọ Ninh, the tạ, Tả Trà, Tịnh Minh Lâu and Thọ Chỉ
  sit on the satellite within about 2 m, and the hall's axis matches within 1-2°, so the OSM frame stays. What the
  imagery changed (all Street View panos there are user photospheres, so they were used for form and colour only):
  - The precinct and inner walls are dark, moss-stained brick with a plain coping (was ochre with posts).
  - Tả Trà wears dark brown unglazed tiles on the satellite; Khương Ninh Các and its back hall wear grey tiles
    with dark ridges (was yellow glazed).
  - Khương Ninh Các: dark brown timber leaves on the ground storey, a red-and-green gallery railing over the pent
    roof, red upper walls with glazed windows.
  - Thọ Chỉ: one painted masonry front (ochre, red arch frames) with three round-headed openings, the middle one
    larger, blue-and-gold mosaic panels and frieze, a tiled eave over the side bays and a raised panelled middle
    storey under the top roof (was a gatehouse with square openings and a timber upper storey).
  - Thiện Khánh, Địch Tường and Diễn Trạch: a painted masonry frontispiece taller than the wall, round-headed
    opening, small grey tiled cap.
- Not changed, sources disagree: the wiki gives green glazed tiles for the corridors and the tạ; on the satellite
  they read dark grey-brown (weathering or a different tile). The model keeps green.
- The mapped buildings drop out on their own, because the model covers them. No `replaced()` guard was needed: no older builder drew this place.

## Left to do
- There are no night lights.
- The four wells are not modelled.
- A few data trees stand in the paved courts, because low paving does not keep trees off.
- Phoenix finials on the hip ends are not drawn.

## Polish (Street View detail pass)
- Khương Ninh Các: ground-storey leaves now have joints, a lattice band, bottom rails and dark posts; gallery railing has
  balusters; upper windows are dark panes with a cream grid; pale bracket fringe under the pent eave.
- Thọ Chỉ: stepped stone plinth, grey string course, frieze split into separate red/blue panels, cream mosaic grounds
  with blue patterns and low red panels, five-panel upper storey. Side gates got pier finials.

## Review fixes
- A generic house no longer stands on Tiền Bình Phong. The place now exports `ownsMapped(ring)`, which
  `places/index.js` (`placeOwns`) passes to `geo/city.js`. Every mapped outline inside the precinct wall is drawn by
  this file: the 17 records are the halls, the screen, Diễn Trạch, Thọ Chỉ, the corridors and the kiosks.
- The gates have real round-headed passages: a vault, reveals and paving, with the court visible through them. The
  middle arch of Thọ Chỉ has red leaves folded back inside, and its side doors are shut with panelled leaves. The side
  gates have panelled piers, a red arch field, a projecting cornice, a stepped attic with framed panels and a low
  grey cap.
- Thọ Chỉ: the side eaves have no hip ridges or horns, the mosaic panels have cream grounds in grey frames over red
  panels, the frieze is made of framed panels, and the ridge carries dragons and a centre ornament.
- Khương Ninh Các: the red verandah columns are gone. It now has dark posts in the wall plane, a grey pent roof with
  pale rafter ends, and an open railing on a full-width gallery. The upper storey is 9.2 x 15.2 m and the main roof
  is straight, with no hips or horns. Its kiosks have grey tiles.
- The corridors and Trường Du Tạ now use a weathered dark grey-green (the satellite colour). The west corridors are
  narrow and run round a small court with a tree. The hall tiles are a weathered ochre.
- The half-moon lawn has its stone kerb. Trees from the satellite canopy are added in the rear court, the gardens
  and along the front wall.
