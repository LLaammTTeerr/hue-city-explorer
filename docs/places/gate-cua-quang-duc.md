# Cửa Quảng Đức (gate:Cửa Quảng Đức)

Model: `src/landmarks/places/gate-cua-quang-duc.js`. The older gates loop in `src/landmarks/citadel.js` skips this gate with a one-line `replaced(...)` guard.

## Sources
- nghiencuulichsu.com, "Công cuộc xây dựng Kinh thành Huế": https://nghiencuulichsu.com/2015/09/26/cong-cuoc-xay-dung-kinh-thanh-hue/
  - The ten main gates were all built in 1809, each "3 tầng, cao chừng 16m".
  - Quảng Đức's vọng lâu was added in 1829.
  - People call it "Cửa Sập": it fell in a flood and has since been rebuilt.
  - Hàm Nghi left the capital through it in 1885.
- docs/heights-reference.json, Cửa Quảng Đức entry: 16–17 m. Cites huetourism.gov.vn after Phan Thuận An: the tower rises "more than 9 m" above the wall top. Kept as it is.
- OpenStreetMap, read from data/raw/hue-osm.json:
  - gate building, way 173609941: 16.8 × 12.6 m;
  - the street's passage through the gate, way 173609940 (tunnel);
  - Cầu Quảng Đức, ways 39417336 and 1431132255: about 61 m long and 5.8 m wide, on the gate's axis.
- vi.wikipedia.org, Kinh thành Huế: wall 6.6 m high (already used as WALL_H).
- Also searched, with nothing usable on this gate: gpsmycity.com (its "three-arched entrance" contradicts the single OSM passage and photos, so it was ignored), Wikimedia Commons, and news on the 2024–2026 moat works from Quảng Đức to Nam Minh Đài.

## Confirmed
- Plan, centre and axis come from OSM. The rampart's faces on the axis come from data.wall: 6.3 m inside and 7.7 m outside the gate's centre.
- Total height: inside the reference's 16–17 m with its tolerance (`npm run check`); the ridge is about 17.2 m, the pole tip 18 m.
- Dates and history as listed above.

## Street-level and satellite check (November 2026)
Google satellite and four Street View car panoramas (north and south on the axis, west along Đ. Ông Ích Khiêm, the bridge) were compared with matched model renders. The captures stay out of the repo.
- Plan: the OSM gate building sits within about 1 m of the satellite image and its axis (about 150°/330°) within 2°, so it is used as it is.
- The present vọng lâu is masonry, not timber. Its lower storey is rendered brick, about 8.4 × 6.8 m. The outer face has a large arched opening between two small ones. The inner face has an arched niche between two round medallions. A skirt of brown tiles runs round its top. On it stands a small storey, about 4.6 × 4 m, pierced front to back by an arch, under a small brown-tiled hip roof with ridge ornaments and a short pole.
- Proportions, scaled from the 16.8 m block width in the panoramas:
  - the passage about 3.8 m wide and 5.4 m to the crown;
  - the block's flat roof 8.4 m up, behind a plain solid 1 m parapet with square corner posts (no crenellations);
  - the tower's ridge at about 17.2 m, inside the 16–17 m (±15 %) reference.
- Outer face: grey weathered render, the arch set in a raised rectangular frame, a small light plaque above it. Inner face: darker, with two projecting capped pilasters either side of the arch bay and no plaque.
- Not visible in the imagery, so kept from the earlier estimate: the open timber door leaves, and the plaque's characters and colours.

## Earlier estimate (replaced)
Before the imagery check, the vọng lâu was the shared timber `pavilion()`: 12 × 7.6 m, colonnaded, with yellow glazed roofs. The block had a crenellated parapet and plaques on both faces. That reading came from photographs of other Kinh thành gates and does not match this gate as it stands.

## Left as it is / not done
- The bridge over the moat is drawn by the shared bridge code, from data.bridges. It is not redrawn here.
- The wall, the moat, and the wall ramps and steps either side of the gate belong to kinhthanh.
- The five "thần công" cannons just inside the gate (OSM way 771244236) are outside this gate's scope.
- No night lighting: there was no source for how the gate is lit.
