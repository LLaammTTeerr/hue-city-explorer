# Cửa Hữu (gate:Cửa Hữu)

The Tây Nam (south-west) gate of the Kinh thành, on the citadel's west front near the south-west corner, on the
axis of Yết Kiêu street. Model: `src/landmarks/places/gate-cua-huu.js`. The generic `'gate:' + name` guard in the
gates loop of `citadel.js` skips the old model.

## Sources
- Wikimedia Commons, `File:Cửa Hữu.jpg` (Christophe95, 1 Aug 2018, CC BY-SA 4.0), photo of the outer face:
  https://commons.wikimedia.org/wiki/File:C%E1%BB%ADa_H%E1%BB%AFu.jpg. This is the main source for the form.
- nghiencuulichsu.com, "Công cuộc xây dựng Kinh thành Huế":
  https://nghiencuulichsu.com/2015/09/26/cong-cuoc-xay-dung-kinh-thanh-hue/. It says the ten gates were built in
  1809, each "3 tầng, cao chừng 16m"; the vọng lâu on the Tây Nam gate was built in 1829; and "Cửa Tây Nam tức Cửa
  Hữu".
- VietnamPlus, "Magnificent beauty of Hue Imperial City's gates":
  https://en.vietnamplus.vn/magnificent-beauty-of-hue-imperial-citys-gates-post216550.vnp. It gives the arch as 1809
  and the tower as 20 years later, and places the gate on Yết Kiêu street.
- OpenStreetMap (from the repo's `data/raw/hue-osm.json`):
  - way 367959068 "Cửa Hữu": the footprint, about 19.7 × 14.2 m, start_date 1829.
  - way 39415416 "Cầu Cửa Hữu": the moat bridge.
- Bunker removal: tienphong.vn, https://tienphong.vn/thao-do-toan-bo-lo-cot-quan-su-tai-kinh-thanh-hue-post1878866.tpo,
  and vietnamplus.vn. These report that the 31 old military bunkers in the Kinh thành were removed. One of them stood
  on the rampart beside this gate's tower (baovanhoa.vn).

## Confirmed
- The gate block is bare red brick, a little higher than the rampart, with stepped-out end pilasters with cap blocks.
- It has one round-headed passage with a brick arch ring, inside a framed panel.
- Above the arch: a stone moulding at rampart height, then a grey stone tablet with three characters (西南門).
- The flat top has a cornice and a grey rendered balustrade with posts; the corner posts are taller and carry finials.
- The tower is masonry with two storeys:
  - The lower storey has three arched openings on the face (the middle one larger) with brick rings, and is rendered
    in weathered grey.
  - Above it is a short skirt of terracotta tiles with up-turned corners, then a balustraded terrace.
  - The small upper storey has one arched opening and a tiled roof with ridge ornaments and a lightning rod.
- The total height is about 16 m (source above). The model reaches 16.1 m to the ridge and 16.5 m to the ornaments.

## Estimates
- Sizes are scaled from the photo by the block's length (19.7 m, OSM):
  - The block is 8.3 m to the cornice and 9.5 m to the balustrade.
  - The passage is 4.4 × 5.4 m.
  - The lower storey of the tower is 9.0 m wide and 3.4 m high; the upper storey is 4.6 m wide and 2.2 m high.
- Not seen in any source:
  - The tower's depth (lower storey 6.6 m, upper 3.4 m).
  - The inner face. It is drawn like the outer face but without the tablet.
  - The end faces, given one opening each.
- The block runs through the wall from 0.5 m inside the rampart's inner face to 0.5 m beyond its outer face (17.0 m;
  the rampart is 16.0 m thick here in `data.wall`). OSM gives 14.2 m, but the passage must close the slot that
  `kinhthanh.js` cuts.
- Colours are taken from the photo and toned down a little towards the grey rampart that `kinhthanh.js` draws.

## What changed
- Replaces the generic Kinh thành gate on this site: a grey block with crenellations, under a red-and-gold wooden
  two-tier pavilion. The new model is a red-brick block with a balustrade, under the grey masonry two-storey tower
  with terracotta tiles.

## Left / not mine
- Cầu Cửa Hữu is still the generic road bridge from `city.js`, 12.5 m wide with parapets. The bridge in the photo is a
  narrower concrete deck with low parapets. Changing it would mean editing `city.js`.
- No night lighting: no source shows the gate floodlit.
- The rampart, moat and slot belong to `kinhthanh.js` and are untouched.
