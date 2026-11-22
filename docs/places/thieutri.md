# Lăng Thiệu Trị (Xương Lăng)

Replica: `src/landmarks/places/thieutri.js` (id `thieutri`). The old model, `thieuTri` in `src/landmarks/tombs.js`, is skipped through `replaced('thieutri')`.

## Sources
- https://vi.wikipedia.org/wiki/L%C4%83ng_Thi%E1%BB%87u_Tr%E1%BB%8B: the layout of both axes, plus the dimensions and names listed under "Confirmed".
- https://vinwonders.com/vi/wonderpedia/news/lang-vua-thieu-tri-hue/: the two axes, and the lakes linked as a "chi huyền thủy".
- vi.wikipedia (same page): Đức Hinh lâu stands on a low tortoise-shell hill and resembles Minh Lâu at Lăng Minh Mạng; only its 18.5 × 18.5 m foundation and two brick trụ biểu remain. The article says nothing about its storeys, roofs or when it was lost.
- https://baovanhoa.vn/van-hoa/di-tich-lang-vua-thieu-tri-dang-duoc-tu-bo-nhu-the-nao-216933.html: phase 3 of the restoration rebuilds Đức Hinh lâu to its original state, with a timber frame, yellow-glazed âm dương tiles, ridges, pháp lam and con giống, in Bát Tràng brick and Thanh stone.
- Travel pages (vietnamdiscovery, localvietnam): Đức Hinh lâu was a ruin before the restoration.
- OpenStreetMap, in the repo's local extracts under `data/raw`:
  - Building outlines:
    - way 264285105: Biểu Đức
    - way 264285107: Hồng Trạch môn
    - ways 264285106 and 264285108: Phối điện
    - ways 264285104 and 264285109: Tòng viện
    - way 1075011937: Bi Đình
    - way 1075011938: Đức Hinh lâu
  - Lakes: ways 242927542 (Nhuận Trạch), 242927543 (Ngưng Thúy) and 1075011956 (hồ Điện). The lakes are water data and are drawn elsewhere.

## Confirmed facts
- **Layout:** two parallel axes facing north-west. The temple axis is on the left; there is no La thành.
- **Temple axis**, front to back:
  - Brick screen.
  - Half-moon hồ Điện.
  - Marble nghi môn with pháp lam enamel.
  - Sân tế in three tiers, Bát Tràng brick, with a stone walk.
  - Hồng Trạch môn, set in a rectangular brick wall with gates on four sides.
  - Đông and Tây Phối điện.
  - Điện Biểu Đức: 23.4 × 21.5 m, a double hall.
  - Tả and Hữu Tòng viện.
  - Arched back gate.
- **Tomb axis**, front to back:
  - Half-moon Nhuận Trạch.
  - Bronze nghi môn.
  - Sân chầu with elephants, horses and mandarins.
  - Bi Đình on a 2.65 m platform.
  - Đức Hinh lâu on a low hill: an 18.5 × 18.5 m foundation, two brick trụ biểu, a building like Minh Lâu, a timber frame under yellow-glazed tiles.
  - Ngưng Thúy, crossed by three bridges (Tây Định, Chánh Trung, Đông Hòa).
  - Round Bửu Thành, 260 m in circumference (r 41.4 m), with a bronze gate, the mound and pines inside.

## Estimates
- **Tomb axis**
  - Statues: the number and arrangement are estimated. Each side has 1 elephant and 1 horse, 2 military mandarins and 4 civil ones.
  - Bronze gate pillar heights: 4.4 and 5.4 m.
  - Bridge lengths come from the OSM water edge.
  - Bửu Thành wall: 3 m high.
  - Grave mound: about 4 m high, 11.5 m radius.
- **Temple axis**
  - Hall and roof heights: Biểu Đức measures about 10 m and the side halls about 6-7 m.
  - Sizes: the screen, the marble gate, the tier levels and the temple wall line (5-7 m outside the mapped halls).
- **Đức Hinh lâu** (owner's policy: lost buildings are drawn complete, as they stood). No source gives its form beyond "like Minh Lâu", so it is drawn on Minh Lâu's pattern: square, two storeys, two tiers of four-sloped glazed roofs.
  - Hill terrace (+0.3 m) and foundation (+1.1 m): estimated.
  - Ground storey: a 15 m colonnade of 6 × 6 bays at 3 m (fits the 18.5 m base with a 1.75 m margin), a closed lacquered core 10.2 m square with a door in each face, 4.0 m to the eave.
  - Upper storey: 10.6 m square, 3.6 m high, lattice window band all round, name board on the front.
  - Roofs: lower skirt over 15 m with 1.3 m overhang; upper hip 2.8 m high. The ridge is about 10.4 m over the base; the check measures 13.7 m (Minh Lâu at Minh Mạng: 13-14 m).
  - Trụ biểu: 7.9 m, estimated.
  - Sources agree; there is no conflicting description to choose between. What it looked like in detail (doors, windows, whether the upper storey had a gallery) is not documented in what was found.

## What changed
- New replica covering both axes and their walls (about 20k triangles), with paved courts registered in `S.paved`.
- Nhuận Trạch no longer has bridges; the old model had three.
- Đức Hinh lâu was first drawn as the bare base (column stones, wall stubs); it is now drawn complete, a two-storey lầu like Minh Lâu.
- `docs/heights-reference.json`: the entry "Thiệu Trị, Đức Hinh lâu (ruin, foundation only)" (3.2 m) is out of date; its replacement ("Thiệu Trị, Đức Hinh lâu", 13-14.5 m) is waiting to be merged. Biểu Đức measures 10.2 m against 9.

## Satellite and Street View alignment (2026-11)
Measured against Google satellite and Street View (visual reference only, nothing traced into `data/`):
- Temple axis 42° (the OSM centroids alone gave 40.2°); sân tế 36 m wide in three tiers from 57 m before Biểu Đức, reaching the lake wall; a low stone parapet along each tier side.
- Tomb axis 33.5° (bridges and Đức Hinh lâu → Bửu Thành), 36° before.
- Bridges sit on the three OSM footway bridges (bridge=yes) over Ngưng Thúy, about 21 m apart; Chánh Trung 3.8 m wide, the others 3.2 m.
- Bửu Thành centre measured on the satellite about 15 m east of the old position; the satellite ring (r ≈ 39.5 m) agrees with the documented 260 m.
- Tòng viện way 264285104 re-framed 2.4 m east, 1.2 m south to sit on its hall, symmetric with 264285109.
- Side halls are dark brown-roofed and the gates ochre-plastered with grey roofs (Street View); Bát Tràng paving weathered.

## What is left
- Bi Đình is kept on the tomb axis; the dark restoration shelter over it on the satellite is centred about 8 m SW.
- A modern grey shed SW of Bi Đình is not modelled.
- Hiển Quang các (the rest pavilion to the right) and the outer stele pavilions are not modelled.
- The pháp lam panels are plain colour blocks.
- The bridges are plain arched decks; they are not checked against photos.
- The ground behind the Bửu Thành rises; the ring wall follows it but the inside is not terraced.
