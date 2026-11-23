# Phu Văn Lâu (`phuvanlau`)

Replica: `src/landmarks/places/phuvanlau.js`. `citadel.js` now skips this place (`if (replaced(key)) continue;`).

## Sources
- vi.wikipedia, Phu Văn Lâu: https://vi.wikipedia.org/wiki/Phu_Văn_Lâu
  - built 1819 under Gia Long; two storeys; two-tier roof; 16 columns; ground floor open, with no walls
  - two "khuynh cái hạ mã" stelae on either side (Minh Mạng); Thiệu Trị's stele house (1843) on the right-hand side
  - two small bronze cannons before the front, facing each other
  - blown down in 1904 and rebuilt as before; a corner collapsed in May 2014
- vntravellive: https://vntravellive.com/en/phu-van-lau-bieu-tuong-co-kinh-tram-nam-tuoi-xuat-hien-tren-to-tien-50000-dong-d39180.html
  - ironwood frame; the 4 middle columns run through both floors; eight roof slopes in two tiers; yellow glazed tiles
  - ground floor railing 65 cm high, washed pale yellow; a wooden rail round the upper floor
  - upper walls of boards; square windows on the front, round ones on the sides; gilt name board over the front windows
- vinwonders: https://vinwonders.com/vi/wonderpedia/news/kham-pha-phu-van-hue/
  - height 11.67 m; marble floor; yard paved with cement chequer tiles; ngói ống hoàng lưu ly
- tuoitre: https://tuoitre.vn/di-tich-phu-van-lau.html (restoration finished in Sept 2016 after 720 days)
- localvietnam: https://localvietnam.com/hue/phu-van-lau/ ("16 dark-red pillars"; the stele house still stands)
- OSM way 531031520 (already in `data.special.phuvanlau`): outline 13.6 × 13.1 m, square to the Kỳ Đài–river axis

## 2026 rebuild: checked against satellite and street-level imagery
Matched renders (same lat/lon, heading, pitch and FOV as three car Street View panos on Lê Duẩn, plus a north-up
z20 satellite frame) were compared with the model. The imagery was used only as a visual reference; none of it is in the repo.
- Position: the OSM outline sits about 1.6 m east and 0.8 m north of the building. The place file adds `OFFSET` (−1.4, +0.8) to
  the outline centre and keeps the OSM axis (bearing ~144.6°, the Kỳ Đài axis is 144.1°; satellite roof edges ~141–143°).
- Platform about 1.2 m high, with a stair on all four sides (front and back wide, the sides narrower), cheek walls with sloped coping.
- The 65 cm pale balustrade stands at the platform edge, not on the column line; piers at the corners and openings.
- Lower eave about 12.3 m across (9.5 × 9.0 m column frame + 1.4 m overhang), low corner kicks.
- Upper floor about 4.2 × 4.0 m with a balcony rail at ~5.0 m; upper eave about 5.4 m across.
- Front and back of the upper floor: one wide dark window between two pale panels, the name board above it on the front.
  Sides: round windows. (This matches the vntravellive account, not the earlier three-square-window version.)
- Ridges in pale ceramic, a crest with dragon ends and a pearl on the top, rather than gilt.
- Cannons stand toward the road, about 11 m in front of the centre, ±6.5 m off the axis; the stelae about 13.4 m to each side.
- The stele house is not beside the pavilion: it stands about 43 m to the south-west on its own OSM footprint (a small
  building in `data.bld`), and the model draws it there.

## Confirmed and modelled
- 16 dark-red columns (4 × 4); the inner 4 rise to the upper floor
- the open ground floor behind the 65 cm pale-yellow balustrade, open at the middle bay front and back
- two hipped roof tiers in yellow glazed tile with upturned corner horns
- the upper floor in boards with a balcony rail: a wide window between pale panels front and back, a round window each side, and the red and gold name board
- two bronze cannons facing each other before the front; two dismount stelae; the stele house on its own footprint ~43 m SW
- the chequer-tiled yard
- top at 11.8 m (heights reference; the 11.67 m figure is within the tolerance)

## Estimated
- column grid 9.5 × 9.0 m (bays 2.65 / 4.2 / 2.65 and 2.5 / 4.0 / 2.5)
- the platform: 1.2 m high, six steps on each side
- upper floor 4.2 × 4.0 m; balcony 5.0 m
- the eave heights (lower at 4.2 m, upper at 8.3 m above the yard)
- the stelae's size
- the stele house: 5.4 m pale plinth (from the top view), 3.6 m inner base, dark timber posts, a weathered brown-orange hipped roof with grey ridges
- the yard: 60 × 27 m of brick paving with grout lines, the long side across the axis, with an 11 × 11.5 m brick-edged planter on each flank
- all colours

## Roofs
- both tiers are hipped on a long ridge (lower 2.8 m of 9.5 m, upper 3.9 m of 4.2 m) with rows of tube tiles in yellow-orange glaze
- small upturned kicks at the corners only, no large horns
- the upper ridge carries a crest band, two inward-facing dragons and a central pearl about 11.15 m above the yard (no spire)
- stair cheeks are grey stone with a lighter coping

## Night
- light strips under both eave tiers and along the column-head beam
- lamps at the front and back steps; uplights at the platform corners

## Left to do
- check the bay widths, platform height and window shapes against a measured drawing or photos (one source swaps round and square windows)
- the ornamental dragons on the ridges are simplified to a few beams
- the shared Lê Duẩn footway runs ~3–4 m closer to the pavilion than in the imagery, so the cannons stand at ~11 m instead of ~15 m
- Nghênh Lương Đình and the river steps are a separate place (`nghenhluong`) and were not touched
