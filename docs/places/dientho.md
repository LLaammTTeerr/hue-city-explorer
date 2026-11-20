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
- The mapped buildings drop out on their own, because the model covers them. No `replaced()` guard was needed: no older builder drew this place.

## Left to do
- There are no night lights.
- The four wells are not modelled.
- A few data trees stand in the paved courts, because low paving does not keep trees off.
- Phoenix finials on the hip ends are not drawn.
