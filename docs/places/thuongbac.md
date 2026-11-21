# Thương Bạc (`thuongbac`)

Model: `src/landmarks/places/thuongbac.js`. Before this, the place was only its OSM footprint, drawn by the city
builder as a generic tiled hall (the `OLD_HALL` / `TRUE_H` 6.5 m entry in `scripts/build-data.mjs`). The replica takes
that footprint out of `data.bld` at build time, so no guard line was needed in an older builder.

## Sources
- OSM way 239568223 (`building=yes`, `historic=building`, `name=Thương Bạc`), from `data/raw/hue-osm.json`: a near-square
  footprint of 16.2 m × 17.0 m in công viên Thương Bạc (OSM way 217766984), about 37 m back from the bank.
- https://www.huesmiletravel.com/thuong-bac-hall-hue-city: first built 1870 (Tự Đức), rebuilt 1921 (Khải Định) as an
  octagonal pavilion on a square base about 1.3 m high with railings; "Thương Bạc" in cement on the front and back; a court
  with two cement ponds and rockeries, four carved stone dragons; four main pillars with lotus tops and porcelain couplets.
- https://tatinta.com/diem-den/dinh-thuong-bac/7765: the same 1921 facts (octagonal lầu of cement and reinforced concrete,
  base 1.3 m, solid railings with "Thương Bạc" in relief, two ponds, four dragons, four lotus-topped gate pillars). It also
  mentions a small octagonal pavilion Bảo Đại built near the old site in 1936.

## Confirmed
- Octagonal plan, reinforced concrete (1921). Square base 1.3 m high with railings, the name in relief front and back.
- Court with two cement ponds and rockeries, four stone dragons; four gate pillars crowned with lotus buds, with couplets.

## Estimated
- The base is taken as the OSM outline (16.2 × 17.0 m). The octagon is 8.6 m across the flats at its 8 columns
  (3.4 m high), with a walled inner octagon 4.6 m across. Two-tier octagonal roof (chồng diêm) in weathered yellow glazed
  tiles; the finial stands about 8.2 m above the base top (the 6.5 m in `TRUE_H` was only an estimate, not in
  `docs/heights-reference.json`).
- Which side the court lies on: put on the river side (the envoys came by boat), 13 × 15 m. Pond, dragon and pillar
  positions and sizes are from the descriptions, not from a plan.
- Colours: yellow lime wash and cream trim, red columns, grey bluestone kerbs and steps. No colour photo was readable.
- Stairs: a 7-step flight up the middle of the river and street faces.

## Not done / open
- No photo or survey drawing was found; the storey count (one storey with a two-tier roof) and the roof colour need a
  photo check. The 1936 Bảo Đại pavilion is not modelled.
- The river embankment and the park's paths belong to others and were not touched.
