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
  - The passage was 4.4 × 5.4 m; since the Google Street View check it is 3.8 × 4.8 m (see below).
  - The lower storey of the tower is 9.0 m wide and 3.4 m high; the upper storey is 4.6 m wide and 2.2 m high.
- Not seen in any source:
  - The tower's depth (lower storey 6.6 m, upper 3.4 m).
  - The inner face. It is drawn like the outer face but without the tablet.
  - The end faces, given one opening each.
- The block runs through the wall from 0.5 m inside the rampart's inner face to 0.5 m beyond its outer face (17.0 m;
  the rampart is 16.0 m thick here in `data.wall`). OSM gives 14.2 m, but the passage must close the slot that
  `kinhthanh.js` cuts.
- Colours are taken from the photo and toned down a little towards the grey rampart that `kinhthanh.js` draws.

## Google satellite and Street View check (2026-11)
Captures (satellite z17-z20, five car Street View panos) are kept outside the repo. Findings:
- Axis: the wall runs about 144° and the passage about 54°/234°, as modelled.
- Position: the outline's outer face (t +7.1 m from the OSM centre) matches the satellite. The moat bridge and Yết
  Kiêu meet the face about 1.8 m north-west of the outline's centre; the car panos on the bridge and in Yết Kiêu put
  the passage 1-2 m that way too. The block is moved 0.8 m north-west, as far as the 5.6 m slot that `city.js` cuts at
  the outline's centre allows with the narrower passage.
- Passage: from the bridge pano, scaled by the riders in it, the opening is about 3.5-3.8 m wide with its crown about
  4.5-4.8 m up, under a deep (about 0.75 m) brick ring with the stone moulding sitting right on it and the tablet
  above. The model now has 3.8 × 4.8 m, a 0.75 m ring, the moulding on the ring and the frame closer in.
- Inner face (Yết Kiêu pano): above the moulding the face is lime-rendered grey with a raised horizontal panel; drawn.
- The rampart in `data.wall` stands about 1.8 m proud of the real outer face, so the block still runs out to t +9.4
  to close it; from the bridge the face is about 2 m nearer than in the pano. Not fixed here (the rampart is shared).
- Tower position: the satellite shows the tower roof 5-7 m north-west of the passage, and the Yết Kiêu pano agrees in
  bearing; the pano from the Tôn Thất Thiệp junction shows it straight behind the passage. The tower stays centred.

## What changed
- Replaces the generic Kinh thành gate on this site: a grey block with crenellations, under a red-and-gold wooden
  two-tier pavilion. The new model is a red-brick block with a balustrade, under the grey masonry two-storey tower
  with terracotta tiles.

## Left / not mine
- Cầu Cửa Hữu is still the generic road bridge from `city.js`, 12.5 m wide with parapets. The bridge in the photo is a
  narrower concrete deck with low parapets. Changing it would mean editing `city.js`.
- No night lighting: no source shows the gate floodlit.
- The rampart, moat and slot belong to `kinhthanh.js` and are untouched.
