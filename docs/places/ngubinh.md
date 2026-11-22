# Núi Ngự Bình (`ngubinh`)

The "royal screen": the flat-topped hill about 4 km south of the Citadel, on its axis. Model:
`src/landmarks/places/ngubinh.js`. Place record: summit (774.2, 2997.7) m.

## Sources
- vi.wikipedia.org/wiki/Núi_Ngự_Bình: 103 m (some sources say 105 m). Trapezoidal, symmetrical from the front, with
  a flat top. Pines planted from Gia Long's reign. Two flanking hills, Tả Bật and Hữu Bật, with no positions given.
- en.wikipedia.org/wiki/Mount_Ngự_Bình: 105 m, symmetrical, flat top with pines.
- OpenStreetMap, from the local extracts in `data/raw/` (Overpass was unreachable):
  - natural=peak, ele 103, at 16.4418 N 107.59613 E (`data/control-points.json`), about 3 m from the place point.
  - Pine wood: way 588726451 (natural=wood, leaf_type=needleleaved).
  - Footpath up: way 631812146. It climbs the west ridge, crosses the top and goes down the north face.
  - Graveyards round the foot: ways 1180918090, 1180918092, 1181145133 and 1180918087.
  - Approach street: Đặng Huy Trứ, way 1260449757.
- tuoitre.vn/giai-cuu-nui-ngu-binh-20210907091156847.htm (2021):
  - About 100,000 graves on 38.4 ha round the foot, on all four sides.
  - Pines replanted in 1976, then thinned by seven fires in ten years, leaving patchy cover and bare soil.
- tuoitre.vn, 1 Nov 2026: a 1.7 km firebreak road (34.5 billion VND) has been proposed but is not built. It is not
  modelled.
- Google satellite (2026-11 captures at zoom 17-20, reference only, kept out of the repo): closed pine canopy over
  the whole west-south-west crest; two open grassy glades with scattered young pines, one round the summit and down
  the south face (about 37 m west to 60 m east of the summit, 30 m north to 90 m south), one on the upper north-east
  slope (about 60-120 m north-east); the footpath visibly crossing the summit glade. The canopy hides the top's shape.
  Street View has no usable imagery of the hill.
- mia.vn travel guide: stone steps (bậc đá) on the climb, and a top flat enough to camp on. vinwonders guide: the hill
  is reached from Đặng Huy Trứ and the climb is easy.

## Confirmed
- Height: the terrain grid already gives about 104 m at the summit (a rise of 101 m on a floor of about 3 m), which
  matches the 103 m OSM peak. Global terrain is unchanged.
- The hill has a flat top, pine cover, a footpath over the top, and graves round the foot.

## Estimated
- **Flat top.** No source gives its size. The bare-earth DEM (FABDEM, `data/raw/dem/terrain.json`, ~30 m cells)
  shows ground over 85 m running about 220–240 m from just east of the summit to the west-south-west (about 13° south
  of west), 50–60 m across, its column maxima 91–97 m (within ~6 m). The model grid agrees (93–97 m out to 200 m
  west), and from the north the hill is symmetric about a line ~87 m west of the summit, which fits the sources'
  "symmetrical from the front". The local cap in the place file follows that crest:
  - a stadium 220 x 40 m from (+20, −15) to (−195, +35) relative to the summit, level across and easing down along its
    length to the grid's lower west end;
  - a rounded 30 m shoulder down to the grid.
  Until 2026-11 the cap was 130 x 40 m, covered only the east part of the crest and was turned about 23° too far
  south. The exact edge is an estimate.
- **Ground cover (from the satellite, 2026-11).** The flat top's west-south-west part is pine wood, its floor in the
  hill's own wood colour. The open ground is two glades, outlined by eye to about 5 m in `OPEN` in the place file:
  dry grass with a few worn patches, drawn as a skin 0.35 m over the terrain (or over the cap where that is
  higher). The glades' trees are the data's, as elsewhere on the hill (the imagery shows them sparser and younger).
  Until 2026-11 the model had a 26 m bare, trodden strip along the whole crest instead, which the imagery does not
  show. No summit structures are drawn because none are confirmed.
- **Path.** OSM's way ran 10-15 m east and south of the trodden line the satellite shows across the summit glade;
  that stretch (from about 26 m west to 22 m west and 103 m north of the summit) is re-framed onto the visible line.
  It is about 2.7 m wide, trodden earth on the gentle ridge and stone steps wherever it climbs steeply
  (slope above 0.2). There is no step count.
- **Pines on the cap.** The cap is marked `S.paved`, so `geo/city.js` keeps the data's trees off it. Otherwise they
  would stand sunk in the raised ground. The model redraws every data tree city.js clears there (its cover and
  branch-reach test mirrored in the place file) as a simple pine at the cap's height, using the foliage pine colours.
  The glades' skin off the cap is not paved, so their trees stand as planted.
- **Graves.** 1000 tombs are placed at random inside the OSM cemetery rings within 440 m. They are kept off trees,
  houses, buildings, roads and the path, and each faces up the slope with its headstone (bia) at the uphill end.
  About 18% are larger family tombs. Sizes and colours are estimated.

## Left
- Tả Bật and Hữu Bật are not drawn, because no source gives their positions.
- The plateau's exact edge, the step count and any summit features (viewing spots, shrines) are unconfirmed.
- The redrawn cap pines are boxes, not the instanced foliage cards, so they read slightly blockier close up.
- The proposed firebreak road is not built, so it is not modelled.
- About 38.7k triangles in total.
