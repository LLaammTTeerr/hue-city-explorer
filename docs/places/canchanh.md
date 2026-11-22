# Điện Cần Chánh (id `canchanh`)

Model: `src/landmarks/places/canchanh.js`. It draws the hall finished, as it stood before February 1947 and as the
2025–2028 restoration aims to complete it: the platform, its three front flights, the trùng thiềm điệp ốc double hall
under yellow glazed roofs, the rear mái lưa, and the paved court (sân bái mạng) in front. Owner policy (Nov 2026):
buildings being rebuilt are drawn as the finished historic building, not the building site.

## Sources
- OSM way 285990343 (historic=ruins, "Điện Cần Chánh"): the platform outline, 44.5 × 35.3 m. OSM steps
  619851677, 619851679 and 619851678 are the three front flights, at u ≈ -15.9, -0.4 and +14.0 m. The court lies
  between Tả Vu (way 172657574) and Hữu Vu (way 172657572).
- vi.wikipedia.org/wiki/Điện_Cần_Chánh_(Hoàng_thành_Huế): built 1804. Platform nearly 1 m high, faced with gạch vồ
  and Thanh stone. Front hall 7 gian 2 chái đơn, main hall 5 gian 2 chái kép, 80 lim columns, carved beams, rafters
  and purlins. Galleries of 5 bays link it to Văn Minh, Võ Hiển, Tả Vu and Hữu Vu. Razed in February 1947.
- baovanhoa.vn, "Điện Cần Chánh đang được tu bổ, phục hồi như thế nào?" (208499): restored in the decorative style of
  the Khải Định years; frame, roof, board walls (vách ván), board doors, liên ba and glazed-panel doors (cửa pano
  kính) in lim; frame, roof and board walls sơn son thếp vàng; front hall 7 bays, its eave 9 bays.
- baovanhoa.vn (search summary of the project brief): roof of ngói ống and ngói liệt hoàng lưu ly (yellow glazed
  cylinder and flat tiles); bờ nóc, bờ quyết, ô hộc and figures inlaid with sành sứ; pháp lam on the front roof;
  brick (gạch chỉ) roof ridges and cổ diêm wall.
- dtinews.dantri.com.vn/print/20260310141329875.htm (10 Mar 2026): main columns up to 9.4 m long, over 2,000 m³ of
  timber, yellow glazed tiles, lacquer, gilding and ceramic mosaic on ridges and facade.
- baovanhoa.vn "Di tích điện Cần Chánh dần hiện rõ giữa Tử Cấm thành" (17 Aug 2026): 90 lim columns, 80 in the main
  building and 10 under the mái lưa (9 bays).
- nhandan.vn/hoi-sinh-cung-dien-co-o-hoang-thanh-hue-post999454.html: over 1,400 m², 90 columns; completion planned
  for 23 Nov 2027. vov.vn (20 Aug 2026) and khamphahue.com.vn (9 Mar 2026): foundation, target 2028.
- tuoitre.vn (31 Aug 2026): finish to be red lacquer and gilt.

## Confirmed
- The plan type matches Thái Hòa (trùng thiềm điệp ốc), with the same bay counts; 90 columns (80 + 10 mái lưa).
- The outline and the three front flights come from OSM.
- Yellow glazed tile roofs, enamelled/ceramic ridge work, red lacquer and gilt, board walls, glazed-panel doors.

## Estimated
- **Column grid:** Thái Hòa's bay proportions scaled to a 41 m span. Depth rows fitted to the 35.3 m platform; the
  mái lưa row 1.6 m inside the back edge, its columns 2.95 m tall.
- **Heights:** floor 1.15 m above the ground, 0.93 m above the court. Outer columns, skirt and front roof and the
  cổ diêm copied from Thái Hòa. The upper roof is 3.2 m high (Thái Hòa 2.85) for the 9.4 m main columns: ridge
  11.15 m above the ground, ridge disc top 12.2 m. Proposed entry: `scratch/heights-canchanh.json` (not yet merged
  into `docs/heights-reference.json`).
- **Roofs:** front hall and main-hall skirt as hip roofs over the full span (valley gutter from `S.joined`); upper
  hip roof over the tall columns; the mái lưa a hipped lean-to tucked under the skirt's back eave.
- **Ridge ornament:** a gilt flaming disc between two dragons (lưỡng long chầu nhật) on the main ridge, and a row of
  enamelled ô hộc on the front ridge, as at Thái Hòa. The exact pre-1947 motifs are not described in the sources
  read; photos on the site's fence panels were not checked.
- **Walls and doors:** the 7 middle front bays are door leaves with glazed upper panels and gilt transoms; the end
  chái and the gables are red-lacquered board walls with gilt rails; the 5 middle back bays are doors.
- **Steps:** 5 steps each, about 2 m run. The OSM ways are 2.1 m long.
- **Court:** paving raised 0.22 m, with a central ngự đạo and kerbs on the open sides, up to Đại Cung Môn's
  foundation at v ≈ 46 m. Red-brown brick with a pale blue-grey stone ngự đạo, as a 2026 Street View user photosphere
  from the platform's front edge shows the court today. That photo suggests a ngự đạo about 3 m wide (scaled from a
  walker; rough); the model keeps 3.6 m.
- **Not drawn:** the galleries to Văn Minh, Võ Hiển and the Vu halls (their extent is unmapped); back and side steps
  (not mapped); the interior (throne, paintings).
- The place label in `hue.json` is still "Nền điện Cần Chánh" (foundation); it comes from the data build, not this file.

## Google alignment check (Nov 2026)
- Satellite (z19, z20, north up) with the model rendered at the same centre and m/px: the OSM platform outline sits on
  the pale concrete slab of today's foundation to within about 1 m at all four corners, and its axis matches to within
  about 1°. The galleries, Tả Vu, Hữu Vu and Thái Hòa line up as well. No change to the anchor or frame.
- No Google car imagery inside Tử Cấm Thành; all Street View there is user photospheres, which show the site under
  restoration (no hall), so the hall's massing is unchanged from the documented sources above.

## Polish (Nov 2026)
Court brick darkened to #74625a and the ngự đạo made blue-grey (#a3a9a8) and 3.3 m wide, following sv-center-s. The hall itself has no photographic reference (site under restoration) and is unchanged.
