# Bảo tàng Hồ Chí Minh (Hồ Chí Minh Museum), 7 Lê Lợi

Model: `src/landmarks/places/baotanghcm.js`. It covers the museum building, the forecourt, the drive, the front garden, and the railing on Lê Lợi.

## Sources
- OSM way 240266284 (tourism=museum, building:levels=2, addr 7 Lê Lợi). Drive ways 1473477097 and 1473477098, boundary service road 39417236, read from `data/raw/hue-osm.json`.
- https://bthcm.hue.gov.vn (Giới thiệu chung): when it was rebuilt and opened.
- https://baotanghochiminh.vn: founded 16 Sep 1980.
- https://www.ivivu.com/blog/2022/10/theo-dau-chan-bac-o-bao-tang-ho-chi-minh-thua-thien-hue/: three storeys, 2,500 m²; also the aerial photo.
- https://vinwonders.com (photo `bao-tang-ho-chi-minh-hue-02.jpg`): the front view; exhibition area about 600 m².
- https://khamphahue.com.vn: founding date and exhibition area.

## Confirmed
- Footprint from OSM: about 31.4 m along the street by 32.5 m deep, with the front parallel to Lê Lợi.
- Founded in 1980. The present building was started on 19 May 1998 and opened on 19 May 2000.
- It has 3 storeys (photos and ivivu); OSM's `levels=2` is wrong. Total floor area is 2,500 m².
- Seen in the photos:
  - Pale pink walls with white trim, standing on a stone plinth with a broad flight of steps.
  - Ground floor recessed behind slender white columns.
  - First floor: a band of windows behind dark fretwork, a lotus relief over the door, the name lettering, and a red banner.
  - Top floor: a loggia with thin columns.
  - Grey-green corner blocks with tall glazing.
  - A salmon-red hip roof with white ridges and fascia, topped by a square lantern under a small hip roof.
- Grounds: a paved forecourt with potted topiary, two flagpoles left of the steps, a round fountain on the axis, a row of palms, potted cycads, a hedge, a low railing on the street, a small red-roofed kiosk at the west corner, and a blue-roofed low outbuilding on the west side.

## Estimates
- Heights, scaled from the photos against the 31.4 m front:
  - Plinth: 1.0 m.
  - Storeys: 4.3, 4.0 and 3.9 m. The eave is 12.2 m above the floor.
  - Main roof: 5.6 m high, with a 1.8 m overhang.
  - Lantern: 11 m square, with its top about 20.6 m above the floor.
- Corner blocks are 6.8 m square. The column spacing, step count, and fret pattern are simplified.
- Positions of the fountain, palms, kiosk, outbuilding and flagpoles come from the photos. The outbuilding is not mapped in OSM.
- Wall colours were matched by eye to the photos.

## What changed
- New replica of the building and grounds. The mapped OSM building is now covered by the model and drops out in `populate`.
- The drive and forecourt are marked as paved.
- Night lighting: glowing glazing and lamps along the drive and at the gate piers.
- No older builder drew this place, so no `replaced()` guard was needed.

## What is left
- The rear and side facades copy the front's pattern, without its door or relief. I found no photos of the rear.
- The north end of the lot toward the river is left as open ground. The trees and outbuildings there are not modelled.
- The relief panel and lettering are blocks of colour, not textures.
