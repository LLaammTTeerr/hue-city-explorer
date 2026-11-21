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
- Plan and position from OSM. The block reaches from the rampart's inner face to 1 m proud of its outer face. The `hue.json` wall band is 14.4 m thick at the gate.
- One arched passage. A raised central bay with pilasters, a framed name tablet with three characters, a cornice band and a low balustrade with posts round the flat top.
- A two-storey masonry tower:
  - lower storey: three arches on the long faces, the middle one larger;
  - upper storey: one arch;
  - each storey under a terracotta tile skirt with a yellow eave band, with ridge ornaments on top.
- Today's look: near-black weathered masonry and a red-brick passage lining.

## Estimates
- Block height 8.4 m to the frieze and about 9.6 m to the balustrade posts. In the photo the block stands about 1.3 times the rampart's height.
- Arch 4.0 × 4.8 m.
- Tower:
  - lower storey 8.6 × 6.2 × 3.4 m;
  - upper storey 4.0 × 3.0 × 1.85 m;
  - top of the ornaments about 17 m above ground, near the sourced 17.4 m.
- Colours are sampled by eye from the photo. The photo is from 2008; no later restoration of this gate was found.

## Not changed
- The Kinh thành rampart, its slot and the moat (place `kinhthanh`).
- Cầu Cửa Hậu, still drawn by the shared bridge code (`hue.json` `bridges`) as a plain deck with low solid parapets. In the photo it has white solid parapets with sunk panels, close enough at model scale.
- Neighbouring gates and Mang Cá.

## Left
- The French-era pillbox beside the gate's outer face (in the photo) is not modelled.
- Real tablet characters and dimensions from a survey drawing (Trung tâm Bảo tồn Di tích Cố đô Huế) were not found.
