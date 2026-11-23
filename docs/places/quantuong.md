# Quan Tượng Đài: the Nguyễn observatory

Model: `src/landmarks/places/quantuong.js` (id `quantuong`). No older builder drew this place, so no guard was added.

## Sources
- https://vi.wikipedia.org/wiki/Quan_Tượng_Đài: built March 1827 (Minh Mạng 8) on the thượng thành at the Citadel's south-west corner, in the Nam Minh bastion. Platform 5.9 m high, all faces in gạch vồ. Octagonal timber Bát Phong pavilion, open all round. Flagpoles outside it; the flag was made square in 1844. The pavilion collapsed after the 1960s; restoration ran Oct 2012 to Sep 2013.
- https://vov.vn/media/anh/phuc-dung-quan-tuong-dai-280976.vov (photo report of the restoration):
  - The stair is about 8.2 m wide and built solid, with đá gan gà treads and brick-paved sloping edges. The approach is from inside the Citadel.
  - The pavilion has 12 columns and two roof tiers (8 slopes below, 4 above) in glazed âm dương tiles, with decorative brick on the railing tops.
  - A stone plaque "Quan Tượng Đài" is on the south-west face, facing out of the Citadel. War-time bunkers still stand on the site.
- https://hanoimoi.vn/quan-tuong-dai-dai-thien-van-co-trieu-nguyen-529313.html: the platform is nearly 6 m high. The deck is brick-paved, with the pavilion in the middle and a railing round it. The roof tiles are green glazed.
- https://vatlythienvan.com/... (article id 3843, "Quan Tượng Đài - Đài thiên văn cổ nhất Việt Nam"):
  - Seen from Bạch Hổ bridge, it reads as a truncated pyramid. The ramp from the Thành Nội side is long and over 8 m wide.
  - It has 51 steps of 75-80 cm, with a centre of mortarless đá gan gà and brick to each side.
  - A railing once ran round the platform, with posts at the four corners. The roof is in ngói thanh lưu ly, and a lightning rod is fitted.
- https://vietnamnet.vn/en/vietnams-only-ancient-observatory-excavated-E22682.html: the 2012 excavation found the octagonal Bát Phong foundation largely intact. The stairs are of stone carved with Chinese script.
- https://news.huengaynay.vn/culture/listening-to-the-raindrops-from-quan-tuong-dai-109230.html: an automatic rain gauge has been on the site since 2020.
- OSM:
  - node 11212153237 (Quan Tượng Đài) is at the corner bastion over Bạch Hổ bridge.
  - footway 39414010 runs 49 m from the corner of Ông Ích Khiêm / Tôn Thất Thiệp into the bastion; it is taken as the ramp, which sets its axis and head.
  - node 13673950594 is an abandoned bunker at the bastion's tip.

## Confirmed and modelled
- A solid brick platform with battered faces (a truncated pyramid), a stone cornice, a brick-paved deck and a low railing. The railing has corner posts (bổ trụ) and is open at the ramp head.
- The ramp from inside the Citadel: 51 steps of 0.75 m (38.3 m run), 8.2 m wide, a 6.4 m đá gan gà centre and brick-paved slopes either side with a kerb.
- Bát Phong pavilion: octagonal, open, 12 columns (8 outer and 4 inner), grey (as Street View shows them) on stone bases. Two roof tiers: an eight-slope skirt, then a four-slope hip over a chồng diêm band. Green glazed tiles (weathered grey-green), pale ridges with upturned horns, and a lightning rod.
- The stone plaque on the outward face, and the war-time bunker on the bastion's tip.
- The deck, ramp and landing are marked `S.paved`, so houses and trees keep off.

## Estimates
- Position and axis, from the Google satellite (Nov 2026 alignment pass): platform centre x -1931.7, z 740.8 (scene metres; the
  deck's apparent position corrected for the lean of its 6 m faces in the oblique image), ramp foot at the kerb of
  Tôn Thất Thiệp near x -1917, z 698. The ramp climbs on a bearing of 199° (it runs NNE from the platform); the OSM
  footway averaged with the bastion's bisector gave the same axis to within 1°. The OSM node and footway end had put
  the platform about 10 m too far south. The model sits 1.1 m further up the axis than that reading, so the first
  steps stop at the mapped street's kerb.
- Deck 14.5 m along the ramp by 16.5 m across (satellite: not square), faces leaning to 0.88 of the foot.
- Deck height 9.5 m over the street the ramp starts from, matched in two Google Street View car panoramas (Tôn Thất
  Thiệp, Ông Ích Khiêm). The sourced 5.9 m is read as the platform over the bastion's terreplein. Risers are about
  19 cm.
- Ramp: 51 treads of 0.75 m (38.3 m run, matching the satellite), a 6.4 m centre of steps with narrow brick-paved
  sloping bands and pale copings either side, an iron pipe railing along the steps' edges, and a black iron fence
  closing the foot at the street (all seen in Street View).
- Pavilion: eaves about 6.2 m across, nearly as tall as wide (Street View against the 8.2 m ramp). Outer columns on a
  2.2 m radius, columns 2.1 m (outer) and 3.4 m (inner).
- Colours from Street View: dark, mossy grey brick and treads, pale ochre copings, a weathered grey-green glaze, and
  grey columns.

## Not modelled / left
- The rampart, the walk and the bastion's parapet belong to `kinhthanh` and are unchanged. The platform stands at the inner corner of its walk.
- Flagpole: it is historical, and no source says one stands today. The 2020 rain gauge mast and cameras are too small to model.
- No night lights (no source for floodlighting).

## Review fixes (Street View, car panos)

- The ramp's foot: a flat paved forecourt before the first step, closed by a tall ornate iron fence (about 1.8 m,
  spear-tipped pickets, a lattice band, heavier posts) with stone piers and lamp posts at its front corners, wider on
  the side away from Ông Ích Khiêm. Its depth in front of the steps is held to 1.2 m by the mapped kerb of Tôn Thất
  Thiệp (more puts paving in the carriageway, check:overlap); the steps themselves stay where the satellite puts them.
- The pavilion's roofs, from a 20° close-up of the Tôn Thất Thiệp pano: the upper tier is a steep four-sloped pyramid
  about half the lower tier's width, meeting at a gourd finial, with straight eaves and small corner scrolls; the
  lower octagonal skirt is nearly straight. The long upturned horns were dropped.
