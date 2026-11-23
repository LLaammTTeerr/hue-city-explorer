# Chợ Tây Lộc (`tayloc`)

Replica: `src/landmarks/places/tayloc.js`. Before this, the market was drawn only as eleven ordinary mapped buildings
(flat lids, a few with tanks) with nothing to mark it as a market. No older builder drew it, so no `replaced()` guard
was needed: the replica's paved yard covers the block and `populate` drops the mapped footprints and infill under it.

## Sources
- Thừa Thiên Huế provincial portal, "Tay Loc market":
  https://thuathienhue.gov.vn/Visitor/Visitor-detail/tid/Tay-Loc-market/newsid/AF4A034D-6AB4-405F-9042-AED000A87F76/cid/26A92FFB-9424-4EE6-BE8D-A380F108582C
  (209 Nguyễn Trãi, Tây Lộc ward, inside the Citadel; once chợ Phú Xuân; a flea market).
- vietnamdrive.com, "Tay Loc Market in Hue City", https://vietnamdrive.com/en/tay-loc-market-in-hue-city (search
  snippet; the page refuses automated fetches): one-storey buildings on the open land between four roads.
- vinwonders.com, https://vinwonders.com/vi/wonderpedia/news/cho-tay-loc-hue-dia-diem-mua-sam-am-thuc-noi-tieng/ :
  open 6:00-22:00; food stalls; an open-air flea market before the market gate, goods laid out on tarpaulins.
- gpsmycity.com, https://gpsmycity.com/attractions/tay-loc-(tay-loc-market)-51384.html : single-storey, evenly spaced
  stalls.
- OpenStreetMap, via `public/data/hue.json`: the marketplace (way 372292672, its centre the place point) fills the
  block between the four streets; the eleven building footprints inside it and the lane from Nguyễn Trãi. Heights to
  the top are the city survey's as kept in hue.json (main hall 3.5 m, two-storey block 7.7 m, halls 3.0-4.5 m).
  (Overpass could not be reached from this session; the footprints come from the committed hue.json.)

## Confirmed
- Location and block: the whole block, about 145 x 117 m, its long east side on Nguyễn Trãi.
- Plan: the E-shaped main hall on the west half (back wing, two arms, corner blocks, back porch, a middle bar ending
  in a rounded hall), a two-storey block and a low hall in its courts, two small sheds, six long stall halls east of
  it either side of the lane from Nguyễn Trãi (all from the mapped footprints).
- One storey (except the one block); heights from the survey.
- A flea market on tarpaulins before the gate (older accounts; Street View now shows an open forecourt, see below).

## Estimated
- Roofs: low gables of corrugated sheet, ridge at the survey height; colours (red-brown on the main hall, zinc and
  blue on the stall halls). No photo or text found that gives roof form or colour.
- The rounded hall's low cone roof and vent lantern; corner gables a little higher (4.4 m to the apex) than the survey's 3.5 m.
- Wall render colour, stall bays (shutters / open stalls), sheet awnings.
- The gate's sizes: its form (yellow pillars, two-tier red tiled roof, name board between the tiers, a flag on top) is
  from Street View; its dimensions are read by eye.
- Umbrellas and tarpaulins; the yard paved in concrete 0.22 m above the street; warm light strips under the awnings
  after dark.

## Left to do
- The model's forecourt is about 8.5 m deep, the real one about 17 m: the mapped carriageway of Nguyễn Trãi (data/)
  lies over part of it. Moving the road is a city data change, not done here.
- No Wikimedia Commons photos or vi.wikipedia article for the market were found (the vi article is a 404).

## Satellite and Street View audit (2026-11)

Checked against satellite tiles (z17–z20) and car panoramas on Nguyễn Trãi, Lê Đại Hành, Đạm Phương and the lane in
front of the market (visual reference only; nothing traced). The footprint and axis already agreed to about 1–2 m and
under 3°, so no position or orientation changed. What changed in the massing:

- Roof colours per hall now follow the satellite: rust reds on the street halls, browns and greys inward, rather than
  one red for every roof.
- (Revised in review, below: the gate stands; an earlier pass dropped it.)
- The two ends of the long west wing are cream gabled pavilions about 5 m high, each with an arched lunette, a
  concrete canopy and a brown lean-to (the Lê Đại Hành corner is the clearest photo).
- The back wing has continuous lean-tos instead of awnings: green and blue sheets on the Đạm Phương side, grey on the
  court side.
- The two-storey block has a proper gable roof.
- Five trees stand in pits in the courts and along the inner lane, where the satellite shows crowns. The courts between
  halls are filled with low, tilted tarps, as the satellite shows.

### Review fixes (2026-11)

- The gate is back, in its photographed form: in the gap between the two front halls, two yellow pillars and a lintel
  under a red tiled roof, a smaller roof above with the name board between the tiers, a flag on top, rising above the
  hall eaves (sv-gate-lane-west). The board on the hall face is gone.
- The two front halls carry a continuous band of shop sign boards at the eave and blue and purple tarps slung below it;
  a billboard on posts stands on the south hall's street slope. The south front hall reads about 3.8 m to the ridge
  (eave 3.1) on Street View, above the survey's 3.0; the photo is followed.
- The forecourt is open paving with rows of motorbikes and two parked cars, and a grass planting strip at the kerb with
  a row of small street trees. The flea-market mats and umbrellas are gone.
- The arm along Lê Đại Hành is roofed in dark maroon sheet, not rust.
- The north-west corner is a narrow pale cream gable bay (about 6 m wide, eave 3.4, apex 4.4) beside a plain block: a
  wide, low segmental lunette glazed between mullions, a grey concrete canopy and a short sheet lean-to with a blue edge.
  The bay's face is pulled back to the satellite's roof line, and the lean-to shortened.
- The south-west corner on Đạm Phương (pano at the Thân Trọng Một corner, looking north) has breeze-block grilles over
  its stall openings, green stall lean-tos and canopies, and trees along the kerb.
- The pano once filed as "sv-damphuong-east" stands about 130 m west of the market, on another lane, and shows no part
  of it: nothing in the model rests on it. The pano filed as "sv-tvtrong-north" stands on Đạm Phương at the Thân Trọng
  Một corner, looking north along the west wing.
- The yard is laid in small tiles, with an apron of paving round each tree left out of the paved courts, so the edge
  and kerb trees plant (they used to be dropped).
