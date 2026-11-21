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
- Pavement terrazzo (red and grey squares, 2 m from the kerb): the usual Huế pavement tile, not sourced for these
  streets specifically.
- Share of bars per street (Võ Thị Sáu 60 %, Phạm Ngũ Lão 65 %, Chu Văn An 45 %); bulb strings every 16 m between
  kerbside poles at about 6 m.
- Reach: 165 m from the place's centre (the hue.json record has no radius).

## What the model draws
- On every generic infill house and mapped-building edge facing one of the three streets (53 fronts): an open
  ground floor (warm glow at night), a sign board with a lettering band (lit at night on bars), blade signs on
  houses of 7.2 m and more, and a striped awning where city.js gave none (the same `rand` dice as city.js, so no
  double awnings and no clash with its balconies).
- Bars: pavement tables with plastic stools, silk lanterns and a bulb line along the awning.
- Street: terrazzo pavements, the 3 m paved lane, poles with coloured bulb strings across the carriageway.
- All of it is in `S.noCover`, so the city's houses and trees are not pushed off. About 24k triangles.

## Left
- The generic infill here is sparse Indochine-era villas set well back; the real quarter is continuous shophouses.
  Per the brief the houses were not rebuilt, so the frontage is thinner than the real street.
- Named venues (Tà Vẹt and others) are not placed one by one: the repo extract has no POI nodes here and Overpass
  could not be reached from this sandbox.
