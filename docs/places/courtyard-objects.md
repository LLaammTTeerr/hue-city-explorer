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
    - left of Thái Hòa: `places/thaihoa.js`, one vạc on Đan Bệ on the hall's left (the east, as the hall faces
      Ngọ Môn) at W(15, 26.5)

    The exact spots are estimated.
  - The second Thái Hòa vạc (right side) that the model used to draw for symmetry is **removed**: no source gives
    it. khamphahue pairs "the left side of the Thái Hòa Palace" with "the right side of the Càn Thành Palace".
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
- **Confirmed: the exact wording** (vi.wikipedia, Thế Tổ Miếu (hoàng thành Huế)):
  - "Trên sân đặt 1 hàng 14 chiếc đôn đá, bên trên đặt các chậu sứ trồng hoa": the pots on the stools are
    porcelain (chậu sứ). This is the one source found for glazed pots in a Đại Nội court; the blue-and-white
    `planter` pots match it.
  - "Hai bên sân lại có một đôi kỳ lân bằng đồng đứng trong thiết đình": the two bronze kỳ lân stand on the two
    sides of the court, each **inside a metal kiosk (thiết đình)**.
- **Model.**
  - 12 planters are drawn. The two stools that would fall on the middle walk are left out, as in the earlier layout.
  - **Changed:** the kỳ lân moved from beside the walk (u ±6) to the two sides of the court (u ±25, v 28), each in a
    `kiosk` (new builder in `props.js`: stone slab, four posts, side rails, flared pyramid roof, 2.6 m square, posts
    3.3 m), on a 0.7 m plinth, facing the walk. View: `themieu-kylan-kiosk`.
- **Estimated:** the kiosk's form (no source describes it), the exact spots, and the kỳ lân's pose and size (about
  1.5 m long).

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

- **Confirmed: crane and tortoise statues inside the hall.** Frommers ("Thai Hoa Palace"): "Note the statues of the
  heron and turtle inside the palace's ornate lacquered interior". It names no count, material or spot.
  - Model: two bronze cranes standing on tortoises (`crane`, 1.8 m) either side of the throne in the main hall's middle
    bay, W(±2.3, −3.2), facing out. They were in the open verandah before, which the source contradicts. The three
    middle front bays are drawn with their leaves folded open (owner's choice, 2026-11-22) so the pair can be seen
    from Đan Bệ; view `thaihoa-open-doors`.
  - Estimated: the count (a pair, as such statues usually stand), bronze, the size and the spot. The throne's place,
    "in the central compartment of the main palace", is from khamphahue ("Thai Hoa Palace").
- **Confirmed: a pair of kỳ lân in front of the hall.** Frommers: "In front are two mythical ky lin animals". A
  Bridgeman Images photo (David Henley) is captioned as a qilin "in the courtyard of the Dien Thai Hoa (Palace of
  Supreme Harmony)"; its page could not be fetched, only the search-result title.
  - Model: `kylan`, bronze, on 0.55 m stone plinths on Đan Bệ either side of the foot of the middle flight,
    W(±4.3, 19.4), facing Ngọ Môn. View: `thaihoa-kylan-front`.
  - Estimated: bronze (not stated), pose, size and spot.
- **Confirmed: one vạc on the hall's left** (khamphahue, see the cauldron section). Drawn on Đan Bệ, east side.
- **Removed: the second vạc and the two lidded censers** on Đan Bệ. No fetched source gives a censer, đỉnh or lư
  hương on Đan Bệ or in the hall, or a vạc on the right.
