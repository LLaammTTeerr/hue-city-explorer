# Hồ Tịnh Tâm (`tinhtam`)

Replica: `src/landmarks/places/tinhtam.js`. Modelled as the lake stands in 2026, after the 2020 restoration.

## Sources
- OpenStreetMap (local raw extract in `data/raw/`):
  - relation 1843591: the south basin, with the Bồng Lai and Doanh Châu islands as holes;
  - relation 7102838: the north basin, with Phương Trượng as a hole;
  - the ways for Lê Văn Hưu street (the Kim Oanh dyke);
  - footbridges 1489091245 (concrete) and 1489091232 (wood);
  - the octagonal roof 1568327411.
- https://vi.wikipedia.org/wiki/Hồ_Tịnh_Tâm: area, perimeter, island names, the Kim Oanh dyke, white lotus, the 1946 demolition of the wall.
- https://khamphahue.com.vn: the 1960 octagonal pavilion on the Bồng Doanh site, the concrete bridge to Bồng Lai, national relic status in 2004.
- https://baovanhoa.vn (27 May 2020): restoration plan with a bamboo-and-timber bridge to Phương Trượng, bamboo revetment, bamboo on the dyke, the octagonal house rebuilt, rockeries.
- https://baophapluat.vn (4 Sep 2020): reopening, the octagonal house rebuilt on the island, the concrete bridge from 1960.
- https://news.huengaynay.vn (Sep 2020): the house follows the original; wooden bridge with bamboo railings; rockeries, flowers, old trees.
- https://vietnamnews.vn: the bamboo-and-timber bridge to Phương Trượng.
- https://vinwonders.com: the lotus today is mostly white.

## Confirmed
- The two OSM basins come to about 102.5k m², or about 107.5k m² with the dyke. This matches the Wikipedia figure of 107,553 m².
- Bồng Lai is the large south island and Phương Trượng the north one. Doanh Châu is the small round island to the south-west. The Kim Oanh dyke, today Lê Văn Hưu street, splits the lake.
- Bồng Lai is joined to the dyke by a concrete bridge (1960). Phương Trượng is joined by a bamboo-and-timber bridge (2020). Both bridges have bamboo railings.
- On Bồng Lai stands a small octagonal house, first built in 1960 and rebuilt in 2020.
- There are rockeries on both islands, bamboo revetment, and bamboo on the dyke.
- Nothing of the old halls, corridors or the four gates stands today, so none of them is drawn.

## Estimated
- Pavilion:
  - eave radius 6.5 m, from the OSM roof outline;
  - 8 lacquered columns about 3 m tall;
  - a single concave roof in weathered tile with white hip ridges, overall height about 7 m;
  - a two-step stone platform.
- Bridges: deck widths of 3.0 m (concrete) and 2.0 m (timber), pier spacing, and piling. The deck height follows the existing bridge profile.
- Banks: grey stone facing, a moss line, and a coping kerb on every bank, around both basins and the islands. The material is not confirmed. A bamboo band sits along the foot of the dyke.
- Where the lotus drifts lie, and how dense they are: about 3,600 pads (1,600 on low quality) and about 16 % white blooms.
- Positions of the rockeries and bamboo clumps.

## What changed
- The generic footbridge slabs of the two mapped bridges are collapsed and replaced with:
  - the concrete bridge to Bồng Lai, with piers and bamboo railings;
  - the timber bridge to Phương Trượng, with pile bents and bamboo railings.
- The octagonal house replaces the generic gazebo, which coverage removes.
- Stone revetment around all banks and islands, with bamboo revetment and bamboo clumps along the Kim Oanh dyke.
- White lotus (instanced) on both basins.
- Two rockeries on Bồng Lai.

## Left
- The 5.5 × 3 m mapped shed on Phương Trượng is kept as mapped.
- There are no rockeries on Phương Trượng yet.
- Low perimeter walls: it is not confirmed whether they still exist, so they are not drawn.
- Whether any remains of the gates or the Bồng Doanh foundations are visible is unconfirmed.
- The bamboo clumps are simple cones.

## Alignment with Google imagery (2026-11)
Satellite and car Street View were used as visual reference only. Nothing was copied or traced into `data/`.
- Position and outline: the pavilion, the shore, Bồng Lai, Doanh Châu, both bridges, Lê Văn Hưu and Tịnh Tâm all lie within a few metres of the satellite image. No data fix was needed.
- Lotus: the satellite shows a near-full mat. There are now about 6,000 emergent leaves and 5,000 floating ones (2,400 and 2,000 on low quality), with blooms on 8 % of the emergent leaves.
- Pavilion: it stands on a pale octagonal terrace about 16 m across, under the two-step floor, with a brick path running south-west across Bồng Lai.
- Trees:
  - big broadleaf canopies on Bồng Lai;
  - tree rows on the Tịnh Tâm and Đinh Tiên Hoàng banks;
  - broadleaf trees on the north-west bank.

  They are added to `data.trees`. Trees on the island and on the Tịnh Tâm bank take the indices the city's planter keeps broadleaf; the rest may become willows.
- Bamboo: Street View shows vase-shaped clumps, so it now grows only on the Kim Oanh dyke and is kept off the carriageway. The north-west bank shows broadleaf trees and houses instead.
- Tịnh Tâm road: a low concrete parapet (about 0.7 m) on the lake side, as seen in Street View.
- Estimated: the size of the terrace, tree positions and sizes, the parapet height, and the lotus density.
- Still unlike the reference:
  - the roads are drawn at their OSM class width, wider than the real lanes;
  - the houses on the north-west bank are missing;
  - the satellite image cannot show whether the pavilion roof has a second tier.
