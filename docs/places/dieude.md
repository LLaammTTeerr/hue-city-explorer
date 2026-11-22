# Chùa Diệu Đế (dieude)

National pagoda (Quốc tự) on Bạch Đằng street, on the Đông Ba canal, Huế. The model is in `src/landmarks/places/dieude.js`. The old `dieuDe()` in `src/landmarks/civic.js` now returns early.

## Sources
- https://vi.wikipedia.org/wiki/Chùa_Diệu_Đế
- https://en.wikipedia.org/wiki/Diệu_Đế_Pagoda : the gates face the canal (SW); four towers, two of them flank the gate.
- https://baovanhoa.vn/di-san/khoi-cong-trung-tu-quoc-tu-dieu-de-37446.html : precinct over 10,000 m²; list of buildings; rebuilt in concrete in 1950.
- https://vietnamnews.vn/life-style/449823 : 2018 restoration, about US$1.4M.
- https://mia.vn/cam-nang-du-lich/vang-canh-chua-dieu-de-17072 : hall of 3 bays and 2 chái, ngói liệt tiles, 5 doors, twin dragons facing the moon on the ridge; stele 1.9 × 1.07 m, dated 1846.
- https://vinwonders.com/vi/wonderpedia/news/chua-dieu-de-diem-den-linh-thieng-bac-nhat-xu-hue/ : hall 350 m², moved back 19 m on 24/9/2018; two-storey gate; hexagonal bell house and stele house; gạch vồ walls on a stone base.
- OpenStreetMap: way 771244228 (Đại Giác hall), way 771244225 (a long outline on the north-west side of the court), footway 257257955 (axis), node 7199615582 (entrance), and three mapped roofs at the back of the block (north corner, south-east corner, the range on Tô Hiến Thành).

## Confirmed
- The axis runs from Bạch Đằng (SW) to the hall (NE), along the OSM footway. The entrance is at node 7199615582.
- The block lies between Bạch Đằng (SW), Ngự Viên (NW), Diệu Đế (SE) and Tô Hiến Thành (NE). It is about 1.1 ha, which matches "over 10,000 m²".
- The hall footprint comes from OSM. It is about 21 m wide, about 350 m², and has 5 doors, a two-tier roof and a dragons-and-moon ridge.
- The gate has two storeys, with towers on both sides. There is a hexagonal bell house and a hexagonal stele house (the stele is 1.9 × 1.07 m).

## Estimates
- Positions of the gate, towers and the two hexagonal pavilions, read from aerial photos and descriptions (none of them are in OSM).
- All heights:
  - Hall about 10 m, within the heights-reference range [9,10].
  - Gate about 9.3 m.
  - Towers about 9.1 m.
  - Pavilions about 6 m.
- Paving versus lawn in the court, the trees and the bonsai pots.
- OSM way 771244225 (a 37 m range by the Ngự Viên wall) is not drawn: from above, only a small roofed structure (about 5 m square, near a 35, b −37) shows through the canopy there, and no other source shows a long range. It is drawn as a small walled shrine. A second small open pavilion, set askew, stands at the hall's west corner (satellite).
- Hall heights (base about 0.8 m, eaves about 5.1 m, upper ridge about 9.3 m above the ground) and colours: no street-level view reaches the hall.

## Satellite and Street View check (2026-11)
- Position and axis already matched the satellite to about 1 m and 1°, so the outline was not moved.
- From above, the hall reads as a double hall under one closed block: a lower front hall (ridge about a 67.4) and the main hall behind it, with a raised clerestory and an upper hip roof (ridge about a 76.9) inside a lower ring of roof on three sides. The wings and the rear range drawn before are not there, and they were removed.
- The yard is a dense grove, not a lawn with a few trees. It is now a jittered grid of crowns that keeps clear of the axis, the court, the pavilions and the mapped roofs.
- Street View from Bạch Đằng and Ngự Viên shows an old brick wall about 2.4 m high, and a second entrance between grey stone piers about 25 m north-west of the axis. Both are now modelled.
- Street View from Tô Hiến Thành shows a single-storey range with tiled and corrugated-iron roofs and ridge ornaments, behind a red-painted wall on an old brick base. It is mapped (OSM) and is now drawn by the place file: a low brown-tiled range with dragons on the ridge, a corrugated-iron sheet over the street-side slope carried on as a lean-to verandah on thin posts, and small red-tiled houses at both ends (satellite). The wall in front of it is low brick under a red screen, with a small back gate on the axis between mossy brick piers.

## Review fixes (2026-11)
- Wall line set from the satellite and Street View: along Bạch Đằng about 7 m in from the kerb, with a grass verge and a banyan in front; along Ngự Viên about 5.5 m in (4 m further in than before); along Diệu Đế 1-2 m in; along Tô Hiến Thành about 4 m from the centre line, following the street, with the east corner cut back where the street turns. The wall runs unbroken along Ngự Viên and Diệu Đế (the side gates were unsupported and are gone).
- The second entrance on Bạch Đằng has slim grey stone piers with ball finials.
- The pagoda's three back ranges are drawn with brown tiled hips: the north-corner house with a double roof (it was a white generic house from Ngự Viên), the south-east house, and the Tô Hiến Thành range.
- The grove is near-continuous, as from the air: a denser grid, smaller trees between roofs, crowns meeting over the axis walk, low crowns and a double row of shrubs along the inside of the wall. Paving is kept to the axis and the area before the hall.

## What changed
- The old builder drew a single glazed pavilion and treated way 771244225 as the gate. That was wrong: it is a long side range.
- The new model has:
  - the walled precinct on the real block;
  - a two-storey gate on Bạch Đằng with octagonal towers on both sides;
  - the bell and stele pavilions;
  - the Đại Giác double hall on a stone base (front hall, main hall with clerestory and upper roof);
  - two small pavilions, a court with an axis walk, lawn and a dense grove;
  - eave lights and lamps for night.

## Left to do
- Đạo Nguyên các (the old library tower) is left out, because it is unclear whether it has been rebuilt.
- The other two of the four towers are not placed, because their positions are unconfirmed.
- Some sources say the 2018 work replaced the concrete hall with a wooden one. This is unconfirmed, so the colours follow recent photos.
- The unmapped orange-roofed house in the north corner by Tô Hiến Thành (probably a separate lot) is not drawn; the wall now encloses its site.
