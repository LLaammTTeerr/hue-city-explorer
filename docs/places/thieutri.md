# Lăng Thiệu Trị (Xương Lăng)

Replica: `src/landmarks/places/thieutri.js` (id `thieutri`). The old model, `thieuTri` in `src/landmarks/tombs.js`, is skipped through `replaced('thieutri')`.

## Sources
- https://vi.wikipedia.org/wiki/L%C4%83ng_Thi%E1%BB%87u_Tr%E1%BB%8B: the layout of both axes, plus the dimensions and names listed under "Confirmed".
- https://vinwonders.com/vi/wonderpedia/news/lang-vua-thieu-tri-hue/: the two axes, and the lakes linked as a "chi huyền thủy".
- Travel pages (vietnamdiscovery, localvietnam): Đức Hinh lâu is a ruin today.
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
  - Đức Hinh lâu: only its 18.5 × 18.5 m foundation and two brick trụ biểu remain.
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
- **Đức Hinh lâu ruin:** the hill terrace (+0.3 m), the foundation (+1.1 m) and the grid of column bases are estimated. So are the low brick wall stubs and the trụ biểu (7.9 m).

## What changed
- New replica covering both axes and their walls (about 20k triangles), with paved courts registered in `S.paved`.
- Nhuận Trạch no longer has bridges; the old model had three.
- Đức Hinh lâu is drawn as the ruin it is, not a standing hall.
- `docs/heights-reference.json`: "Thiệu Trị, Minh Lâu" (12 m) is now "Đức Hinh lâu (ruin, foundation only)" at 3.2 m, with the source cited. The model measures 3.4 m, and Biểu Đức measures 10.2 m against 9.

## What is left
- Hiển Quang các (the rest pavilion to the right) and the outer stele pavilions are not modelled.
- The pháp lam panels are plain colour blocks.
- The bridges are plain arched decks; they are not checked against photos.
- The ground behind the Bửu Thành rises; the ring wall follows it but the inside is not terraced.
