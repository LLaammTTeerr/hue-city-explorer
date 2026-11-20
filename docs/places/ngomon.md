# Ngọ Môn (Noon Gate) — `ngomon`

Model: `src/landmarks/places/ngomon.js`. The old Ngọ Môn block in `src/landmarks/citadel.js` is skipped with `replaced('ngomon')`.

## Sources
- Vietnamese Wikipedia, Ngọ Môn (Hoàng thành Huế): https://vi.wikipedia.org/wiki/Ng%E1%BB%8D_M%C3%B4n_(Ho%C3%A0ng_th%C3%A0nh_Hu%E1%BA%BF)
- English Wikipedia, Meridian Gate (Huế): https://en.wikipedia.org/wiki/Meridian_Gate_(Hu%E1%BA%BF)
- Lê Đình Phúc, "Ngọ Môn" (school text, base 57.77 m, wings 27.06 m): https://loigiaihay.com/van-ban-ngo-mon-theo-le-dinh-phuc-a166321.html
- Travel and heritage write-ups (L-shaped Dịch tunnels, open stairs, 9 roofs: 1 yellow and 8 green): https://mia.vn/cam-nang-du-lich/ghe-tham-cong-ngo-mon-kham-pha-di-san-kien-truc-duoi-trieu-nguyen-2385, https://vinpearl.com/vi/ngo-mon-hue-tuyet-tac-kien-truc-cung-dinh-hue
- OSM way 172657562 (the U outline, already in `data.special.ngomon`).

## Confirmed
- U plan. Base 57.77–57.96 m along the front, wings 27.06–27.5 m. Base is "nearly / over 5 m" high, built of gạch vồ brick, bluestone and lime mortar. Overall height under 15 m.
- Five passages. Ngọ Môn (centre, for the emperor) and Tả/Hữu Giáp Môn go straight through the body under bronze beams. Tả/Hữu Dịch Môn are in the wings: arched, bent (L-shaped) tunnels from the court, lit by a round Thọ window on the outer wall. Recorded sizes: 13.3 × 8.2 thước (centre), 12.45 × 6.3 (Giáp), 7.6 × 6.3 (Dịch).
- Two open stairs, one each side of the body toward the rear, 5.25 m wide together, 21 bluestone steps of 22 cm each.
- Parapet (nữ tường) set with glazed openwork tiles.
- Plaque reading "Ngọ Môn" over the central gate.
- Lầu Ngũ Phụng: two storeys on a 1.14 m plinth, a 100-column lim frame lacquered red. The upper roof has 9 units (5 main, 4 side). The centre unit has yellow glazed tiles (hoàng lưu ly); the other eight have green (thanh lưu ly).

## Estimated
- **Footprint:** kept to the OSM outline (55.8 × 25.3 m, about 3 % under the published figures). It was squared up and made symmetric so it stays aligned with the rampart and the wall clearance in `city.js`.
- **Base and passages:**
  - Base top is 5.0 m, with a 0.9 m parapet.
  - Gate openings keep the ratios of the thước figures. I scaled them to fit the 5 m base, because the length of the thước used is unclear: centre 3.0 × 4.1 m, Giáp 2.3 × 3.85 m, Dịch 2.3 × 2.8 m (arched).
  - The Giáp gates sit at ±6.1 m from the centre.
  - The Dịch tunnels are shown as mouths only: one in each wing's inner face, and one in the back face of the set-back end behind it.
- **Stairs:** placement is my reading of "one each side of the body, toward the rear". The two flights run along the back face, rising outward to the terrace.
- **Lầu Ngũ Phụng layout:** the 9 units run along the U in this order: wing hall, corner link, side hall, link, centre, link, side hall, corner link, wing hall. Sizes and roof heights are estimates; the centre ridge is about 15 m above the ground.
- **Colours:** weathered grey-brown masonry, green glaze band, red lacquer, yellow/green tile palette.

## What changed (vs the old model in citadel.js)
- The base is solid blocks with three true through-passages: lined dark tunnels, stone surrounds at both mouths, lintels.
- Added: the Dịch arched mouths, the round Thọ windows, the plaque, the glazed-band parapet with breaks at the stair heads, and the two back stairs with their balustrades.
- Lầu Ngũ Phụng sits on its own 1.14 m U-shaped plinth with nine two-storey roof units, where the old model had five.
- Night uplighting kept: warm strips along the parapet top and under every eave, plus lamps before and behind each gateway.

## Left
- The plan of the Lầu (how the 9 roofs sit, and which way each ridge runs) still needs checking against an aerial photo or measured drawing.
- The thước-to-metre conversion for the gate sizes is unresolved.
- No ridge ornaments (pháp lam gourd, dragons) and no upper-storey window panels.
- The Kim Thủy bridges belong to the Đại Nội place.
