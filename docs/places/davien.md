# Cồn Dã Viên (daVien)

Island in the Perfume River, west of the Citadel. Replica: `src/landmarks/places/davien.js`.

## Sources
- VOV, "Da Vien islet in central Hue city": https://english.vov.vn/en/places/da-vien-islet-in-central-hue-city-262586.vov
- Viet Nam News, Feb 2023, "Tranquil Da Vien islet in Hue renovated": https://vietnamnews.vn/sunday/1484298/tranquil-da-vien-islet-in-hue-renovated.html
- Tuổi Trẻ 2021, imperial park plan: https://news.tuoitre.vn/vietnams-thua-thien-hue-constructs-imperial-park-on-da-vien-islet-10361290.htm
- Lao Động 2025 report on the west part (overgrown, cattle grazing)
- huengaynay / vietnamtourism snippets (40 m tower, 1,500 m³ tank); vi.wikipedia "Tháp nước"; Commons "Cồn Dã Viên.jpg" (2008)
- OSM: park way 174746316, footways 1167517129 / 1167517134, island land ring, tower outline (round, 19.4 m, survey height 41.8 m)

## Confirmed
- Area over 100,000 m² (model ring 113,723 m², about 834 m long).
- Water plant built 1953 (VOV says 1957) in the middle of the island, with a tower of about 40 m and a tank of about 1,500 m³.
- 2021 renovation of the east part: stone-paved winding paths under the bridges to the east tip, central lawns and flower gardens, yellow ochna (mai vàng) garden at the east tip.
- About 3,000 trees planted in 2004; the island is densely wooded.
- West part renovated but now overgrown.

## Seen in Street View and the satellite (reference only, nothing traced)
- Tower: a squat 16-sided concrete shaft nearly as wide as the drum, two ring bands, two rows of small windows, an outside ladder on the east-north-east, a corbel of radial brackets, a streaked drum about 17.6 m across, flat roof inside a railing. Height split about 70 % shaft, 10 % corbel, 20 % drum.
- Shaft centre about 2.5 m east of the OSM outline's centre (east-west from the roof disc and the shaft agree; north-south is bracketed by the foot and the shadow, so the OSM value is kept).
- Plant west of the tower: filter house of two rows of four gabled bays, a taller tiled hall west of it, a link and an annex, two round clarifiers (about 13 m) with radial walls, two low covered round reservoirs (about 20 m).
- No houses stand on the islet; only the service road and footways.

## Estimated
- Plant heights, roof pitches and exact sizes (from satellite footprints and pano proportions); tower window, bracket and railing-post counts; drum depth (1,500 m³ in a 17.6 m drum is about 6.2 m of water, drawn 8.3 m with its skirt). Colours are weathered concrete and tile.
- Round lawn bed (ring radius 14 m) and centre bed, junction beds, ochna grid at the tip: sizes and positions estimated from the path layout.
- Tree cover: trees added on a jittered 8.5 m grid, sparse in the east park, dense in the middle and west, kept clear of paths, rails, bridge decks, buildings and existing OSM trees.

## What changed
- First replica: the water tower in place of the generic mapped cylinder, flower and ochna beds in the east park, dense tree cover.
- Rebuild from Street View and satellite: tower re-proportioned (wide shaft, bands, windows, ladder, railing; drum 17.6 m, not the 19.4 m OSM outline) and moved 0.8 m east (the satellite puts it 2.5 m east, but the drum must cover the OSM outline so the generic cylinder is dropped); the water plant drawn; `scripts/build-data.mjs` keeps generated infill houses off the islet (5 removed).
- Review fixes: windows redrawn as the panos show them (two close rows of twelve near-square openings, about 1.1 x 1.5 m, between the ring bands at 10.7 m and 17.0 m, the ladder between two of them, three single low ones; the row under the corbel removed); roof a shallow cone (0.8 m) with 24 radial ribs and a centre hatch, as on the satellite; concrete paler and greyer with sparser dark streaks. `scripts/build-data.mjs` no longer lines bridge ways laid at grade with avenue trees: the at-grade road over the islet stands for the raised Dã Viên deck, and a flame tree stood on its verge in front of the tower (about 490 avenue trees on such ways city-wide went with it; the random stream is unchanged).
- Height entry added to `docs/heights-reference.json` (40 m, Viet Nam News; survey 41.8 m).

## What is left
- The 1868 Tự Đức stele (position unknown).
- Fences, the ruins in the south-west, workers' housing.
- The western imperial park (not confirmed as built).
- The Cầu Dã Viên bridge and its piers belong to `bachho` and were not touched.

## Open questions
- OSM maps the tower 19.4 m across; photos and the satellite read 17-17.6 m. 17.6 m is drawn.
- Some captions put the Tạo Đàn (Nam Giao-style altar) site off the islet; the model keeps the east part as the renovated park.
- Tower position: the two car-pano bearings meet about 2.8 m north-east of the drawn centre (-1850.5, 1225.3 against -1853.3, 1227.9). Moving it there leaves the OSM outline uncovered (check:overlap); correcting the outline upstream would allow it.
