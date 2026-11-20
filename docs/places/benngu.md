# Chợ Bến Ngự (`benngu`)

Model: `src/landmarks/places/benngu.js`. Scope: the market hall, its sheds, the stall row, the yard and its edges. The An Cựu canal, cầu Bến Ngự and the 1836 wharf are out of scope.

## Sources
- Address and history: https://mia.vn/cam-nang-du-lich/cho-ben-ngu-hue-17867 (47 Phan Bội Châu, phường Vĩnh Ninh, at the Phan Đình Phùng corner, by cầu Bến Ngự; a temple and stele stood on the site before 1970).
- The wharf: https://vietnamnet.vn/en/ben-ngu-a-reminder-of-the-past-E75459.html (built 1836 under Minh Mạng; stone slabs found in 2008).
- Photos: Wikimedia Commons "File:Cầu Bến Ngự.jpg" (2023) and "File:Ben Ngu bridge.jpg" (2009).
- Footprint and heights: the local OSM extract (way 513649271) and the GISHue survey heights in hue.json (hall about 10 m, shed belt about 6 m).
- Roof plan: Esri World Imagery, zoom 18.

## Confirmed
- The footprint is about 37 x 30 m, set in a frame rotated about 20 degrees off east, at site x=-525, z=1513.
- The hall roof is grey sheet steel with four parallel gables (ridges running east-south-east), with a translucent strip beside it.
- A lower light-roofed L-shaped shed belt (about 6 m) runs along the east and north sides.
- A row of stalls with awnings stands on the south side toward the canal road.

## Estimated
- The eave and ridge split (7.2 m and 9.6 m), the bay rhythm (about 3.6 m), the shutters and the vent-block panels.
- Wall colour (pale yellow), the red sign board with gold "CHỢ BẾN NGỰ" lettering, the entrance canopy on the Phan Bội Châu front.
- The number of tarp stalls (8) and their colours.

## What changed
- Before: an ordinary extruded `data.bld` block (OSM 513649271). Now: a hand-built replica. `populate()` clears the block and any infill under the model, so no guard was needed.
- Night: the sign letters glow, and light strips run under the canopy and along the stall row (`lightMaterial`).
- The yard is paved and marked in `S.paved`.

## What is left
- The interior (stall rows inside the hall) is not modelled.
- The 10–12 m buildings north-west of the sheds are left to the city.
- The yard has no trees. The aerial shows large trees on the west yard, but none are mapped there.
- Facade details need checking against a street-level photo of the 2026 front.
