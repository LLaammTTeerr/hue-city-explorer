# Lầu Tứ Phương Vô Sự (`tuphuong`)

Model: `src/landmarks/places/tuphuong.js`. The older one-line model in `src/landmarks/civic.js` (`tuPhuong`) now skips itself via `replaced('tuphuong')`.

## Sources
- vi.wikipedia.org, "Lầu Tứ Phương Vô Sự": https://vi.wikipedia.org/wiki/L%E1%BA%A7u_T%E1%BB%A9_Ph%C6%B0%C6%A1ng_V%C3%B4_S%E1%BB%B1
- Khám phá Huế: https://khamphahue.com.vn/en-us/Tourism/Detail/tid/Tu-Phuong-Vo-Su-Pavillion.html/pid/16577/cid/485
- mia.vn: https://mia.vn/cam-nang-du-lich/lau-tu-phuong-vo-su-hue-17055
- nguoiquansat.vn: https://nguoiquansat.vn/can-lau-hiem-hoi-cua-hoang-cung-quay-ve-huong-bac-256781.html
- Wikimedia Commons photos taken after the restoration: `File:Tứ Phương Vô Sự lâu.jpg` and `File:Lầu Tứ Phương Vô Sự lâu.jpg`
- OpenStreetMap (cached in `data/raw/hue-osm.json`): pavilion, way 172802373; Imperial City wall round the bastion, way 531016856; node "Bac Khuyet Dai"

## Confirmed
- Built in 1923 under Khải Định for his 40th birthday. Badly damaged in 1968. Restored from Dec 2008 to Sep 2010 and inaugurated on 6 Oct 2010.
- Stands on Bắc Khuyết Đài, the bastion in the middle of the Imperial City's north wall, near Cửa Hòa Bình. The bastion is rectangular, 64.6 × 28.5 m, and the pavilion is at its centre.
- Two storeys of brick and cement on a 182 m² plan, about 14 × 13 m. OSM outline: 14.6 × 13.4 m.
- Ground floor has a verandah (hàng hiên); upper floor has a balcony all round.
- Each face of each storey has one door and two windows.
- Roof ornament: a sun disc in the middle with two dragons (hồi long) on the ridge, and dragons on the four corner ridges.
- Turtle-shaped flower beds east and west of the pavilion. Old frangipani (cây sứ) line the inner wall.
- From the photos: pale yellow walls, cream arcade, dark red-brown balcony rail, yellow-orange glazed tile roofs (a skirt roof over the verandah plus a hipped upper roof), and a balustrade on the wall top.

## Estimates
- Platform floor: level with the top of the Imperial City wall as `dainoi.js` draws it (3.75 m).
- Position: OSM way 172802373 draws the pavilion about 4.5 m inward of where the satellite and the Street View
  panoramas place it (the bastion's own outline, way 531016856, fits the imagery). The place file re-frames it to
  u −0.6, v 10.2 in the bastion's frame, between the satellite (u 0.9, v 9.5 at the lower eaves, leaning north) and
  the two car panoramas on Đặng Thái Thân (1.5–2.5 m further toward −u). Axis: the bastion's (bearing 54.5°).
- Heights above the platform, read off the car panoramas (Google Street View, Đặng Thái Thân; visual reference only):
  lower eave edge 3.5 m, balcony deck 5.3 m, upper eave edge 7.15 m, ridge about 10.3–10.65 m, ridge ornaments
  about 12 m. Lower eaves about 15 m across, the upper gallery's pillar line about 10 m, upper eaves about 12 m.
- Ground-floor arcade: six piers a face; a narrow round-arched bay at each end over an ochre relief panel, wide
  flat-headed bays with a white baluster rail, the middle bay open to the steps (from a visitor's photo sphere).
- Upper floor: a gallery of four light pillars a face (three bays) at the balcony's edge with a dark rail, round a
  recessed wall (from the panoramas).
- Broadleaf trees on the platform where the satellite shows crowns; turtle beds at u ±20.5, v 12.
- Access: two stair flights against the inner face, climbing toward the middle. I found no source for the stairs' position or form.

## What changed
- The bastion is now a filled, paved platform. Before, only the outline wall stood there and the pavilion sat on a small generic box. It has a balustrade on the wall cap, inner stairs, turtle beds and frangipani.
- The pavilion is now a colonial-Asian two-storey block: arcaded verandah, skirt roof, balconied upper floor with doors and windows, and a flared yellow hipped roof with the sun-and-dragons ridge.
- 2026-11 rebuild from the satellite and panorama audit: moved 4.8 m outward and 1.5 m west to where the imagery
  shows it; storeys re-proportioned to the measured eaves, deck and ridge; the upper floor drawn as an open pillared
  gallery; the arcade given its arched end bays; larger corner ornaments; trees added.

## Left to do
- Roof colour: the satellite reads tan-brown and Street View dark; photos and sources say yellow glazed tile. The
  model keeps yellow (owner question).
- The ref wall top stands about 0.5 m higher than the model's shared wall height (`OUTER` in hoangthanh.js).
- The café parasols and furniture on the platform are not drawn.
- Exact stair positions; the true hip-and-gable shape of the upper roof; the dragons' real silhouettes.
- No night lighting.
