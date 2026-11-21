# Courtyard objects: statues, cauldrons, urns, cannons

This page covers the bronze and stone objects in the courts of Đại Nội and the royal tombs. The low-poly builders are in
`src/landmarks/props.js`.

- Objects belonging to one place's court are drawn by that place's file.
- The cannon houses and the Cần Chánh and Càn Thành vạc are drawn by `src/landmarks/courtyard.js`. Each of those
  objects finds its floor in the buffer and is skipped, with a warning, if something stands where it would go.

**Confirmed** means a fetched page gives the fact. **Estimated** means the model chooses it, for example a position,
a size, or the shape of an object no source describes.

## Bronze cauldrons (vạc đồng), Đại Nội

- **Confirmed: what they are.** The vạc were cast under the Nguyễn lords (1631–1684), not the kings. Their shape:
  - a flared mouth wider than the body
  - four handles between the neck and the body
  - an iron three-legged stand
  - inscriptions on the rim

  Sources: khamphahue.com.vn ("The Nguyen Dynasty Copper Cauldrons"), kienthuc.net.vn ("Cận cảnh chiếc vạc đồng siêu kỳ dị
  của nhà Nguyễn").
- **The count is not settled.** khamphahue gives 11: 7 in the Imperial City, 3 in the museum and 1 at Đồng Khánh's tomb.
  kienthuc gives 15. Another page gives 7.
- **Confirmed: named spots, one vạc each (khamphahue).**
  - before Kiến Trung (1659)
  - before Tả Vu (1660)
  - before Hữu Vu (1662)
  - left of Càn Thành (1684)
  - right of Càn Thành
  - left of Thái Hòa

  The dates on that page for the last two are inconsistent. vi.wikipedia (Hoàng thành Huế) places two vạc in the sân bái
  mạng behind Đại Cung Môn.
- **Confirmed: size.** The Tả Vu vạc has a mouth 2.2 m across, an inner diameter of 1.83 m, and a body 1.05 m high
  (1.30 m to the top of the handles). It weighs 2,582 cân. It is the largest of them.
- **Estimated: the model.**
  - Rim 1.9–2.0 m across (`vac`, d 2.0).
  - Each vạc is set at a named spot, measured in the Cần Chánh frame:
    - before Tả Vu and Hữu Vu: u ±27, v 31
    - either side of the front of Càn Thành: u ±20, v −55
    - before Kiến Trung: `places/kientrung.js`, on the axis at the foot of the forecourt
    - left of Thái Hòa: `places/thaihoa.js`, a pair on Đan Bệ at W(±15, 26.5)

    The exact spots are estimated.
  - The second Thái Hòa vạc (right side) is estimated: the sources name only the left one. It makes the court symmetric.
- **Not placed:** the Đồng Khánh tomb vạc, because its position is not known.

## Cửu vị thần công (the nine holy cannons)

- **Confirmed.**
  - Cast 1803–04 under Gia Long, each titled "Thần oai vô địch thượng tướng quân", about 5.1 m long (kienthuc.net.vn,
    "Cận cảnh những khẩu súng thần công trứ danh").
  - They stand in two houses, the Tả and Hữu pháo xưởng, beside cửa Thể Nhơn and cửa Quảng Đức. The houses face each
    other across the axis in the square between Kỳ Đài and Ngọ Môn. The original houses had 5 gian and 2 chái
    (baovanhoa.vn, the plan to restore the houses).
  - Tứ thời (four cannons) is at Thể Nhơn and Ngũ hành (five) at Quảng Đức (tienphong.vn). The split is implied
    there, not stated outright.
- **Estimated.**
  - **Bore and carriage.** No source gives these. Each cannon gets a wooden carriage with spoked wheels (`cannon`,
    len min(5.1, house depth − 0.4)).
  - **Orientation.** The muzzles point out of the long side toward the other house.
  - **The house.** A 0.45 m plinth, lacquer columns about 3.6 m apart, a low back wall, and a brown tiled hip roof.
    The outline is the mapped OSM building, which the city's plain box no longer draws.

## Cửu Đỉnh (the nine dynastic urns), Thế Miếu court

- **Confirmed.**
  - Cast between Dec 1835 and mid 1837.
  - They stand in a line before Thế Miếu, facing it. Cao Đỉnh is in the middle, set forward about 3 m.
  - Heights run from 1.83 m (Anh) to 2.02 m (Cao). The weights are about 1.9 to 2.6 t, and the sources disagree.

  Sources: vi.wikipedia, vntravellive.com ("Cửu đỉnh và ước mơ về sự hùng mạnh của nhà Nguyễn").
- **Model.** `places/hienlam.js` keeps its positions and size levels. Each urn is now the `dinh` builder:
  - a round belly on three legs
  - two upright ear handles
  - relief bands
  - a stone stand 0.22 m high
- **Estimated.** The two small burners at the ends of the row are lidded `dinh`, 0.75 m high.

## Thế Miếu court

- **Confirmed** (vi.wikipedia, see `themieu.md`):
  - 14 stone stools (đôn) in one row, each carrying a potted tree
  - a pair of bronze kỳ lân
- **Model.**
  - 12 planters are drawn. The two stools that would fall on the middle walk are left out, as in the earlier layout.
  - The kỳ lân stand on 0.9 m stone plinths either side of the walk, facing down it.
- **Estimated:** the kỳ lân's pose and size (about 1.5 m long).

## Hưng Miếu court

- **Confirmed** (see `hungmieu.md`): six planters and a bronze incense burner.
- **Estimated.**
  - The planters stand on square stands, white with a blue band.
  - The burner is a lidded `dinh`, 1.95 m high, on a 0.4 m stand.
  - Positions are estimated.

## Kiến Trung forecourt

- **Confirmed** (see `kientrung.md`, and OSM nodes tagged `historic=cannon`):
  - brick stools with potted trees
  - cannons
  - a vạc (1659, khamphahue)
- **Estimated.**
  - The cannons are 2.4 m long on carriages, one either side of the foot of the middle flight.
  - The vạc stands on the axis.
  - The stools sit in the existing parterre layout.

## Thái Hòa court (Sân Đại Triều Nghi)

- **Estimated: bronze cranes and censers.** No fetched source gives cranes on tortoises or censers at Thái Hòa.
  The model draws:
  - two cranes standing on tortoises inside the hall, either side of the throne (`crane`, 1.8 m)
  - two lidded censers on Đan Bệ (`dinh`, 1.6 m on a 0.3 m stand)

  Both are common in Huế's halls. **The owner should decide whether to keep them.**
- The phẩm sơn steles were already modelled.

## Tomb salutation courts (sân chầu)

- **Confirmed: the general layout** (laodong.vn, vi.wikipedia).
  - Each side has two rows of stone figures: civil and military mandarins, then elephants and horses. The horses stand
    level with the elephants.
  - Dục Đức's tomb has no horses. Đồng Khánh's horses are cement.
  - Gia Long's tomb has 10 figures, 2 elephants and 2 horses, all in blue stone. That tomb is not modelled.
- **Estimated: counts per tomb.** No source gives counts for Minh Mạng, Thiệu Trị, Tự Đức, Khải Định or Đồng
  Khánh, so the existing counts stand.
- **Changed: the figures.** They are now built by `props.js` instead of stacked boxes:
  - a mandarin with a robe, sleeves and hands held at the chest, and a hat with wings
  - military mandarins with a sword held before them
  - an elephant with tusks and trunk
  - a horse with a saddle

  In the shared `statueCourt` (`tombs.js`), the outer rows are military.
- **Estimated: sizes.**

  | Tomb | Mandarins | Beasts |
  | --- | --- | --- |
  | Default | 2.2 m | |
  | Tự Đức | 1.75 m | 0.95 scale |
  | Khải Định | 2.15 m (its smaller soldiers are military) | |
  | Đồng Khánh | 2.6 m | |

## Not placed

- **Kỳ lân at the gates.** No source.
- **Glazed jars.** Nothing found. The builder exists (`jar`) for when a source turns up.
