# Phố Tây (photay)

Huế's backpacker quarter in phường Phú Hội (now Thuận Hóa), on the south bank east of cầu Trường Tiền: the streets
Võ Thị Sáu, Phạm Ngũ Lão and Chu Văn An. Model: `src/landmarks/places/photay.js`. No older builder drew the place
(it was only a label and a pedestrian hub in `life.js`), so no `replaced()` guard was needed.

## Sources
- VinWonders, "Phố Tây Huế – điểm ăn chơi về đêm": https://vinwonders.com/vi/wonderpedia/news/pho-tay-hue-diem-an-choi-ve-dem/
  (the three streets; opened 29/09/2017; Fri–Sat 18:00–02:00, Sun 18:00–24:00, motor traffic banned; bars, pubs,
  restaurants, souvenir shops; venues such as Tà Vẹt at 11 Võ Thị Sáu with close-set low tables, 2Ahjussi at
  18 Phạm Ngũ Lão, Gecko Cafe at 9 Phạm Ngũ Lão)
- VietnamPlus, "Huế tìm giải pháp lập lại trật tự đô thị tại khu phố Tây":
  https://www.vietnamplus.vn/hue-tim-giai-phap-lap-lai-trat-tu-do-thi-tai-khu-pho-tay-post1142253.vnp
  (Fri–Sun 18:00–02:00; businesses spill onto the pavements and roadway; a covered-pavement roof project is only proposed)
- Tuổi Trẻ, 26/03/2023: https://tuoitre.vn/hue-co-them-pho-di-bo-ve-dem-thu-ba-20230326210309346.htm (lists the
  Chu Văn An – Võ Thị Sáu – Phạm Ngũ Lão route as one of Huế's night walking streets)
- OpenStreetMap (repo extract `data/raw/hue-osm.json`, 2026-11-19): ways 39416766 Võ Thị Sáu (residential,
  sidewalk=both, surface=asphalt), 39419092 Phạm Ngũ Lão, 39413149 Chu Văn An (asphalt), 39419045 Chu Văn An branch
  (service, paving_stones, width 3 m).

## Confirmed
- Street layout and centrelines (OSM, hard-coded in model metres). The carriageways are asphalt, not paved.
- Character: bars, pubs, eateries and shops on every front, seating spilling onto pavement and road, street
  performers; the streets close to traffic on weekend nights.

## Estimated
- Sign colours, awning stripes, plastic-stool colours (red / blue / yellow), lantern and bulb colours: typical of
  Vietnamese street bars, not sourced front by front.
- Share of bars per street (Võ Thị Sáu 60 %, Phạm Ngũ Lão 65 %, Chu Văn An 45 %); lantern strings every 16 m between
  the kerbside lamp posts (Street View shows lantern strings on Chu Văn An, not their spacing).
- The new tube houses: widths 4-5.6 m, depths 6-14 m (as deep as the free ground allows), 2-5 storeys, colours and
  roofs drawn from the dice, not house by house.
- Reach: 165 m from the place's centre (the hue.json record has no radius).

## Google check (2026-11, scratch/rebuild/photay)
- Satellite z18/z19 against matched top renders: the three OSM centrelines, Lê Lợi and Nguyễn Thái Học lie on the
  imagery within about 1.5 m, axes within 1-2°. No data change needed.
- Street View (car panos on Võ Thị Sáu, both ends of Chu Văn An, the paved lane; user photospheres on Phạm Ngũ Lão and
  Chu Văn An): every street is built up wall to wall with tube houses of two to six storeys right at the back of the
  pavement, with a few taller hotels behind (Jasmine Hotel, Asia Hotel). Pavements are grey stone slabs; the kerb has
  grey lamp posts with flat dome heads; Chu Văn An has strings of white paper lanterns across the street.
- The user photosphere filed as "vts-s" (GPS on Võ Thị Sáu) shows the north end of Chu Văn An by Lê Lợi, the same
  scene as the car pano there; its recorded position is about 80 m off.

## What the model draws
- Blocks wall to wall: along Phạm Ngũ Lão, Võ Thị Sáu and Chu Văn An, tube houses fill every gap between the city's
  houses, a house on each corner of every road meeting them fronts both streets, and the side-road mouths and the
  Phạm Ngũ Lão south end are closed up to the kerb.
- Each street keeps its own dressing (`STYLE`): house types, wall colours, sign palettes, awning canvas and stripe,
  pavement tone, and where bars put out lanterns and stools, so the three streets read apart.
- Landmarks taken from the Street View audit (2024 captures, visual reference only):
  - Võ Thị Sáu north: the cream two-storey colonial corner with arched windows and a balustrade (replacing the mapped
    block on that corner), and the dark timber-and-steel bar with planters across the road.
  - Chu Văn An north-west: the salmon six-storey balconied hotel with the Burger Ngon fascia, blade sign and
    umbrellas in its ground floor; opposite, the red-brown timber café under creeper, the gated villa behind a white
    fence, a white café box and a tree in the street.
  - Chu Văn An south-east: the black-glass front with grey panels, the single-storey tiled corner shop with a green
    sign before a white block, and the Jasmine tower (30.6 m) with its roof sign closing the view.
  - Phạm Ngũ Lão north-east: the pink two-storey balconied corner, and the orange restaurant under a cream four-storey
    house; no grass verges.
  - The lane: the hotel under a creeper and the yellow colonial house on the east, a grey picket fence on granite
    pillars, an iron gate and a white villa in its garden on the west, leaning trees whose crowns meet overhead, the
    cream arched hotel (13.6 m) closing the end, and light concrete slabs a metre square with dark joints, laid 0.3 m
    up so the city's road overlay (drawn with a polygon offset) does not cover them at a grazing angle.
- Street: slab pavements in each street's stone, lamp posts set on the pavement clear of road mouths, paper lantern
  strings on Chu Văn An.
- Mapped buildings are matched by a point inside their ring (the runtime building order differs from `hue.json`).
  The dressing is in `S.noCover`, so the city's houses and trees are not pushed off.

## Left
- Named venues are placed only where the Street View audit shows them; the repo extract has no POI nodes here.
- Interiors, signage lettering and exact shop widths are not modelled.
