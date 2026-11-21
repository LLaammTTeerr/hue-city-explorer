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
- Pavilion: 0.6 m plinth, ground storey 3.7 m to the eave, balcony deck at 4.55 m, upper storey 3.25 m, upper roof 2.75 m. Total 16.0 m above the street; the reference is 15 m (estimated) and the check passes.
- Five arcade bays per side. The arches are drawn as stepped haunches.
- Access: two stair flights against the inner face, climbing toward the middle. I found no source for the stairs' position or form.
- Balustrade module and colours: taken from the photos.

## What changed
- The bastion is now a filled, paved platform. Before, only the outline wall stood there and the pavilion sat on a small generic box. It has a balustrade on the wall cap, inner stairs, turtle beds and frangipani.
- The pavilion is now a colonial-Asian two-storey block: arcaded verandah, skirt roof, balconied upper floor with doors and windows, and a flared yellow hipped roof with the sun-and-dragons ridge.

## Left to do
- Exact stair positions, and the true height of the platform relative to the wall.
- The real hip-and-gable shape of the upper roof (drawn as a plain hip roof) and true arch proportions.
- No night lighting.
