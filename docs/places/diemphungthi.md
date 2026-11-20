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

## Confirmed
- A two-storey French villa built in 1940, one of the 27 listed French buildings in Huế. It was formerly the Festival Centre office. The art centre moved here in April 2018.
- In 2018 the interior, tiled roof, garden and paths were renovated. The fence was removed to open the garden to the street and the river, so no fence is modelled.
- About 400 m² indoors on two floors (another source says 267 m² of exhibition space). The outdoor sculpture court is about 1,500 m², with about 15 works in stone, concrete, bronze and composite, plus modular stone benches. Named works: "Chào đón", "Lớn và nhỏ", "Trẻ em".
- The footprint is the OSM L-shape: about 19.9 x 10.3 m, with a bay about 2 m deep on the street side.

## Estimates
- Wall colour: ochre with white trim. Sources disagree: one review says white, while photos suggest a yellow facade. Roof: red tile, hipped, with a cross hip over the street pavilion.
- Heights: 0.7 m plinth, 7.0 m walls (two floors of 3.4 m), ridge about 12 m above ground. The survey record says 12 m; TRUE_H in build-data says 8.5 m.
- The entrance porch on two columns, the balcony, the name board and the two chimneys are typical of the style and were not checked against photos.
- The 12 sculptures are generic abstract forms (arch, stack, pair, ring, children), not copies of particular works. Their positions are invented. There are 5 half-cylinder benches.
- The garden ring and path layout are inset from the mapped footways. The paths go to Lê Lợi, round the villa and to the riverside walk.

## What changed
- New replica. No guard was needed in an older builder: the place was a generic mapped building, which `populate`'s `buildingOff` drops once the replica covers it.
- The replica removes generated infill houses inside its garden ring at runtime, the same way `quochoc` does. One filler house had stood on the lawn.
- Lawn, paved walks (registered in `S.paved`), garden lamps and porch lamps (night glow points with `userData.landmark`).

## Left to do
- Check the wall colour and the facade details (window count, porch, balcony) against recent photos.
- Place and shape the sculptures after the real works, if a site plan or photo set turns up.
