# Chợ Bến Ngự (`benngu`)

Model: `src/landmarks/places/benngu.js`. Scope: the market hall, its sheds, the stall row, the yard and its edges. The An Cựu canal, cầu Bến Ngự and the 1836 wharf are out of scope.

## Sources
- Address and history: https://mia.vn/cam-nang-du-lich/cho-ben-ngu-hue-17867 (47 Phan Bội Châu, phường Vĩnh Ninh, at the Phan Đình Phùng corner, by cầu Bến Ngự; a temple and stele stood on the site before 1970).
- The wharf: https://vietnamnet.vn/en/ben-ngu-a-reminder-of-the-past-E75459.html (built 1836 under Minh Mạng; stone slabs found in 2008).
- Photos: Wikimedia Commons "File:Cầu Bến Ngự.jpg" (2023) and "File:Ben Ngu bridge.jpg" (2009).
- Footprint and heights: the local OSM extract (way 513649271) and the GISHue survey heights in hue.json (hall about 10 m, shed belt about 6 m).
- Roof plan: Esri World Imagery, zoom 18; Google satellite, zoom 20 (2026 review), which fixes the roof edges and axis.
- Street level: Google Street View car panoramas (2024) of the Phan Bội Châu front, the Phan Đình Phùng side and the south-east corner (visual reference only; captures kept out of the repo).

## Confirmed
- The hall roof is 35.8 x 30.8 m on the satellite (OSM's way reads 38.9 x 34 m), its axis at bearing 111 (21 degrees off east); the frame is fitted to the roof edges to within about 1 m.
- Three parallel grey sheet-steel gables, ridges east-south-east; the middle one is wider (about 11 m against 9.5-10 m) and its gable stands higher on the street front.
- The Phan Bội Châu front: three red-brown gable walls with pale yellow trim on the rakes, a pentagonal glazed clerestory with a grid of bars in each gable (the middle one largest), a projecting entrance porch with "CHỢ BẾN NGỰ" on a brown band under a red banner, and stall awnings with signboards either side.
- The north and south sides are cream, two storeys of stall bays with a band of white louvres above; beige awnings slope from the south wall to posts along Phan Đình Phùng.
- A translucent strip (about 3 m) separates the hall from the east stall shed, whose ridge runs along its length and which is hipped at the canal end; at its north end the shed turns west, and lower roofs (a light north-south gable, a flat block) fill the corner north-east of the hall.

## Estimated
- Heights from the matched street view: eaves 7.0 m (middle gable 7.4 m), ridges 8.8 m and 9.8 m (survey: about 10 m). Clerestory sizes, porch size (5 m wide, 5 m high), the bay rhythm (about 3.6 m).
- The north block's north edge is cut back to v -17.5 (the satellite shows roofs to about -23.6) to keep off the mapped lane.

## What changed
- Before: an ordinary extruded `data.bld` block (OSM 513649271). Now: a hand-built replica. `populate()` clears the block and any infill under the model, so no guard was needed.
- Night: the sign letters glow, and light strips run under the canopy and along the stall row (`lightMaterial`).
- The yard is paved and marked in `S.paved`.

## What is left
- The interior (stall rows inside the hall) is not modelled.
- The 10–12 m buildings north-west of the sheds are left to the city.
- The yard has no trees. The aerial shows large trees on the west yard, but none are mapped there.
- The flags on the porch, the shop signs' lettering and the goods spilling onto the front yard are not drawn.
