# Bảo tàng Hồ Chí Minh (Hồ Chí Minh Museum), 7 Lê Lợi

Model: `src/landmarks/places/baotanghcm.js`. It covers the museum building, the paved forecourt and drive, the front garden, the railing and gate on Lê Lợi, the gatehouse and sign wall, and the boundary wall on Điện Biên Phủ.

## Sources
- OSM way 240266284 (tourism=museum, building:levels=2, addr 7 Lê Lợi). Drive ways 1473477097 and 1473477098, boundary service road 39417236, read from `data/raw/hue-osm.json`.
- https://bthcm.hue.gov.vn (Giới thiệu chung): when it was rebuilt and opened.
- https://baotanghochiminh.vn: founded 16 Sep 1980.
- https://www.ivivu.com/blog/2022/10/theo-dau-chan-bac-o-bao-tang-ho-chi-minh-thua-thien-hue/: three storeys, 2,500 m²; also the aerial photo.
- https://vinwonders.com (photo `bao-tang-ho-chi-minh-hue-02.jpg`): the front view; exhibition area about 600 m².
- https://khamphahue.com.vn: founding date and exhibition area.

## Confirmed
- Footprint from OSM: about 31.4 m along the street by 32.5 m deep, with the front parallel to Lê Lợi. In the satellite this outline is the roof's eave line; the walls stand about 2 m inside it under the deep eave.
- Satellite (2026, visual reference only): the roof's centre lies about 6.6 m north and 1.6 m west of the OSM centre, which is what the building's lean in the image gives for a 14 m eave (the lantern is shifted further, the walls show on the south-west side). The model keeps the OSM centre. The sides run on bearings of about 49° and 139°, as in OSM.
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

- Street views (Lê Lợi, Trần Thúc Nhẫn, Điện Biên Phủ; 2026, visual reference only):
  - The first floor is white, not pink: a white band carrying a projecting strip of dark lattice windows, then a solid white parapet in front of the top floor. Pink shows only on the loggia's back wall.
  - The corner blocks are about 4 m square and stop at the parapet. The south block is glazed full height on both faces; the north-east faces of the east and north blocks are plain grey-green.
  - Steps on the sides as well as the front.
  - Grounds: the forecourt and drive paved in pale stone; the main gate at the west end of the Lê Lợi front beside a stone sign wall and a white flat-roofed gatehouse; tall Norfolk pines on the north-east side; a rubble-stone wall with a yellowish coping and an iron railing along Điện Biên Phủ, with dense trees behind it.

## Estimates
- Heights above the ground, scaled from the street views against the mapped front:
  - Plinth: 1.0 m. Ground floor up to 4.4 m. Lattice strip from 6.3 to 8.6 m. Parapet up to 11.4 m (top floor at about 10 m).
  - Loggia up to its soffit at 13.6 m. Eave at 14.0 m. Main roof 4.8 m high with a 2.05 m overhang, so the ridge is at 18.8 m.
  - Lantern: 11 m square, with its top at about 21.6 m.
- The corner blocks are 4 m square. The column spacing, step count and fret pattern are simplified.
- Positions of the fountain, palms, kiosk, Norfolk pines, gate, sign wall and gatehouse come from the satellite and street views. The flagpoles and the blue outbuilding come from the older photos; the outbuilding is not mapped in OSM and does not show in the 2026 satellite.
- The Điện Biên Phủ wall stands 7.5 m off the street's centre line, behind a wide pavement.
- Wall colours were matched by eye to the photos.

## What changed
- Nov 2026 rebuild: walls set 2 m inside the mapped outline under a 2.05 m eave; white first floor and parapet; 4 m corner blocks, glazed as seen; steps on all faces; plain hip roof with white hip ridges and a lantern without horns. Grounds: pale-stone forecourt in place of the asphalt drive, the gate moved to the west end of the Lê Lợi front with the sign wall and gatehouse, the kiosk moved to the west corner, Norfolk pines, the Điện Biên Phủ wall and trees, and no generated houses inside the grounds.
- First version: new replica of the building and grounds. The mapped OSM building is now covered by the model and drops out in `populate`.
- The drive and forecourt are marked as paved.
- Night lighting: glowing glazing and lamps along the drive and at the gate piers.
- No older builder drew this place, so no `replaced()` guard was needed.

## What is left
- The rear and the north-west face copy the front's pattern, without its door or relief. No view shows them, so their glazing on the west and north corner blocks is unconfirmed.
- The north end of the lot toward the river is left as open ground. The trees and outbuildings there are not modelled.
- The relief panel and lettering are blocks of colour, not textures.
