# Lăng Minh Mạng (Hiếu Lăng): replica notes

Builder: `src/landmarks/places/minhmang.js` (id `minhmang`). The older `minhMang()` in `src/landmarks/tombs.js` now returns early through `replaced('minhmang')`. Its helpers are exported at the end of tombs.js so the replica can reuse them.

## Sources
- https://vi.wikipedia.org/wiki/L%C4%83ng_Minh_M%E1%BA%A1ng: layout, dimensions and heights
- OpenStreetMap ways, read from the local extract `data/raw/hue-osm-south5.json` because Overpass could not be reached:
  - Bi Đình 206627336
  - Hiển Đức Môn 206627337
  - Sùng Ân điện 206627338
  - Minh Lâu 206627339
  - Bửu Thành 206627350
  - side halls 206627327, 206627334, 206627329 and 771244246
  - lakes as pond 32 in hue.json
- (en.wikipedia "Tomb of Minh Mạng" returned 404 from this environment)

## Confirmed facts (sourced)
- Precinct 18 ha; La Thành about 1,750 m; axis over 700 m.
- Đại Hồng Môn: more than 9 m high and 12 m wide, 3 passages, 24 roofs. Model: 9.5 m.
- Bái Đình (salutation court) about 45 × 45 m, with stone mandarins, elephants and horses in rows on each side.
- Bi Đình on a mound, holding the stele "Thánh đức thần công".
- Sân triều lễ in 4 levels; Hiển Đức Môn; Sùng Ân điện 23.45 × 22.05 m, a front hall plus the main hall; Hoằng Trạch Môn behind it.
- Trừng Minh lake crossed by three bridges (the centre one for the emperor); Tam Tài terraces carrying Minh Lâu (square, 2 storeys, 8 roofs), flanked by two trụ biểu.
- Thông Minh Chính Trực bridge over Tân Nguyệt lake; 33 steps up to the Bửu Thành gate.
- Bửu Thành: a circular wall 3.5 m high, about 273 m round, enclosing the tumulus with pines.
- Footprints and positions of the mapped buildings, and the lake shapes, come from OSM.

## Estimates
- Heights: Sùng Ân about 10 m and Minh Lâu about 13.5–14 m above ground (both pass check:heights); Bi Đình, Hiển Đức Môn and the side halls are scaled from photos.
- Terrace sizes and levels for the Bái Đình, the Sân triều lễ steps and the Tam Tài terraces (three tiers of about 0.95 m).
- Statue count and spacing; the forms of the Tả/Hữu Hồng Môn side gates and their position (±26 m); the gates of Hoằng Trạch Môn and Bửu Thành.
- Bridge widths: centre 5.2 m, sides 3.4 m; Thông Minh Chính Trực 5.4 m with a low arch.
- The water strip in the neck of Trừng Minh under the three bridges. The 25 m terrain grid hid that water, so the replica draws it.

## What changed
- The whole axis is rebuilt to the documented plan: a three-bay Đại Hồng Môn with a lầu; a paved Bái Đình with statues; Bi Đình on two terraces; the 4-level court; Hiển Đức Môn; Sùng Ân (front and main hall) with four side halls and walls; Hoằng Trạch Môn.
- Trừng Minh neck with three bridges; Tam Tài terraces with brick faces and lawn tops; two-storey Minh Lâu; trụ biểu on mounds.
- Thông Minh Chính Trực bridge and the 33-step flight; the Bửu Thành ring wall on the OSM outline, with a bronze-leaf gate, the tumulus and pines.
- Paved courts are marked in `S.paved`.

## What is left
- The lake pavilions (Điếu Ngư, Quan Lan, Nghênh Lương, Hư Hoài) are not built because their positions are unconfirmed.
- Only the front stretch of the La Thành is drawn; the rest of the 1,750 m wall still needs a reliable outline.
- The Truy Tư điện ruins and the outer guard posts are outside this pass.

## Satellite alignment (rebuild pass)
- Checked against satellite imagery at z19/z20 (visual reference only; nothing traced into `data/`). The OSM outlines
  of the axis buildings sit about 2.9 m south of the imagery, a uniform offset, so the place file shifts the axis ends,
  the trụ biểu and the mapped item rings 2.9 m north (`OFF`). The axis direction already matched (within ~0.5°).
- Placed on the imagery along the shifted axis: Sùng Ân at s 174.7, the back wall of its court (Hoằng Trạch Môn) at
  s 205.5, the side halls at s 146.8 / 190.6 and t ±22 (roofs about 19 x 13 m), the side bridges at t +15.8 / −17.6,
  Minh Lâu, the Tân Nguyệt bridge and the Bửu Thành gate on t −0.8. Roof plans sized to the imagery: Sùng Ân about
  25 x 26 m, Minh Lâu about 14 m, Hiển Đức Môn about 9 x 13 m, Bi Đình about 11 m.
- Bi Đình: a Street View photosphere shows yellow stucco walls (not an open colonnade), a two-tier roof and terraces
  some 3.5 m high with dragon-balustrade stairs; the terraces are raised to match and a flight added down the back.
- The trụ biểu mounds are draped over the slope (the north one now sits on Thành Sơn's flank).
- Left as OSM gives them: the lakes (the north shore of the southern lake reads 5–9 m south of the imagery) and the
  Bái Đình width (about 40 m on the imagery vs the documented 45 m).

## Review fixes
- Trừng Minh neck: the raised water slab is gone. The lake polygon already covers the neck and the terrain carves it,
  so the place file now only adds stone kerbs at both banks (s 216.5 / 239.5) from below the lake surface to the bank.
  The brown humps and the dark slab on the Tân Nguyệt bridge were city.js's generic bridge decks drawn over the
  place's own bridges; `ownRoads` in the place file lists those OSM ways, and city.js skips them (as for Gia Hội).
- Bi Đình, from the Street View photosphere: plain yellow stucco walls with a dark front doorway; a short cổ lâu frieze
  between two orange-brown hip roofs with a dark fascia and horns; brick-parapet terraces (21.5 and 16 m square); one
  5 m flight at the front with dragon balustrades.
- Side halls: dark grey weathered tile (as the imagery shows, unlike Sùng Ân), walls 17 x 9.8 m under a 0.7 m
  overhang, so the roofs read about 19 x 13 m from above.
- The pavilion OSM maps north of Minh Lâu (way 1330598719) is not drawn: the imagery shows only trees there, with a
  hut of about 4 m some 9 m further north.
- Tân Nguyệt bridge: the ends were read off the imagery (the east end is 1.3 m south of the axis, so the line runs
  1.5° flatter); the bridge is 5 m wide, and the stair and Bửu Thành gate follow the same line.
- Still open: the Bái Đình width (40 m on the imagery vs 45 m documented, an owner question); the Minh Lâu
  parterres; the OSM lake shores; the rest of the La Thành.
