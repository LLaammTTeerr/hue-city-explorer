# Trung tâm Nghệ thuật Điềm Phùng Thị (Điềm Phùng Thị Art Centre)

Replica: `src/landmarks/places/diemphungthi.js` (id `diemphungthi`). The place is drawn as of 2026: the 1940 French villa at 1 / 17 Lê Lợi, used by the art centre since April 2018, and its sculpture garden.

## Sources
- OSM way 118540998 (the building outline), plus nearby footways, the park and Lê Lợi from the local `data/raw` extracts
- https://news.huengaynay.vn/culture/festivals/diem-phung-thi-arts-center-reopens-to-visitors-55918.html
- baothuathienhue.vn, "Trung tâm nghệ thuật Điềm Phùng Thị về nhà mới" (2018)
- https://hanhtrinhdulich.vn/trung-tam-nghe-thuat-diem-phung-thi-khong-gian-trung-bay-nghe-thuat-ben-dong-song-huong-5694/
- https://luhanhvietnam.com.vn/du-lich/trung-tam-nghe-thuat-diem-phung-thi-hue.html
- https://khamphahue.com.vn/en-us/Discover-Hue/Detail/tid/Le-Ba-Dang-Art-Museum-Diem-Phung-Thi-Art-Exhibition-House.html/pid/14323/cid/517
- Wanderlog listing ("two-storey white French villa")
- Google satellite view and the car Street View pano on Lê Lợi at 16.46658, 107.58970 (2025). Used as visual reference only for the footprint, axis and street front; nothing was traced into `data/`.

## Confirmed
- A two-storey French villa built in 1940, one of the 27 listed French buildings in Huế. It was formerly the Festival Centre office. The art centre moved here in April 2018.
- In 2018 the interior, tiled roof, garden and paths were renovated. The fence was removed to open the garden to the street and the river, so no fence is modelled.
- About 400 m² indoors on two floors (another source says 267 m² of exhibition space). The outdoor sculpture court is about 1,500 m², with about 15 works in stone, concrete, bronze and composite, plus modular stone benches. Named works: "Chào đón", "Lớn và nhỏ", "Trẻ em".
- Footprint, from the satellite view: a main body about 18.2 x 7.7 m on bearing 131 deg, from the river to Lê Lợi. A street wing about 7 m deep stands 1.2 m out on the north-east side. A one-storey annex about 4.2 m deep runs across the river end. OSM way 118540998 is about 4 m south-east of this, about 2 m too wide and about 7 deg off the axis. The place file re-frames it.
- Street front, from the 2025 car Street View: white walls and trim with ochre-yellow shutters. The door is off-centre under a small tiled awning. There is no columned porch or balcony.

## Estimates
- Wall colour: white, as on the 2025 Street View and in the Wanderlog listing. Older photos are said to show a yellow front; see Left to do. Roof: red tile, hipped, with a cross hip over the street wing.
- Heights: 0.6 m plinth, cornice 8.5 m, ridge 12 m above ground. The survey record says 12 m; TRUE_H in build-data says 8.5 m.
- The window count on the long sides, the annex front and the two chimneys are typical of the style. They were not checked closely against photos.
- The 12 sculptures are generic abstract forms (arch, stack, pair, ring, children), not copies of particular works. Their positions are invented. There are 5 half-cylinder benches.
- The garden ring and path layout are inset from the mapped footways. The paths go to Lê Lợi, round the villa and to the riverside walk.

## What changed
- New replica. No guard was needed in an older builder: the place was a generic mapped building, which `populate`'s `buildingOff` drops once the replica covers it.
- The replica removes generated infill houses inside its garden ring at runtime, the same way `quochoc` does. One filler house had stood on the lawn.
- Lawn, paved walks (registered in `S.paved`), garden lamps and porch lamps (night glow points with `userData.landmark`).

## What changed (Nov 2026 re-fit)
- The footprint was re-fitted to the satellite view and the street front to the car Street View. The model moved about 4 m north-west and was turned about 7 deg. The annex was added.
- The walls changed from ochre to white. The invented columned porch and balcony were replaced by the off-centre door with its awning.
- The mapped OSM building is now dropped from `data.bld` in the place file. After the move, the model no longer covers that building, so `populate` would otherwise draw it beside the villa.

## Left to do
- From the pano, the street front looks wider than the satellite's 10 m. The satellite was kept.
- The left bay has a raised parapet and flags; neither is modelled.
- Check the wall colour and the facade details (window count, porch, balcony) against recent photos.
- Place and shape the sculptures after the real works, if a site plan or photo set turns up.
