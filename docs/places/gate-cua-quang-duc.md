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
- Total height: the model measures 16.6 m against the reference's 16–17 m (`npm run check`).
- Dates and history as listed above.

## Estimated (from photographs and the other Kinh thành gates)
- A single round arch, 4.2 m wide and 5.4 m to the crown (the shared CITADEL_PASSAGE). Open timber door leaves inside the outer mouth.
- The gate block stands 1.6 m above the wall walk. It is weathered lime-rendered brick, with a dark damp plinth band, corner pilasters and pilasters framing the arch bay. The arch has a light moulded surround and keystone. A two-step cornice runs under a crenellated parapet.
- The name plaque has a light frame and a dark panel, read right to left (廣德門). The characters are a small canvas texture, built in the browser only. Their colours are estimated.
- The vọng lâu (the shared `pavilion()` from citadel.js) is 12 × 7.6 m. Its lower storey is colonnaded and its small upper storey closed. Both roofs are yellow glazed tile with red lacquered timber. The tile colour comes from photographs, not a written source.

## Changed from the generic gate
- The facade is lighter, weathered render instead of plain brick, with pilasters, cornice, damp band, keystone and open doors.
- The plaque now carries readable characters.
- The roofs are the imperial glazed yellow. The vọng lâu is centred on the block between the two wall faces.
- The model's ground is marked paved, so trees and houses keep off it.

## Left as it is / not done
- The bridge over the moat is drawn by the shared bridge code, from data.bridges. It is not redrawn here.
- The wall, the moat, and the wall ramps and steps either side of the gate belong to kinhthanh.
- The five "thần công" cannons just inside the gate (OSM way 771244236) are outside this gate's scope.
- No night lighting: there was no source for how the gate is lit.
