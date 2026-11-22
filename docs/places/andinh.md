# Cung An Định (andinh)

Model: `src/landmarks/places/andinh.js`. The old `anDinh()` in `src/landmarks/civic.js` now returns early through `replaced('andinh')`.

## Sources
- https://vi.wikipedia.org/wiki/Cung_An_Định: site of 23,463 m², faces south to the An Cựu. Wall of brick 0.5 m thick and 1.8 m high with an iron railing on top. Three structures survive: the gate, Đình Trung Lập (octagonal, on a high base) and Khải Tường Lâu (built 1917–18, 3 storeys, 22 rooms, 745 m²). The Cửu Tư Đài theatre was destroyed in 1947.
- https://vinwonders.com/vi/bai-viet-du-lich/kham-pha-cung-an-dinh-hue/ and mia.vn: Trung Lập has a two-tier roof, eight-sided below and four-sided above, on a very high base. The gate has two storeys (tam quan), sành sứ relief and a pearl on its crest. The whole site is bright yellow.
- https://e.vnexpress.net/photo/places/inside-hue-palace-of-vietnams-last-king-4282191.html: 12 dragons on the pavilion roof. The gate is lime brick inlaid with porcelain and coloured glass.
- https://vietnamnet.vn/en/in-a-hue-palace-european-style-meets-asian-tradition-693508.html: medallions on the facade, Romanesque columns on the gate, the "An Định Cung" plaque.
- vufo.org.vn (article 97365): French-funded roof restoration finished in 2022. Address 179B Phan Đình Phùng.
- Wikimedia Commons photos: the 2024 front facade (Cung An Định images 01 and 03); Dalbéra's "façade principale", "façade sud" and "Le Palais An Dinh"; "Cung An Định, Huế (32311325687)", the gate seen from across the river.
- OpenStreetMap from the local extract (Overpass could not be reached): palace way 1172897446 (28.8 × 16.6 m), grounds way 1172894104, Trung Lập as a mapped round building about 3.6 m in radius.

## Confirmed
- The plan: palace footprint and orientation, the pavilion's position on the axis 17.7 m in front of the palace centre, the gate where the axis meets the river wall 25.8 m in front, and the outline of the grounds (all from OSM).
- Palace: 3 storeys, ochre stucco with white trim, rusticated quoins, arched windows with dark shutters, a porch on paired columns under a balcony, the 啓祥樓 board, a crest with finials, corner towers and a low hipped roof of dark tiles (from the photos).
- Pavilion: octagonal plan on a high base, an eight-sided lower roof, a square upper hip, 12 dragons and a pearl finial.
- Gate: two storeys, a single arched red door in the centre, an oculus in the upper storey, piers inlaid with porcelain and topped with turrets, and a pearl on the crest.
- Wall: 0.5 m brick with an iron railing on top.

## Estimated
- Heights, all measured from photo proportions. Palace: plinth 1.2 m, storeys of 4.8 and 4.4 m, cornice at about 10.8 m, attic to about 13.6 m, roof ridge about 15.8 m, tower finials about 16.8 m. This sits inside the heights-reference range of 16–18 m.
- Gate: about 7.6 m wide with the pearl at about 7.9 m, scaled from the 1.8 m wall in a photo.
- Pavilion: about 10.5 m to the top of the finial.
- Window counts per facade, the porch depth (2.2 m), the terrace and step layout, and the colours.
- The river stair: its position comes from the land mask and the photo; its size is estimated.
- The gate's side bays are modelled as porcelain-panelled solid wings. Photos show one central door, not three open arches.

## What changed
- The palace is now an explicit 3-storey European facade (plinth, quoins, towers, attic, porch and balcony, crest). Before, it was a box with procedural CIVIC windows that read as 4 storeys.
- The gate now stands in the river wall on the axis. Before, it stood outside the fence in the street. The wall is drawn with a 3.65 m opening for it.
- Trung Lập is resized to its mapped footprint, with an octagonal base and stairs, eight columns, the two-tier roof and the dragons.
- Added a gravel court and axis walk, the river stair (bến) across the street, and warm night lamps on the gate piers, the terrace, the porch and the pavilion.

## What is left
- The gate's exact mosaic pattern and its side openings, if any.
- The Bạch Trà garden behind the palace and the trees of the grounds. Trees still come from populate.
- Interior lighting of the palace windows at night.

## Rebuild from satellite and Street View (2026-11)
- Checked against the Google satellite view (zoom 19 to 20) and three Street View panoramas: a car pano across the river, and two user panos in the grounds. Their poses were estimated from the images; the user panos were not used to place anything. Google imagery was used as reference only. Nothing from it is in the repo.
- Position and axis already matched: the palace base line and the pavilion fall within about 1.5 m of the satellite, and the facade bearing is about 64°. The gate lines up in the car pano once its heading is corrected by about 28°. No anchor or data change was needed.
- Palace massing redone: a recessed two-storey centre with a balustrade and no attic, front wings at both ends with hipped roofs, and a square tower with a crown attic over each wing's inner front corner. The model top is about 20.6 m. The east wing runs the full depth. The west wing is 11 m deep, with a flat-roofed two-storey annex behind it, as the satellite shows.
- Trung Lập: a two-tier octagonal base (a balustraded stone terrace 1.6 m high, then a 0.9 m upper base). The stairs now sit on the west and east faces, not on the axis, as the panos show on the west. The rail between the columns is open on those faces.
- Open questions: three arched gate doors (the car pano and the "tam quan" wording) or one door; a cream gate (2025 pano) or grey stucco; the main roof length (the satellite suggests about 22 m); whether the east stair exists.
