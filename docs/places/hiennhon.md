# Cửa Hiển Nhơn (hiennhon)

The east gate of the Imperial City (Hoàng thành), Huế. Model: `src/landmarks/places/hiennhon.js`. The older generic
Imperial City gate in `src/landmarks/citadel.js` skips this gate with a `replaced('hiennhon')` guard.

## Sources
- OpenStreetMap way 264099611 (`historic=city_gate`), cached in `data/raw/hue-osm.json`. Gives the outline:
  14.0 × 7.9 m, long axis along the Imperial City wall.
- VOV, "A close look at the four gates into the Hue Imperial Citadel":
  https://vov.gov.vn/a-close-look-at-the-four-gates-into-the-hue-imperial-citadel-dtnew-1022462
  Built 1805 under Gia Long. Decorated with porcelain in 1833 under Minh Mạng, restored under Khải Định, destroyed
  by bombardment in 1968, restored after 1975. Today it is the visitors' exit.
- Chestnut Journal, "Old-Time Vietnam – The Imperial Enclosure and Its Beautiful Gates": https://chestnutjournal.com/?p=5513
  Masonry, two storeys, three arched gateways below and three arches on the upper level, yellow glazed tiles,
  glazed and coloured reliefs beside the arches.
- Search summaries (wanderlog, baodanang): three entrances, two storeys, very ornate.
- Wikimedia Commons, Category:Hiển Nhơn Gate. Only the file names were read; no photos were downloaded.

## Confirmed
- Plan size and orientation (OSM).
- Three arched passages, a two-storey tower with three arches on each long face, yellow glazed roofs, and porcelain
  mosaic ornament.
- It stands in the wall line: the wall ends at the outline's two short faces (OSM `iwalls`).

## Estimated
- Heights: block 4.8 m to the cornice, top of the ridge about 12.8 m, pearl finial about 13.9 m. No published
  figure was found.
- Passage sizes: middle 3.0 × 4.0 m, sides 2.0 × 3.1 m.
- Tower storey sizes (11.2 × 4.8 m and 6.6 × 2.8 m; the lower one's length from Street View and the satellite).
- Colours: weathered grey mosaic masonry, light grey trim, a green glazed balustrade, blue, green, red and gold mosaic
  (body, arches, reveals and doors confirmed from Street View).
- The ornament layout: pilasters, plaque, keystones, and two dragons facing a fire pearl on the ridge.

## What changed
- New replica: a plinth; the block with three real arched passages (vaults, dark lining, paved floor, stone
  surrounds, mosaic keystones); mosaic pilasters, including two on each end where the wall comes in; a name plaque
  on both faces; a cornice and a balustrade with green glazed openwork; the masonry lower storey with blind arched
  openings and its flared yellow roof; the upper storey and its roof with ridge dragons and the fire pearl.
- The block is 14.3 m long, so it meets the wall ends `places/dainoi.js` leaves at the footprint plus 0.15 m.

## Google check (Nov 2026)
- Satellite (z20, 0.14 m/px): the gate's lit top is a long narrow strip about 14 m long and 5 m across, centred
  within about 1 m of the OSM centre, its long axis within about 2° of the outline's and of the wall line. Kept
  the OSM centre and axis. The capture stage's "3-4 m west" estimate counted the gate's shadow, which falls
  south-west along the wall line.
- Street View: one user photosphere on the outer (east) plaza shows the outer face looking south-south-east along
  it; no car pano sees the gate. From it: weathered grey porcelain-encrusted masonry (not cream lime-wash), each
  arch ringed by a blue band with a white band inside, ochre-yellow passage reveals, red door leaves standing open
  inside, tall pale pedestals with blue mosaic panels and framed red-brown relief panels on the piers, a crested
  cornice, and the upper storey's arched openings set over the side passages.
- Changed: colours as above; pedestals and relief panels on the piers in place of thin pilasters; blue and white
  arch bands; yellow reveals and vaults; red door leaves; the tower's lower storey widened to 11.2 × 4.8 m (was
  8.6 × 5.2) with its side openings over the side passages, the upper storey 6.6 × 2.8 m (was 5.4 × 3.2). Heights
  unchanged (not visible in any capture).

## Left to do
- Check the proportions and ornament against photos; no photos were viewed.
- Doors in the passages, and night lighting (none is known).
