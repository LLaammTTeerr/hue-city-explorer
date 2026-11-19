# Progress

## Done
- OSM extract fetched and processed into `public/data/hue.json` (scripts/).
- 3D scene: land cut around real water, roads, rail, 5,159 OSM buildings, illustrated infill and trees.
- Hand-modelled landmarks on OSM footprints: cầu Trường Tiền, Citadel wall and gates, Kỳ Đài, Ngọ Môn,
  Điện Thái Hòa, Phu Văn Lâu, chợ Đông Ba hall and bell tower, dragon boats.
- Atmosphere: afternoon / shower / lights-on moods, planar water reflection (desktop), rain.
- Interaction: map controls, boat ride under the bridge, place list and cards, labels toggle, compass home.
- UI in Vietnamese and English; phone layout.
- Checked in the browser: opening view, ride start to finish and early exit, rain, night, recovery from
  an edge-of-map street-level camera, labels off, OSM-only toggle, phone viewport, production build.

## Not verified
- Real touch gestures on a physical phone (layout and logic checked in a 375×812 viewport only).
- Frame rate on low-end phones (adaptive resolution is in place but untested on hardware).

## Next (ideas)
- Núi Ngự Bình and chùa Thiên Mụ lie outside the bundled extract; widening the bbox would bring them in.
