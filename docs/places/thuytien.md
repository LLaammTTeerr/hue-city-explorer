# Hồ Thủy Tiên (abandoned Thủy Tiên water park, Thủy Bằng)

Replica id `thuytien`. Code: `src/landmarks/places/thuytien.js`, a thin entry that calls `buildThuyTien(data, S, group)` in
`src/landmarks/thuytien.js`. The old call in `south.js` is skipped by `replaced('thuytien')`.

## Sources
- VnExpress International, 2024, "Giant dragon statue at Hue park to be dismantled":
  https://e.vnexpress.net/news/news/giant-dragon-statue-at-hue-park-to-be-dismantled-4706326.html
- Báo Văn Hóa, 16 Apr 2025, "Bị bỏ hoang, hồ Thủy Tiên đang thành điểm đến cộng đồng":
  https://baovanhoa.vn/du-lich/bi-bo-hoang-ho-thuy-tien-dang-thanh-diem-den-cong-dong-128024.html
- Saigoneer, photo essay on the abandoned park:
  https://saigoneer.com/vietnam-travel/12326-photos-hue-s-abandoned-waterpark-is-a-post-apocalyptic-beauty
- Kathmandu & Beyond travel report (stair to the mouth, ribcage interior, amphitheatre): https://kathmanduandbeyond.com/?p=212381
- vi.wikipedia / en.wikipedia "Hồ Thủy Tiên" (area, years, 2025 reopening as a community park).
- OSM, via local data/raw/hue-osm-thuytien.json and public/data/hue.json: aquarium building, lake and pond rings, bleachers, pools, abandoned water slide, sculptures.

## Confirmed facts
- Built 2001–2004 for more than 70 billion VND; about 50 ha (49.59 ha recovered by the province in 2017).
- The dragon is about 20 m tall and 50 m long, coiled around a three-storey aquarium pavilion on the lake. Visitors climb to the open mouth to look out over the lake.
- There is an amphitheatre/stage with about 2,500 seats, around the lake from the aquarium, with a central platform at the water.
- Three water slides, rusted; one runs down through the forest.
- In the 2024–25 clean-up the entrance gate was dismantled and the aquarium cleared, but the dragon was kept as the focal point. That work also added a ~2 km granite lakeside path, 82 LED lamps and refurbished steps to the mouth. The park reopened as a community park in 2025.

## Estimates
- Storey heights: three storeys of about 3 m under a low dome. The dragon head is sized so the overall height comes to about 20 m.
- Colours: the dragon is green-grey and weathered; the slides are their original colours, faded toward moss green.
- Lamp spacing is 26 m along the mapped shore (about 2.4 km), 3.5 m inland. Each lamp is a 4.2 m post.
- Stage placement: set inside the OSM show pool, in front of the mapped bleachers. Seat colours are unknown.

## What changed
- The dragon is rebuilt to full scale: a three-storey core, a coiled body, a raised neck, and an open mouth with a viewing-deck railing.
- The entrance gate is removed (dismantled in 2024–25). Lakeside lamp posts are added with night glow points (`userData.landmark='thuytien'`).
- Plazas and stands are registered as paved. Scrub grows along the stands and pools. The stage is moved into the show pool. Slide colours are weathered.

## What is left
- It is unconfirmed whether the slides, stands and other derelict blocks survived the 2024–25 asset-auction dismantling. They are kept as ruins.
- The granite path is not modelled as its own surface; the existing OSM footways stand in for it.
- The aquarium interior (ribcage-like structure) is not modelled.

## Satellite and Street View alignment (2026 rebuild)
Checked against Google satellite (zoom 17-20) and the Street View photospheres available (most car panos here render
black; the two user photospheres were used for layout only). Visual reference only; nothing traced.
- Position: the mapped aquarium disc, its three footbridges, the aqua-park pools, the peninsula and the entrance plazas
  all sit within ~1-2 m of the satellite. No data change was needed.
- Dragon: the head rears to the north (bearing ~353°), ~23 m out from the drum's axis, where the satellite shows the
  round head with its radiating mane. It had been aimed at the lake's centroid, ~45° further west, and ~4 m shorter.
- Amphitheatre: the mapped grandstand and show pool are a bare sandy clearing with grey slab scraps on the 2026
  satellite (the 2024-25 clean-up). The seats and stage are no longer drawn; the clearing is. The OSM show-pool water
  polygon still renders as water (it is drawn from the data), though the satellite shows dry ground there.
- Plazas: the round plaza east of the entrance (OSM 493380761) is three concentric grey paved rings with grass between;
  the entrance plaza's pavers are weathered terracotta (2025 photosphere).
