# Cửa Ngăn (Thể Nhơn môn, 體仁門)

Place id `gate:Cửa Ngăn`, built by `src/landmarks/places/gate-cua-ngan.js`. The generic `gate:<name>` guard in
`src/landmarks/citadel.js` skips the old generic gate. A one-line guard in `src/geo/city.js` skips the shared
12.5 m road-bridge slab for `Cầu Cửa Ngăn`, because this file draws the causeway.

## Sources

- vi.wikipedia, *Kinh thành Huế*: Cửa Thể Nhơn, commonly called cửa Ngăn, is one of the ten main gates. The name
  comes from the walled road from the palace to the river that once passed through it.
- nguoihanoi.vn, *Độc đáo kiến trúc, tên gọi các cửa ra vào Kinh thành Huế*, and dulichhue.biz, *13 cửa ra vào Kinh
  thành Huế*:
  - On the south face, left of Kỳ Đài.
  - Arch built in 1809 (Gia Long), first named Thể Nguyên.
  - Vọng lâu added in 1829 (Minh Mạng), who renamed the gate Thể Nhơn.
  - Today a one-way street from 23/8 to Lê Duẩn runs through it.
- nghiencuulichsu.com, *Công cuộc xây dựng Kinh thành Huế* (2015): every main gate is 3 storeys, about 16 m high.
- OpenStreetMap (data/raw/hue-osm.json):
  - Gate building, way 619851622 (alt_name Cửa Thể Nhơn, name:zh 體仁門): 17.1 m along the wall, 12.0 m through.
  - The street through the gate (tunnel, layer -1).
  - The bridge, man_made way 1431132256: about 56 × 5.9 m. The bridge road is `Cầu Cửa Ngăn`.
- Wikimedia Commons, Category:Thể Nhân Gate: Cửa_Thể_Nhân.jpg (2018), Cửa_Thể_Nhân_-_Huế.JPG,
  4.4_Hue-2_(36580947996).jpg, Hue_-_Meridian_Gate.jpg.

## Confirmed

- Name, dates and position on the wall. Plan size and axis, from OSM.
- One round-arched passage.
- A masonry vọng lâu in two diminishing storeys under glazed orange-yellow tile, not a timber pavilion.
- A name panel over the arch, with the characters 體仁門.
- A white-balustraded masonry causeway over the moat.
- About 16 m to the finial (the model reaches about 16.3 m).

## Estimated (from photographs, no measured drawings found)

- Passage opening 3.8 m wide, 4.6 m to the crown, set in a 5.8 m recessed brick panel.
- Cornice at about 7.8 m and a solid parapet about 0.8 m high.
- Lower tower storey 8.2 × 7.0 m. The depth is a guess, since the photos show only the front.
  - Three arches on the long faces, one on each short face.
- Upper storey 4.0 × 3.6 m. Roof heights.
- Render patch pattern and colours.
- Culvert: one small vaulted culvert near the gate end. The photos show at least one; the count is unconfirmed.
- The causeway's side walls run straight down to the water, with no separate pier detail.

## What changed

- The generic crenellated block with its timber two-tier pavilion is replaced by:
  - weathered red brick with grey lime-render patches;
  - rendered corner pilasters;
  - a brick-framed arch and the 體仁門 panel (a canvas texture);
  - a solid parapet with posts;
  - the two-storey masonry vọng lâu with glazed hip roofs, curled ridge ends and a spike finial.
- The block fills the notch in the rampart's inner face, and its front stands a little proud of the outer face.
  The rampart, moat and bastions (`kinhthanh`) are untouched.
- The bridge is now a 5.9 m causeway (it was a 12.5 m generic slab). It follows the shared bridge profile
  (`bridgeProfiles`, rise 1.0), so traffic still matches the deck. It has:
  - vase balustrades and end piers with wing walls;
  - the culvert;
  - a small corbelled bay under the shared street lamp at s = 18 m. life.js stands lamps 5.25 m off the
    centreline, which is wider than this deck.
- Night: warm light strips under both eaves and the cornices, plus lanterns in the passage.

## Left to do

- Inner (city-side) face details, which are not in any photo found. It is drawn the same as the outer face.
- Tower depth and the culvert count, which need a site photo from the side or a plan.
- The lamp offset in life.js is a shared issue: lamps on narrow named bridges stand beside the deck. The bay is a
  local workaround.

## Google imagery check (2026)

Checked against Google satellite and Street View (visual reference only; nothing traced or copied).

- Position and axis: the gate block sits within about 1.5 m of the satellite's, and the wall and bridge axes agree
  to within a few degrees. No change to the anchor or the OSM outline.
- Measured on the Street View looking up the bridge axis (scale from the 17.1 m block width): block top with its
  parapet about 8.8 m, lower tower storey about 8.5 m wide with its brick top about 4 m over the block's top, finial
  about 17 m. The lower storey was 8.2 m wide and 3.2 m tall; it is now 8.5 m and 3.8 m, so the finial stands at
  about 17 m. The published figure ("cao chừng 16m", for all main gates) is approximate.
- Brick tones darkened towards the weathered brown the current photographs show.
- Not changed here: the rampart's inner side near the gate. Street View shows a low brick retaining wall (about 3.5 m)
  along Ông Ích Khiêm with grey rendered piers, the rampart top set back behind a grass slope, so the vọng lâu shows
  over it from the street. The shared rampart (`kinhthanh`) draws a full-height inner face at the road.
