# Kỳ Đài (flag tower), `kydai`

Model: `src/landmarks/places/kydai.js`. The old block in `citadel()` (`src/landmarks/citadel.js`) is skipped with
`replaced('kydai')`; its `flag` is now null and `citadel.update` already allows that. The replica animates its own flag.

## Sources
- vi.wikipedia, "Kỳ đài (Huế)": https://vi.wikipedia.org/wiki/K%E1%BB%B3_%C4%91%C3%A0i_(Hu%E1%BA%BF)
- Đại Đoàn Kết, "Cột cờ xứ Huế": https://daidoanket.vn/cot-co-xu-hue-10040496.html
- SGGP: https://www.sggp.org.vn/co-to-quoc-tung-bay-tren-bieu-tuong-tieu-bieu-cua-di-san-hue-post756834.html
- Viet Nam News, the watch huts (2018): https://vietnamnews.vn/life-style/424211/watch-huts-on-hues-flag-tower-to-be-restored.html
- Viet Nam News, the LED lighting (2018): https://vietnamnews.vn/life-style/423003/hue-lights-up-historic-flag-tower.html
- VinWonders: https://vinwonders.com/vi/wonderpedia/news/ky-dai-hue/
- OpenStreetMap, from the local dump `data/raw/hue-osm.json`:
  - way 218427614 (Kỳ Đài): the bastion-shaped pentagon
  - way 531031593 (building, layer 1): a 35.3 × 17.8 m rectangle
  - way 617748885: steps
  - 16 `historic=cannon` nodes

## Confirmed
- **Tiers:** three stacked truncated rectangular pyramids, about 17.5 m in all. The bottom one is over 5.5 m, the middle about 6 m, the top over 6 m (Wikipedia, Đại Đoàn Kết).
- **Parapets:** 1 m high on each tier, with hollow patterned tiles. Floors are square bricks.
- **Arches:** a 4 m arch leads from tier 1 to tier 2, and a 2 m arch from tier 2 to tier 3. The way up is on the north face (SGGP).
- **Guard huts and cannons:** two guard huts and eight cannons stood on top in the past. The two huts were rebuilt in 2018 on their old foundations (Viet Nam News).
- **Pole:** reinforced concrete, built in 1948, 37 m tall. Ground to the tip is 54.5 m.
- **Flag:** 12 × 8 m in 1975. SGGP gives 12 × 9 m for today's flag; the model keeps the flag's 2:3 ratio at 12 × 8.
- **Lighting:** since 2018, more than 1,000 LEDs, lit every night in one colour or several.

## Estimates and interpretation
- **Which outline is which tier:** tier 1 is the Nam Chánh bastion, which `city.js` already draws at WALL_H (6.6 m). The OSM pentagon is tier 2, and the OSM rectangle is tier 3. This reading fits several things:
  - the cobbled ramps OSM maps at the bastion's inner corners;
  - the steps on the pentagon's north edge;
  - the cannons on the bastion top and on tier 2.
- **Heights in the model:** 6.6 + 5.8 + 6.2 = 18.6 m. Tiers 2 and 3 follow the published "about 6 m" and "over 6 m"; the street view from Lê Duẩn showed the old 5.4 and 5.7 m about 9% and 20% short. The bottom tier is the shared rampart (6.6 m against "over 5.5 m"), so the total runs about 1 m over the published 17.5 m. The tip of the pole is 55.6 m against 54.5 m (`docs/heights-reference.json`).
- **Batter:** each tier's walls lean in about 0.4 m.
- **Stairs:**
  - The lower flight sits in a slot 4 m wide and 8.6 m deep, at the OSM steps.
  - The upper flight is 2.4 m wide and 6.8 m deep, in the east half of tier 3's north face. Its position is a guess.
  - Each flight ends at an arched gate. The gate's form is a guess.
- **Guard huts:** 3.4 × 3.6 m, at the two ends of tier 3, 2.7 m in from the ends and 4.5 m in from the north-west edge (where the satellite shows them, not centred), with pale lime walls and a hipped roof of weathered grey tile (the satellite's colour). The size and form are guesses.
- **Colours:** dark weathered grey brick, a lighter grey parapet, and reddish-grey floor tiles, all judged by eye.
- **Pole:** tapered, on a two-step plinth.
- **Night lighting:** the LEDs are an outline strip on each tier's parapet, cycling through colours with a warm-white pause. Floodlights stand at the foot of the pole.

## Position
- The satellite view (Google, visual reference only; captures stay in `scratch/`) puts both upper tiers a little west of their OSM outlines. Tall parts lean north in the image, so the fit corrects each corner for its height (about 0.35 m north per metre, measured on the 37 m pole).
- After that correction, tier 2 sits about 3 m west and 1 m north of OSM way 218427614, and tier 3 about 4 m west and 1 m north of way 531031593. `kydai.js` moves the OSM rings by those offsets, with a comment; the bearing (about 53°) already matched. The pole stays at the centre of tier 3, which the satellite confirms.
- The rampart's hole is cut to the OSM pentagon, so the place file paves over that hole at rampart height before drawing tier 2 on its moved outline. Cannons move with the tier they stand on.
- The car street view on Lê Duẩn (true horizontal field about 107°) matches the pole and tier 3's edges to a few pixels.

## What changed
- The old model had three pentagon terraces scaled from the one OSM ring, with no stairs, parapet detail, huts or cannons. It is replaced by:
  - two tiers on their own OSM outlines, standing on the bastion;
  - parapets with a perforated band;
  - recessed stairs with arched gates;
  - the two guard huts;
  - 16 cannons on their OSM positions;
  - the 37 m pole with a 12 × 8 m flag;
  - colour-cycling LED outlines.

## Left to do
- Not confirmed:
  - the plan dimensions of each tier in published sources (only OSM gives them);
  - the exact positions of the stairs and gates;
  - the guard huts' form;
  - the cannon models.
- The rampart's 0.9 m parapet around the bastion hole (`city.js`) runs across the foot of the lower flight. The flight is extended 1.8 m out over it.