- **Found, not drawn: a pair of bronze dragon statues** of Thiệu Trị's reign (1842), a national treasure since 2025,
  "hiện trưng bày tại điện Thái Hòa"; they first stood before the verandah of Càn Thành (tuoitre.vn, "4 hiện vật của
  nhiều thời vua vừa được công nhận là bảo vật quốc gia"). They are on display inside the closed hall, and no source
  gives their size or spot.
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

## Not placed, and still unsourced

- **Kỳ lân at the Đại Nội gates** (Ngọ Môn, Hiển Nhơn, Chương Đức) and at Hiển Lâm Các: no source found. The
  sources describe dragons on the gates' roofs (vietnamplus.vn, "Linh vật trên di sản Huế"), not statues before them.
- **Glazed jars (chum) and porcelain basins in other courts** (Duyệt Thị Đường, Diên Thọ, Tử Cấm Thành, the tombs):
  nothing found. The `jar` builder stays unused.
- **Censers on Đan Bệ or in Thái Hòa**: nothing found; removed.
- **The Đồng Khánh tomb vạc**: its position is still not known.
- **More vạc at Thế Miếu or Hưng Miếu**: none found. vi.wikipedia lists only the stools, the kỳ lân and Cửu Đỉnh
  at Thế Miếu.
- **The Ngọ Môn bell** (1822, Minh Mạng; national treasure 2025) hangs in Lầu Ngũ Phụng (tuoitre.vn, above). The
  pavilion's interior is not modelled.
- **The crane and tortoise statues at Khải Định's tomb**: thailex.info places such a pair at "a shrine devoted to the
  Emperor Khai Dinh" without saying where in it. Not placed.
- **Hưng Miếu's planters and burner**: these are from `hungmieu.md`; this pass found nothing newer.

## Sources fetched in this pass

- khamphahue.com.vn, "The Nguyen Dynasty Copper Cauldrons":
  https://khamphahue.com.vn/en-us/Discover-Hue/Detail/tid/The-Nguyen-Dynasty-Copper-Cauldrons.html/pid/15910/cid/485
- khamphahue.com.vn, "Thai Hoa Palace" (throne in the central bay of the main hall; no statues named):
  https://khamphahue.com.vn/en-us/Discover-Hue/Detail/tid/Thai-Hoa-Palace.html/pid/17681/cid/464
- Frommers, "Thai Hoa Palace" (kỳ lân in front, heron and turtle inside):
  https://www.frommers.com/destinations/hue/attractions/thai-hoa-palace. A guidebook, not a heritage source; it is the
  only page found that names objects at Thái Hòa, so it is used, and everything beyond its words is marked estimated.
- Bridgeman Images, David Henley, qilin in the courtyard of Điện Thái Hòa (title only; the page refused the fetch):
  https://bridgemanimages.com/en/david-henley/vietnam-a-qilin-mythical-hooved-chimerical-creature-in-the-courtyard-of-the-dien-thai-hoa-palace-of/nomedium/asset/1186297
- vi.wikipedia, Thế Tổ Miếu (hoàng thành Huế) (stools with porcelain pots; kỳ lân in thiết đình):
  https://vi.wikipedia.org/wiki/Thế_Tổ_Miếu_(hoàng_thành_Huế)
- tuoitre.vn, the 2025 national treasures (dragon pair at Thái Hòa, Ngọ Môn bell):
  https://tuoitre.vn/4-hien-vat-cua-nhieu-thoi-vua-vua-duoc-cong-nhan-la-bao-vat-quoc-gia-2025010311222724.htm
- en.vietnamplus.vn, "Nguyen dynasty bronze cauldrons in Hue imperial citadel" (photo captions: the 1662 vạc and "a
  pair of bronze cauldrons in Can Chanh courtyard"):
  https://en.vietnamplus.vn/nguyen-dynasty-bronze-cauldrons-in-hue-imperial-citadel-post169107.vnp
- thailex.info, "Vietnamese crane on tortoise" (a pair at a Khải Định shrine; not placed).

vi.wikipedia's Điện Thái Hòa (Hoàng thành Huế) article names only the steles on the two terraces; it has no statues,
vạc or censers. No source disagreed with another about how an object looks; the disagreements are counts and dates of
the vạc, noted above.
