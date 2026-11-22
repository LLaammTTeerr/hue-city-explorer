# Cửa Hậu (Chánh Bắc Môn), north gate of the Kinh thành

Model: `src/landmarks/places/gate-cua-hau.js`. The gates loop in `src/landmarks/citadel.js` skips it through its generic `replaced('gate:' + name)` guard.

## Sources
- Wikimedia Commons, [File:Cửa_Chánh_Bắc.jpg](https://commons.wikimedia.org/wiki/File:C%E1%BB%ADa_Ch%C3%A1nh_B%E1%BA%AFc.jpg): photo from the bridge, 2008. Most of the form comes from this photo.
- [suckhoedoisong.vn, Điều ít biết về loạt 13 cửa ra vào di tích Kinh thành Huế](https://suckhoedoisong.vn/dieu-it-biet-ve-loat-13-cua-ra-vao-di-tich-kinh-thanh-hue-169240310204253508.htm): arch 1809 (Gia Long), vọng lâu 1831 (Minh Mạng), and the 10 main gates' common height of 4 trượng 1 thước, about 17.4 m.
- [vi.wikipedia, Kinh thành Huế](https://vi.wikipedia.org/wiki/Kinh_th%C3%A0nh_Hu%E1%BA%BF): Cửa Chính Bắc, also called cửa Hậu, at the back of the Citadel.
- Press summaries (via search): walled up after 1885 for the French Mang Cá post; reopened 21 May 2004; Đinh Tiên Hoàng extended through it to Cầu Kho in 2012.
- OpenStreetMap (local extract `data/raw/hue-osm.json`):
  - way 367959063: the gate outline, about 18.1 × 12.2 m;
  - way 367959074: Đinh Tiên Hoàng through the passage, which sets the passage bearing;
  - ways 367959076 and 1431136602: Cầu Cửa Hậu, a beam bridge about 5.2 m wide and 63 m long.

## Confirmed
- Plan and position from OSM: the block is the outline, 18.1 × 12.2 m, centred on it; Google satellite shows the balustraded terrace about 17.5 × 11-12 m. The inner face stands at the back of the notch OSM maps in the wall band for the inner approach (6.05 m in from the centre), between the brick piers.
- The `hue.json` wall band is 14.4 m thick at the gate and reaches 2.2 m past the outline on the moat side, while the car pano shows the arch, pilasters and damp foot of the outer face at the moat side, proud of the rampart. So the arch casing runs through the whole band as a front apron 6.45 m high (to the cornice band under the tablet); the tablet, the upper face, the terrace and the tower stand on the outline.
- One arched passage. A raised central bay with pilasters, a framed name tablet with three characters, a cornice band and a low balustrade with posts round the flat top.
- A two-storey masonry tower:
  - lower storey: on the outer face an arch between two round oculi (car pano); on the inner face pale patchy stucco with two large blind round medallions and no opening (inner pano);
  - upper storey: one arch;
  - each storey under a short, nearly straight terracotta tile skirt with small corner finials, ridge ornaments on top. The edge reads dark in Street View today (yellow in the 2008 photo); the model follows today.
- The inner face of the block is plain weathered masonry with relaid patches; the raised bay, pilasters and tablet are on the outer face only.
- Today's look: near-black weathered masonry and a red-brick passage lining.

## Estimates
- Block height 8.4 m to the frieze and about 9.6 m to the balustrade posts. In the photo the block stands about 1.3 times the rampart's height.
- Arch 4.0 × 4.8 m.
- Tower:
  - lower storey 8.6 × 6.2 × 3.7 m;
  - upper storey 4.0 × 3.0 × 2.7 m over a 0.9 m band;
  - both tile skirts 0.8 m high and 0.45 m past the walls;
  - top of the ornaments about 17.8 m above ground. The car pano gives about 17.6 m; the sources give 17.4 m (this gate) and 16 m (Quảng Đức and Thượng Tứ in `heights-reference.json`), so no reference height is recorded for it yet.
- Colours are sampled by eye from the photo. The photo is from 2008; no later restoration of this gate was found.

## Google check (November 2026)
- Satellite: Google's road line (DT8B over Cầu Cửa Hậu and through the gate) runs at bearing 322.8° and passes within 0.5 m of the model's centre; the model's passage is at 323.1°. Plan and axis kept. The gate's roof on the satellite leans several metres north-east of its base (relief displacement), so it is not used for position.
- Street View car pano on the bridge (about 70 m out): the block's width, arch and lower storey match the model. Google's `fov` for these captures is the vertical field of view, so the matched renders use a horizontal 105°.
- From that pano the tower was re-proportioned: lower storey 0.3 m taller, short tile skirts instead of broad flared eaves, upper storey about 0.9 m taller, round side openings on the lower storey instead of small arches.
- User photospheres (inner face, Đinh Tiên Hoàng) were used for appearance only: weathered grey stucco on the tower, round medallions on the lower storey, terracotta skirts with corner finials, a crest on top.

## Not changed
- The Kinh thành rampart, its slot and the moat (place `kinhthanh`).
- Cầu Cửa Hậu, still drawn by the shared bridge code (`hue.json` `bridges`) as a plain deck with low solid parapets. In the photo it has white solid parapets with sunk panels, close enough at model scale.
- Neighbouring gates and Mang Cá.

## Left
- The French-era pillbox beside the gate's outer face (in the photo) is not modelled.
- Kinh thành rampart beside the gate (place `kinhthanh`): about 0.85 of the block height in the model against about 0.6 in the car pano, dark where Street View shows red brick on the inner face, and 2.2 m deeper on the moat side than the gate outline.
- Cầu Cửa Hậu (shared bridge code): about 16 m wide and humped in the model, 5-6 m and flat in reality.
- The red-brick piers flanking the inner approach are only the rampart band, in its dark brick.
- Real tablet characters and dimensions from a survey drawing (Trung tâm Bảo tồn Di tích Cố đô Huế) were not found.

## Polish
- Tower stucco lightened and patched; pale post balustrade added on the band between the storeys (pano).

## Review fixes (November 2026)
- Block depth back to the OSM outline (12.2 m) above a front apron; terrace and tower moved 1.45 m inward onto the outline's centre.
- Inner face: plain masonry; the tower's inner lower storey has pale blind medallions on light stucco, no arch or oculi.
- Skirts: no flare and no upturned horns; dark edge; small finials on the eave corners.
