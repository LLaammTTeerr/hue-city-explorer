# Chùa Diệu Đế (dieude)

National pagoda (Quốc tự) on Bạch Đằng street, on the Đông Ba canal, Huế. The model is in `src/landmarks/places/dieude.js`. The old `dieuDe()` in `src/landmarks/civic.js` now returns early.

## Sources
- https://vi.wikipedia.org/wiki/Chùa_Diệu_Đế
- https://en.wikipedia.org/wiki/Diệu_Đế_Pagoda : the gates face the canal (SW); four towers, two of them flank the gate.
- https://baovanhoa.vn/di-san/khoi-cong-trung-tu-quoc-tu-dieu-de-37446.html : precinct over 10,000 m²; list of buildings; rebuilt in concrete in 1950.
- https://vietnamnews.vn/life-style/449823 : 2018 restoration, about US$1.4M.
- https://mia.vn/cam-nang-du-lich/vang-canh-chua-dieu-de-17072 : hall of 3 bays and 2 chái, ngói liệt tiles, 5 doors, twin dragons facing the moon on the ridge; stele 1.9 × 1.07 m, dated 1846.
- https://vinwonders.com/vi/wonderpedia/news/chua-dieu-de-diem-den-linh-thieng-bac-nhat-xu-hue/ : hall 350 m², moved back 19 m on 24/9/2018; two-storey gate; hexagonal bell house and stele house; gạch vồ walls on a stone base.
- OpenStreetMap: way 771244228 (Đại Giác hall), way 771244225 (long side range), footway 257257955 (axis), node 7199615582 (entrance).

## Confirmed
- The axis runs from Bạch Đằng (SW) to the hall (NE), along the OSM footway. The entrance is at node 7199615582.
- The block lies between Bạch Đằng, the Diệu Đế lane, the Chùa Ông lane and Tô Hiến Thành. It is about 1.1 ha, which matches "over 10,000 m²".
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
- The side range (OSM way 771244225) is shown as a one-storey building with a verandah. Its use is unknown.
- The thiền đường wings and the rear range next to the hall are generic.

## What changed
- The old builder drew a single glazed pavilion and treated way 771244225 as the gate. That was wrong: it is a long side range.
- The new model has:
  - the fenced precinct on the real block, with side gates;
  - a two-storey gate on Bạch Đằng with octagonal towers on both sides;
  - the bell and stele pavilions;
  - the two-tier Đại Giác hall on a stone base, with wings;
  - the side range, a paved court with an axis walk, lawn and trees;
  - eave lights and lamps for night.

## Left to do
- Đạo Nguyên các (the old library tower) is left out, because it is unclear whether it has been rebuilt.
- The other two of the four towers are not placed, because their positions are unconfirmed.
- Some sources say the 2018 work replaced the concrete hall with a wooden one. This is unconfirmed, so the colours follow recent photos.
- The buildings behind the hall are left to city.js as generic houses.
