# Ngọ Môn (Noon Gate) — `ngomon`

Model: `src/landmarks/places/ngomon.js`. The old Ngọ Môn block in `src/landmarks/citadel.js` is skipped with `replaced('ngomon')`.

## Sources
- Vietnamese Wikipedia, Ngọ Môn (Hoàng thành Huế): https://vi.wikipedia.org/wiki/Ng%E1%BB%8D_M%C3%B4n_(Ho%C3%A0ng_th%C3%A0nh_Hu%E1%BA%BF). Gives base "đáy dài 57,96 m" and "mỗi cánh dài 27,50 m", citing Phan Thanh Hải (2015, dsvh.gov.vn; the PDF itself was not fetched). Passages "xây kiểu vòm cuốn"; the Dịch paths "gấp khúc trong lòng hai cánh chữ U".
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
- **Footprint:** 57.96 m along the front with wings reaching 27.5 m from the back face: the vi.wikipedia / Phan Thanh Hải pair, the better-attributed of the two published pairs (Lê Đình Phúc's 57.77 / 27.06 differs by 0.2–0.4 m). The OSM outline is 55.8 m wide and 24.75 m deep as the symmetric model drew it (the old header's 25.3 m was OSM's east wing alone), 4 % and 10 % short. The back face stays on OSM's line, aligned with the rampart; the ends move out 1.08 m each side and the wing tips 2.75 m toward Kỳ Đài. No source gives the depth of the main body, which keeps OSM's. The Lầu plinth and the end roof units grow with the base. `check:overlap` passes with the wall clearance in `city.js` still taken from the OSM ring.
- **Base and passages:**
  - Base top is 5.0 m, with a 0.9 m parapet.
  - Gate openings keep the ratios of the thước figures. I scaled them to fit the 5 m base, because the length of the thước used is unclear: centre 3.0 × 4.1 m, Giáp 2.3 × 3.85 m, Dịch 2.3 × 2.8 m (arched).
  - The Giáp gates sit at ±6.1 m from the centre.
  - The Dịch tunnels are real vaulted passages cut through the wing masonry: in from the forecourt through the wing's inner face, a right-angle turn under a flat ceiling, and out through the back face of the set-back end. Semicircular vaults (2.3 m span, crown at 2.8 m), dark lining set 0.5 m in from each mouth so the reveals stay lit, stone floor, proud bluestone arched surrounds. The exact line of the bend inside the wing is my reading of "gấp khúc".
  - The three central passages stay rectangular (bronze beams, "under bronze beams" in the sources); they were already lined through-tunnels.
- **Stairs:** placement is my reading of "one each side of the body, toward the rear". The two flights run along the back face, rising outward to the terrace.
- **Lầu Ngũ Phụng layout:** the 9 units run along the U in this order: wing hall, corner link, side hall, link, centre, link, side hall, corner link, wing hall. The centre ridge is about 15 m above the ground.
- **Lầu proportions (2026-11 Google audit):** checked against the Google satellite (z18-20 at the gate) and a user Street View photosphere taken on the causeway about 120 m out (camera pose estimated from the image, not its GPS). The satellite puts the base within about 1 m and 1° of the model; ground features (Kim Thủy ponds, forecourt terrace) overlay. What changed:
  - the yellow centre hall is about 20 m along the front at its eave (walls ±8.8 m, was ±6.2), with its upper storey nearly as wide as the lower one; the side halls' upper storeys likewise. The links between centre and side halls are now low one-storey roofs mostly hidden between them (kept for the documented count of nine);
  - the wing halls are about 9 m square (u 15.6–24.6 m), leaving about 3 m of open terrace to the parapet on the outer side, as both the satellite (averaging the two wings to cancel the image's lean) and the photo show; the plinth now ends 1 m past them;
  - the lower storey is shorter (2.4 m posts, eave about 2 m over the parapet) under taller, steeper upper roofs, with the overall top unchanged; the wing halls' and corner links' lower storeys are open colonnades (sky shows through them in the photo);
  - the round Thọ windows are on the front face of each wing tip, centred, about halfway up the base (two Street View images show them there), not on the outer side faces.
- **Colours:** weathered grey-brown masonry, green glaze band, red lacquer, yellow/green tile palette.

## What changed (vs the old model in citadel.js)
- The base is solid blocks with three true through-passages: lined dark tunnels, stone surrounds at both mouths, lintels.
- Added: the bent, vaulted Dịch tunnels (they were flat dark arched panels until the 2026-11 audit fix), the round Thọ windows, the plaque, the glazed-band parapet with breaks at the stair heads, and the two back stairs with their balustrades.
- Lầu Ngũ Phụng sits on its own 1.14 m U-shaped plinth with nine two-storey roof units, where the old model had five.
- Night uplighting kept: warm strips along the parapet top and under every eave, plus lamps before and behind each gateway.

## Left
- The plan of the Lầu was checked against the satellite at the level of unit widths; which way each ridge runs and the exact plan of the corner links still want a measured drawing.
- The thước-to-metre conversion for the gate sizes is unresolved.
- No ridge ornaments (pháp lam gourd, dragons) and no upper-storey window panels.
- The Kim Thủy bridges belong to the Đại Nội place.
