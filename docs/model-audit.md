# 3D Model Visual Audit & Grading Report

- **Audited revision**: `origin/main` (`30f1b3f`, 2026-11-23)
- **Scope**: All **83 places** in `public/data/places.json`
- **Method**: Each model was rendered in the realistic look (`?look=real&still`, afternoon light) from 4 standardized camera angles (**SE Oblique**, **NW Oblique**, **Low SW street-level**, and **Top North-up**) and compared side-by-side against **Google Maps Satellite View** (`z=16–19`, North-up, centered on exact projected coordinates) and **Street View / real-world photographic references**.
- **Historical-completeness note**: Per `PROGRESS.md`, lost or under-reconstruction Imperial City structures (`canchanh`, `thaimieu`, Đại Cung Môn in `dainoi`, and Đức Hinh Lâu in `thieutri`) are intentionally drawn complete as they stood historically rather than as today's empty foundations or construction sites. Those models are graded on historical accuracy and 3D craftsmanship rather than penalized for not showing ruins.

## Grading Rubric (0–10)

| Score | Meaning |
|---:|---|
| **9.0–10.0** | Near-perfect visualization — accurate footprint, orientation, proportions, roof geometry, colors/materials, and signature details; zero visual bugs. |
| **7.0–8.5** | Good to strong — clearly recognizable from both satellite and street level; minor simplifications, slight color/proportion mismatches, or small visual blemishes. |
| **5.0–6.5** | Mixed / passable — general footprint or massing is recognizable, but misses major architectural features, uses wrong roofs/colors, or has noticeable visual bugs. |
| **3.0–4.5** | Poor — generic placeholder box, heavily inaccurate shape/scale/context, or major visual bugs. |
| **0.0–2.5** | Terrible — resembles nothing like the real place, missing/empty, or severely broken. |

---

## Executive Summary

- **Mean score**: **6.90 / 10** | **Median**: **7.5 / 10** | **Range**: **1.5 – 8.5 / 10**
- **Tier breakdown (83 models)**:
  - **9.0–10.0**: 0 models (0.0%)
  - **8.0–8.5**: 26 models (31.3%) — 14 at `8.5`, 12 at `8.0`
  - **7.0–7.5**: 29 models (34.9%) — 16 at `7.5`, 13 at `7.0`
  - **5.0–6.5**: 21 models (25.3%) — 7 at `6.5`, 4 at `6.0`, 8 at `5.5`, 2 at `5.0`
  - **3.0–4.5**: 4 models (4.8%) — 4 at `4.5`
  - **0.0–2.5**: 3 models (3.6%) — 2 at `2.0`, 1 at `1.5`

### Systemic Issues Across the City

1. **6 of 10 Citadel Gates use the wrong watchtower (*vọng lâu*)**: While **Cửa Hậu, Cửa Chánh Tây, Cửa Hữu, and Cửa Ngăn** have authentic 2-tier weathered masonry *vọng lâu* with arched bays and clay tiles (`8.0–8.5/10`), the other 6 gates (**Cửa Quảng Đức, Cửa Thượng Tứ, Cửa An Hòa, Cửa Nhà Đồ, Cửa Đông Ba, Cửa Kẻ Trài**) fall back to a generic bright-red wooden imperial pavilion with shiny yellow roofs (`4.5–5.5/10`).
2. **All 3 craft villages lack custom models**: `thuyxuan` (`1.5/10`), `phuongduc` (`2.0/10`), and `sinh` (`2.0/10`) have no `src/landmarks/places/<slug>.js` builders — `thuyxuan` has only two generic shacks on a bare road with zero incense bouquets, and `phuongduc` / `sinh` are purely generic procedural housing.
3. **Severe geometry / clipping bugs in key landmarks**:
   - **Duyệt Thị Đường (`duyetthi`, 5.5/10)**: Green-roofed *trường lang* corridor slices straight through the SW roof slope.
   - **Quan Tượng Đài (`quantuong`, 6.0/10)**: Citadel bastion earthwork half-buries the brick base on the S/SE/SW sides and drops into a sheer sunken pit on the N/NW side.
   - **Lăng Tự Đức (`tuduc`, 6.5/10)**: Bi Đình (Stele Pavilion) is missing its roof completely (appears as an open dark box).
   - **Cầu Dã Viên (`bachho`, 7.0/10)**: Golden viewing pavilions overhang/appear detached over open water without flush widened sidewalk balconies or supporting piers.
   - **Cửa Kẻ Trài (`4.5/10`)** & **Lăng Khải Định (`7.5/10`)**: Trees clip directly into the Citadel rampart (`Cửa Kẻ Trài`) and grow out of the front asphalt road (`khaidinh`).
   - **Thái Miếu (`7.5/10`)**: Front courtyard paving clips under the lawn into jagged triangles.
   - **Lăng Minh Mạng (`7.5/10`)**: Darker water seam rectangle under the three bridges clashes with Trừng Minh Lake.
   - **Chùa Từ Đàm (`7.5/10`)**: East annex clips right through the perimeter wall.
   - **Điện Cần Chánh (`8.0/10`)**: NE flanking green corridor clips into the corner eave.
4. **Stray generic OSM / procedural buildings inside historic compounds**: Visible at **Ga Huế** (3 generic buildings in the front parking plaza), **Tàng Thư Lâu** (grey concrete box on the historic island), **Bảo tàng Cổ vật Cung đình** (large grey flat-roofed block right behind Điện Long An), **Cung An Định** (2 modern warehouse boxes flanking the rear garden), **Chùa Diệu Đế** (OSM buildings clipping the yellow perimeter wall), and **AEON MALL Huế** (procedural houses crowding the curved NW entrance plaza).
5. **Roof & facade color inaccuracies**: Overuse of shiny bright imperial yellow (*hoàng lưu ly*) roofs on landmarks that actually have green glazed tiles (**Cung Trường Sanh**), terracotta clay tiles (**Quốc Tử Giám, Điện Long An, Lầu Tứ Phương Vô Sự, Lăng Tự Đức, Minh Lâu at Lăng Minh Mạng**), or muted weathered roofs (**Duyệt Thị Đường**). Notable facade color misses: **Điện Kiến Trung** (plain yellow instead of vermilion-red & cream), **Ga Huế** (bright red instead of pastel dusty-pink), **Trung tâm Điềm Phùng Thị** (yellow instead of white), **Hổ Quyền** (reddish-brown instead of dark weathered charcoal-grey), and **Bia Quốc Học** (bright yellow instead of weathered charcoal stone).
6. **Under-represented tree canopy & urban density**: Compared to Google Satellite, **Đại Nội, Kinh Thành, Phố Tây, Cồn Hến, Cồn Dã Viên, Hồ Tịnh Tâm, Đàn Nam Giao, Đồi Vọng Cảnh, and Núi Ngự Bình** have noticeably sparser tree cover (and in `ngubinh`, `dieude`, `tudam`, `themieu`, crude low-poly geometric/cone trees clash with the scene's standard foliage).

---

## Complete Master Scorecard (All 83 Models)

| # | ID | Name | Kind | Grade | Primary Issue / Highlight |
|---:|---|---|---|---:|---|
| 1 | `truongtien` | Cầu Trường Tiền | bridge | **8.5** | Faithful 6-span steel trusses; darken/lighten deck & add pier walkway flares |
| 2 | `dongba` | Chợ Đông Ba | market | **6.0** | Flat-grey hollow-donut roof instead of multi-bay green pitched/clerestory roofs |
| 3 | `kydai` | Kỳ Đài | monument | **8.5** | Accurate 3-tier bastion & flag; shift warm brown brick to weathered dark grey |
| 4 | `ngomon` | Ngọ Môn | monument | **8.5** | Detailed 9-roof Lầu Ngũ Phụng & 5 passages; upgrade Đại Triều Nghi bridgehead arch |
| 5 | `thaihoa` | Điện Thái Hòa | monument | **8.0** | Strong double-roof & courtyard; missing whitewashed masonry end walls on front |
| 6 | `dainoi` | Hoàng thành · Đại Nội | area | **8.0** | Cohesive imperial masterplan; lawns too bare vs lush satellite tree canopy |
| 7 | `kinhthanh` | Kinh thành Huế | area | **7.0** | Accurate walls/moats/canals; residential blocks too sparse vs satellite |
| 8 | `phuvanlau` | Phu Văn Lâu | monument | **7.0** | Missing raised stone plinth; stele pavilion sits ~35m too close |
| 9 | `tinhtam` | Hồ Tịnh Tâm | water | **7.5** | Accurate islands/causeway/lotus; Đảo Bồng Lai too bare vs wooded satellite |
| 10 | `phuxuan` | Cầu Phú Xuân | bridge | **8.5** | Clean, accurate 4-lane girder bridge & piers; polish railings/markings |
| 11 | `quochoc` | Trường Quốc Học | place | **7.5** | Iconic crimson-red colonial blocks; missing SE football field & blue pool |
| 12 | `gahue` | Ga Huế | place | **6.5** | 3 misplaced generic buildings in front plaza; bright red instead of pastel pink |
| 13 | `andinh` | Cung An Định | monument | **7.5** | Faithful Khải Tịnh Pavilion; 2 jarring modern warehouse boxes flank rear garden |
| 14 | `bachho` | Cầu Dã Viên / Bạch Hổ | bridge | **7.0** | Good railway trusses; Cầu Dã Viên golden pavilions overhang/detach over water |
| 15 | `giahoi` | Cầu Gia Hội | bridge | **6.5** | Exaggerated hump profile; deck-to-road junction seams & abrupt railings |
| 16 | `vincom` | Vincom Plaza Huế | place | **7.0** | Good chamfered podium; missing slanted glass tower crown & pilasters too dark |
| 17 | `benxenam` | Bến xe phía Nam | place | **4.5** | Generic flat-roof yellow box on unpaved grass; missing terracotta roof & bus yard |
| 18 | `aeon` | AEON MALL Huế | place | **7.5** | Great curved facade & rooftop solar; procedural houses crowd NW entrance |
| 19 | `benxebac` | Bến xe phía Bắc | place | **4.5** | Generic flat-roof yellow box on grass; missing red roof, teal L-wing & apron |
| 20 | `phucam` | Nhà thờ Phủ Cam | place | **8.0** | Iconic modernist twin towers & parabolic front; harsh striped roof texture |
| 21 | `nghenhluong` | Nghênh Lương Đình | monument | **8.0** | Faithful 3-part pavilion & river dock; awkward narrow dock plank extension |
| 22 | `themieu` | Thế Miếu | monument | **8.5** | Complete compound with Hiển Lâm Các & Cửu Đỉnh; jarring cone/purple courtyard trees |
| 23 | `hungmieu` | Hưng Miếu | monument | **8.0** | Accurate double-roof & gates; side masonry walls should be whitewashed, not red |
| 24 | `thaimieu` | Thái Miếu | monument | **7.5** | Strong historical hall on exact foundation; front courtyard paving clips under grass |
| 25 | `trieumieu` | Triệu Miếu | monument | **8.0** | Accurate form & colors; blocky stone texture on side walls & sparse trees |
| 26 | `dientho` | Cung Diên Thọ | monument | **8.5** | Rich multi-building compound incl. Tịnh Minh Lâu; minor corridor eave overlaps |
| 27 | `truongsanh` | Cung Trường Sanh | monument | **7.0** | Great island/moat/bridges; wrong roof color (yellow instead of green tiles) |
| 28 | `duyetthi` | Duyệt Thị Đường | monument | **5.5** | **Severe clipping**: green corridor slices through roof; wrong red/yellow colors |
| 29 | `kientrung` | Điện Kiến Trung | monument | **7.0** | Good 13-bay massing & gardens; plain yellow facade instead of vermilion-red & cream |
| 30 | `canchanh` | Điện Cần Chánh | monument | **8.0** | Strong historical reconstruction; NE green corridor clips into corner eave |
| 31 | `hiennhon` | Cửa Hiển Nhơn | gate | **7.5** | Recognizable 3-arch twin-tier gate; roofs too tall/gold, lacks rich ceramic mosaic |
| 32 | `chuongduc` | Cửa Chương Đức | gate | **7.0** | Same overly tall gold roofs; foreground willow completely blocks SW street view |
| 33 | `tuphuong` | Lầu Tứ Phương Vô Sự | monument | **7.5** | Spot-on bastion & 2-story form; shiny gold roof should be muted terracotta |
| 34 | `quoctugiam` | Quốc Tử Giám | monument | **6.0** | Shiny gold roofs instead of clay; solid walled gate instead of 4-pillar *trụ biểu* |
| 35 | `baotangcovat` | Bảo tàng Cổ vật Cung đình | place | **6.5** | Ugly generic grey OSM block dominates NW side; gold roof instead of terracotta |
| 36 | `tangthulau` | Tàng Thư Lâu | monument | **7.5** | Great restored hall & island; stray generic grey OSM box sits right on island |
| 37 | `xatac` | Đàn Xã Tắc | monument | **8.0** | Spot-on 2-tier geometry & red/yellow railings; grass top misses ritual paving |
| 38 | `mangca` | Trấn Bình Đài · Mang Cá | monument | **5.5** | Undersized dark shack gatehouse; SW road dead-ends abruptly into solid wall |
| 39 | `thuyquan` | Đông Thành Thủy Quan | monument | **7.0** | Good vaulted masonry water gate; road pinch/gap at rampart join, no sluice bars |
| 40 | `dieude` | Chùa Diệu Đế | place | **6.5** | Crude low-poly geometric trees; generic OSM buildings clip perimeter wall |
| 41 | `dcct` | Nhà thờ Dòng Chúa Cứu Thế | place | **8.5** | Faithful 53m octagonal crossing tower & plan; brighten walls & terracotta roof |
| 42 | `hienlam` | Hiển Lâm Các | monument | **8.5** | Clean 3-tier pavilion with Cửu Đỉnh; missing top *pháp lam* gourd finial |
| 43 | `tudam` | Chùa Từ Đàm | place | **7.5** | Great 7-tier stupa & compound; east annex clips perimeter wall, crude trees |
| 44 | `baoquoc` | Chùa Báo Quốc | place | **5.5** | Missing iconic weathered triple-arch Tam Quan gate; blank yellow exterior walls |
| 45 | `baotanghcm` | Bảo tàng Hồ Chí Minh | place | **8.0** | Accurate rotated diamond plan & 2-tier roof; misaligned white hip-ridge bars |
| 46 | `thuongbac` | Thương Bạc | monument | **7.5** | Clean pavilion; wrong rectangular twin-pond/4-pillar deck vs semicircular terrace |
| 47 | `hoquyen` | Hổ Quyền | monument | **8.0** | Faithful circular arena & royal stand; brick too reddish-brown, roads crowd wall |
| 48 | `diemphungthi` | Trung tâm Nghệ thuật Điềm Phùng Thị | place | **7.5** | Great colonial villa & sculpture garden; painted yellow instead of white |
| 49 | `quantuong` | Quan Tượng Đài | monument | **6.0** | **Severe clipping**: bastion earthwork half-buries base & leaves sheer sunken pit |
| 50 | `tayloc` | Chợ Tây Lộc | market | **7.0** | Accurate horseshoe red hall & sign; awkward curved roof junction & plain center block |
| 51 | `ancuu` | Chợ An Cựu | market | **7.0** | Accurate footprint & stalls; dark solid clerestory walls & recessed roof pits |
| 52 | `benngu` | Chợ Bến Ngự | market | **7.5** | Great 4-bay multi-gable plan & signboard; flat-shaded untextured grey roofs |
| 53 | `thuyxuan` | Làng hương Thủy Xuân | craft | **1.5** | **Nearly empty**: only 2 tiny shacks, zero incense bouquets or village streetscape |
| 54 | `phuongduc` | Làng đúc đồng Phường Đúc | craft | **2.0** | **No custom model**: generic procedural houses only, zero bronze foundry workshops |
| 55 | `sinh` | Làng tranh Sình | craft | **2.0** | **No custom model**: generic procedural houses only, missing craft house & paddies |
| 56 | `tuduc` | Lăng Tự Đức | monument | **6.5** | **Missing roof on Bi Đình**; palace roofs too bright yellow; canal-like lake |
| 57 | `dongkhanh` | Lăng Đồng Khánh | monument | **6.5** | Good compound layout; sawtooth road-to-pond shoreline clipping & faceted hills |
| 58 | `thieutri` | Lăng Thiệu Trị | monument | **8.0** | Accurate dual-axis layout & 3 bridges; minor bridge-to-bank abutment polish |
| 59 | `minhmang` | Lăng Minh Mạng | monument | **7.5** | Spot-on axial symmetry; dark water seam under 3 bridges & bare Minh Lâu terrace |
| 60 | `khaidinh` | Lăng Khải Định | monument | **7.5** | Recognizable hillside tiers; tree grows out of front road & X-stripe roof artifacts |
| 61 | `namgiao` | Đàn Nam Giao | monument | **8.5** | Crisp 3-tier red/yellow/blue concentric altar; missing interior pine groves |
| 62 | `thuytien` | Hồ Thủy Tiên | water | **7.0** | Lake, slides & distant dragon island present; trees clip slides, off-center framing |
| 63 | `thienan` | Đan viện Thiên An | monument | **5.0** | Missing iconic Asian-style bell tower & curved eaves; poor framing & dark stripes |
| 64 | `vongcanh` | Đồi Vọng Cảnh | place | **6.5** | Good river bend & historic bunkers; sparse pines & jagged stepped footpaths |
| 65 | `ngubinh` | Núi Ngự Bình | place | **5.5** | Clashing chunky cone trees on summit & bald brown patch; needs dense pine cover |
| 66 | `biaquochoc` | Bia Quốc Học | monument | **6.0** | Overly bright yellow, flanking pillars squeezed too close, blocky tree blocks SW |
| 67 | `golim` | Cầu gỗ lim | bridge | **7.0** | Accurate 400m boardwalk alignment; golden-bronze railings too faint & bare park |
| 68 | `thienmu` | Chùa Thiên Mụ | monument | **8.5** | Excellent complex layout & 7-tier pagoda; minor stair/road edge & sparse trees |
| 69 | `ndchieu` | Phố đi bộ Nguyễn Đình Chiểu | place | **7.5** | Lively riverside promenade & stalls; generic apartment blocks inside park |
| 70 | `nguyenhoang` | Cầu Nguyễn Hoàng | bridge | **8.5** | Great golden arches & parasol lamps; add outward-bowed pedestrian balconies |
| 71 | `photay` | Phố Tây | place | **4.5** | Sparse generic boxes on grass + intrusive 12-story tower; zero walking-street feel |
| 72 | `conhen` | Cồn Hến | island | **7.0** | Good island silhouette, boats & bridge; bare brown banks lack lush green tree belt |
| 73 | `daVien` | Cồn Dã Viên | island | **7.5** | Accurate island paths, bridges & water tower; sparse tree canopy vs satellite |
| 74 | `gate:Cửa Quảng Đức` | Cửa Quảng Đức | gate | **5.5** | Open arch ok; wrong red/yellow wooden pavilion instead of 2-tier masonry *vọng lâu* |
| 75 | `gate:Cửa Thượng Tứ` | Cửa Thượng Tứ | gate | **5.0** | Directly contradicted by photo: red/yellow pagoda instead of cream masonry *vọng lâu* |
| 76 | `gate:Cửa Hậu` | Cửa Hậu | gate | **8.5** | Authentic 2-tier masonry *vọng lâu* & open arch; lighten stone & bridge railings |
| 77 | `gate:Cửa An Hòa` | Cửa An Hòa | gate | **5.5** | Open arch ok; wrong red/yellow wooden pavilion instead of 2-tier masonry *vọng lâu* |
| 78 | `gate:Cửa Chánh Tây` | Cửa Chánh Tây | gate | **8.0** | Authentic cream 2-tier masonry *vọng lâu*; refine slightly boxy upper roof eaves |
| 79 | `gate:Cửa Hữu` | Cửa Hữu | gate | **8.5** | Authentic 2-tier masonry *vọng lâu* & open arch; add subtle weathering |
| 80 | `gate:Cửa Nhà Đồ` | Cửa Nhà Đồ | gate | **5.5** | Open arch ok; wrong red/yellow wooden pavilion instead of 2-tier masonry *vọng lâu* |
| 81 | `gate:Cửa Ngăn` | Cửa Ngăn | gate | **8.5** | Authentic 2-tier masonry *vọng lâu* & arched bridge; tone down orange-red brick |
| 82 | `gate:Cửa Đông Ba` | Cửa Đông Ba | gate | **5.5** | Open arch ok; wrong red/yellow wooden pavilion instead of 2-tier masonry *vọng lâu* |
| 83 | `gate:Cửa Kẻ Trài` | Cửa Kẻ Trài | gate | **4.5** | Wrong red/yellow pavilion + purple tree clips into rampart + abrupt rampart stub |

---

## Priority Fix Queue (Models Graded ≤ 6.5/10)

| Priority | Grade | Model(s) | Recommended Action |
|---|---:|---|---|
| **P0 — Missing** | 1.5–2.0 | `thuyxuan`, `phuongduc`, `sinh` | Build custom craft-village streetscapes (incense bouquets, bronze foundries, folk-print *nhà rường* + paddies) |
| **P0 — Severe Bugs** | 4.5–6.5 | `duyetthi`, `quantuong`, `tuduc`, `gate:Cửa Kẻ Trài` | Fix corridor slicing through Duyệt Thị Đường roof; fix Quan Tượng Đài bastion burial/pit; add missing roof to Tự Đức Bi Đình; fix Cửa Kẻ Trài tree-in-wall & rampart stub |
| **P1 — Generic / Wrong Type** | 4.5–5.5 | `benxenam`, `benxebac`, `photay`, `thienan`, `baoquoc`, `mangca`, 6 Citadel gates | Pave bus depots & add pitched/teal roofs; densify Phố Tây shophouses; add Thiên An bell tower, Báo Quốc Tam Quan, full-scale Mang Cá gate; upgrade 6 Citadel gates to 2-tier masonry *vọng lâu* |
| **P2 — Major Accuracy / Context** | 5.5–6.5 | `dongba`, `gahue`, `quoctugiam`, `baotangcovat`, `dieude`, `biaquochoc`, `ngubinh`, `giahoi`, `dongkhanh`, `vongcanh` | Fix Đông Ba central roof; remove stray OSM boxes at Ga Huế/Long An/Diệu Đế; fix Ga Huế pink color & Bia Quốc Học stone color/pillar spacing; fix Quốc Tử Giám 4-pillar gate; fix Đồng Khánh sawtooth pond road & Ngự Bình cone trees |

---

## Detailed Per-Model Audit (#1–#83)

### 1. Cầu Trường Tiền (`truongtien`) — **8.5/10**
- **Satellite comparison**: Exact NW–SE orientation, length, 6-span / 5-pier rhythm, and riverbank approaches match Google Satellite closely.
- **Street/Photo comparison**: Iconic 6-span silver-grey comb-shaped steel arch trusses and masonry piers are immediately recognizable and well-proportioned. Road deck reads slightly too dark/brownish compared to grey asphalt, and pedestrian railing latticework is simplified.
- **Visual bugs**: None observed (clean pier-to-water and span-to-span junctions).
- **Top fix**: Add subtle cantilevered walkway railings/balcony flares at the piers and brighten the road deck to grey asphalt with lane markings.

### 2. Chợ Đông Ba (`dongba`) — **6.0/10**
- **Satellite comparison**: Placement, Trần Hưng Đạo alignment, and red-tiled front portico match Google Satellite. However, satellite shows the central market hall covered by parallel green-teal pitched/clerestory metal roofs, whereas 3D depicts a 2-story hollow rectangular donut with a flat grey roof.
- **Street/Photo comparison**: Front "CHỢ ĐÔNG BA" entrance sign with colorful flags matches the photo nicely, but behind it the central block looks like a generic institutional box and the surrounding corrugated roofs look muddy/striped.
- **Visual bugs**: Muddy striped corrugated roof texture and speckled cornice artifact on the central building; a stray thin beige beam cuts across the eastern roof in Top view.
- **Top fix**: Replace the flat-grey hollow-donut central roof with multi-bay green-teal pitched/clerestory roofs and clean up the corrugated roof texture.

### 3. Kỳ Đài (`kydai`) — **8.5/10**
- **Satellite comparison**: Orientation, 3-tiered stepped bastion footprint, rear staircase, flagpole location, and moat alignment match Google Satellite accurately.
- **Street/Photo comparison**: Proportions of the three tiers, crenellated white parapets, flanking top-tier guard pavilions, cannons, and Vietnamese flag are faithful. Palette leans too warm terracotta-brown compared to weathered dark grey-charcoal brick/stone.
- **Visual bugs**: Minor — one small tree sits right against the rear lower wall/staircase base.
- **Top fix**: Shift terrace paving and brick wall tones from warm terracotta-brown to weathered dark grey brick/stone.

### 4. Ngọ Môn (`ngomon`) — **8.5/10**
- **Satellite comparison**: U-shaped brick platform, 5 portals, 9-roof Lầu Ngũ Phụng (yellow center, green wings), Thái Dịch pond, and Trung Đạo bridge match Google Satellite closely. Front forecourt has 3 narrow arched bridges over an open moat rather than a broader paved forecourt with two flanking lotus ponds.
- **Street/Photo comparison**: Two-story Lầu Ngũ Phụng with red columns, yellow central roof, emerald wing roofs, upturned eaves, and brick base vents is unmistakably Ngọ Môn. The ornate three-bay Đại Triều Nghi archway at the Trung Đạo bridgehead is reduced to a tiny thin frame.
- **Visual bugs**: Minor roof-ridge specular noise and slightly jagged bright-yellow ridge intersections on the green wing roofs in Top view.
- **Top fix**: Upgrade the Trung Đạo bridgehead frame to the detailed three-bay ornamental Đại Triều Nghi archway and refine the front forecourt/ponds.

### 5. Điện Thái Hòa (`thaihoa`) — **8.0/10**
- **Satellite comparison**: Footprint, SE orientation, *trùng thiềm điệp ốc* double-eaved golden roof, two-tiered Đại Triều Nghi courtyard with rank steles, and surrounding corridors match Google Satellite accurately.
- **Street/Photo comparison**: Double-tiered golden roof silhouette and stepped terrace are accurate, but the reference photo prominently shows **whitewashed masonry end walls** flanking the red wooden front colonnade — in 3D the entire front and sides are solid red/yellow paneling.
- **Visual bugs**: High-contrast diagonal specular shimmer on the golden roof tile texture in Top view.
- **Top fix**: Add the signature whitewashed masonry end walls flanking the red wooden colonnade on the front facade.

### 6. Hoàng thành · Đại Nội (`dainoi`) — **8.0/10**
- **Satellite comparison**: Masterplan of Hoàng Thành and Tử Cấm Thành (including intentionally complete historical halls), green *trường lang* corridors, Kiến Trung Palace, moat, and walls align closely with Google Satellite. Vegetation is much sparser than satellite, leaving vast bare beige-olive lawns.
- **Street/Photo comparison**: Cohesive imperial architectural language (golden/green roofs, red columns, yellow walls) reads cleanly across the complex.
- **Visual bugs**: None observed at macro scale.
- **Top fix**: Increase mature tree density and formal garden hedges across the bare outer Hoàng Thành lawns and palace courtyards.

### 7. Kinh thành Huế (`kinhthanh`) — **7.0/10**
- **Satellite comparison**: Citadel walls, moats, street grid, Ngự Hà canal, and lakes match Google Satellite accurately. Residential blocks inside the citadel are far too sparse, with large bare beige patches between scattered small box houses.
- **Street/Photo comparison**: Citadel perimeter walls, gates, and water features read well at city scale, though sparse residential infill weakens realism.
- **Visual bugs**: None broken; primarily an urban density and greenery shortfall.
- **Top fix**: Increase residential building density and urban tree canopy inside the Kinh Thành residential blocks.

### 8. Phu Văn Lâu (`phuvanlau`) — **7.0/10**
- **Satellite comparison**: Main pavilion location and orientation match Google Satellite, but the SW stele pavilion (*nhà bia*) sits almost touching Phu Văn Lâu's eave instead of ~35 m SW down the lawn.
- **Street/Photo comparison**: Two-story open-ground silhouette with red columns and circular upper windows is recognizable, but misses the raised ~1.2 m grey stone plinth/stairs and uses overly bright yellow roofs with exaggeratedly upturned eaves.
- **Visual bugs**: Misplaced stele pavilion crowding the SW corner of the main pad; noisy specular streaks on yellow roofs.
- **Top fix**: Add the raised grey stone plinth with staircases, tone down the overly curved yellow eaves, and move the stele pavilion ~35 m SW.

### 9. Hồ Tịnh Tâm (`tinhtam`) — **7.5/10**
- **Satellite comparison**: Lake footprint, dividing causeway, Đảo Bồng Lai, Đảo Phương Trượng, northern island, wooden bridge, and lotus pads match Google Satellite accurately.
- **Street/Photo comparison**: Both satellite and photo show islands densely covered in mature trees and edged with low stone retaining walls/balustrades; in 3D Đảo Bồng Lai is a bare sandy pad with a tiny gazebo and 4–5 small trees.
- **Visual bugs**: None major.
- **Top fix**: Add low stone retaining walls/balustrades around the islands and dense mature tree canopy on Đảo Bồng Lai and Đảo Phương Trượng.

### 10. Cầu Phú Xuân (`phuxuan`) — **8.5/10**
- **Satellite comparison**: Exact NW–SE orientation, 4-lane straight deck with sidewalks, and pier spacing match Google Satellite accurately.
- **Street/Photo comparison**: Faithfully renders the real low-profile concrete girder bridge, simple piers, streetlamps, sidewalks, and railings.
- **Visual bugs**: None observed.
- **Top fix**: Add twin-column pier cap details/subtle deck haunches and sharper white guardrails + center lane markings.

### 11. Trường Quốc Học (`quochoc`) — **7.5/10**
- **Satellite comparison**: Orientation, long red French-colonial classroom wings, and central circular courtyard with statue match Google Satellite well. However, satellite shows a prominent **green football field** and **blue rectangular swimming pool** on the SE side, which are missing in 3D.
- **Street/Photo comparison**: Signature crimson-red walls, white arched arcade trim, and terracotta hipped roofs are spot-on. The iconic riverfront triple-arch gate is under-detailed.
- **Visual bugs**: Dark X-shaped roof intersection artifact on the central hall's crossing hip roofs in Top view.
- **Top fix**: Add the SE football field and blue swimming pool, thicken courtyard shade trees, and detail the iconic triple-arched riverfront gate.

### 12. Ga Huế (`gahue`) — **6.5/10**
- **Satellite comparison**: E–W track alignment, symmetrical station footprint, parking forecourt, and south green platform canopy match Google Satellite. However, **3 misplaced generic 3-story white box buildings sit inside the open front parking plaza** (absent on satellite).
- **Street/Photo comparison**: French-colonial massing and "GA HUẾ" canopy are recognizable, but **major color mismatch**: real Ga Huế is soft **pastel dusty-pink** with a grey-blue plinth, whereas 3D paints it bright crimson red with a flat grey central roof.
- **Visual bugs**: Three misplaced generic boxes obstructing the front parking plaza.
- **Top fix**: Remove the 3 misplaced buildings from the front plaza, repaint the facade pastel dusty-pink, and add the pitched central roof + clock pediment.

### 13. Cung An Định (`andinh`) — **7.5/10**
- **Satellite comparison**: An Cựu canal orientation, Khải Tịnh Pavilion, octagonal Đình Trung Lập, yellow wall, canal steps, and rear garden match Google Satellite well. However, **two huge modern flat-roofed warehouse boxes** flank the rear formal garden in NW Oblique (satellite shows a traditional tiled outbuilding and dense trees).
- **Street/Photo comparison**: Khải Tịnh Pavilion's ochre-yellow neoclassical facade, white pilasters/arches, 3-story center with 2-story wings, and dark hipped roof match the photo closely.
- **Visual bugs**: Two jarring modern flat-roofed warehouse buildings flanking the rear garden; sparse compound foliage.
- **Top fix**: Replace the two modern flat-roofed boxes flanking the rear garden with traditional tiled outbuildings and mature trees.

### 14. Cầu Dã Viên / Bạch Hổ (`bachho`) — **7.0/10**
- **Satellite comparison**: Exact NW–SE twin-bridge pairing — narrow steel-truss Cầu Bạch Hổ parallel to wider concrete Cầu Dã Viên with cantilevered viewing pavilions — matches Google Satellite.
- **Street/Photo comparison**: Cầu Bạch Hổ's silver-grey trapezoidal steel trusses match the photo well, and Cầu Dã Viên's golden viewing pavilions are immediately recognizable.
- **Visual bugs**: **Significant alignment/geometry bug** — Cầu Dã Viên's golden pavilions overhang the outer deck edge and appear detached over open water on tiny isolated pads without flush widened sidewalk balconies, railings, or supporting piers.
- **Top fix**: Integrate widened cantilevered viewing balconies (with railings and supporting piers) flush with Cầu Dã Viên's sidewalks beneath every pavilion.

### 15. Cầu Gia Hội (`giahoi`) — **6.5/10**
- **Satellite comparison**: Accurately spans the Đông Ba canal on a SW–NE diagonal, though approaches are straighter and more abrupt than the gentler NE curve on satellite.
- **Street/Photo comparison**: 3-span concrete bridge with sidewalks, railings, and lamps, but vertical arch/hump is exaggerated compared to the real low-profile concrete girder bridge.
- **Visual bugs**: Deck-to-road junction seams and misaligned lane markings at both bank ends; abrupt railing terminations; streetlamp pole sits awkwardly on the SW curb transition.
- **Top fix**: Flatten the exaggerated vertical camber and smoothly blend both approaches/sidewalks into the bank roads.

### 16. Vincom Plaza Huế (`vincom`) — **7.0/10**
- **Satellite comparison**: Placement, orientation, and chamfered podium footprint beside the Ngã 6 Hùng Vương roundabout match Google Satellite very well.
- **Street/Photo comparison**: Recognizable chamfered podium and banners, but podium pilasters read charcoal/black instead of cream-white, and the Meliá Vinpearl tower misses its signature **asymmetrical sloped/pitched glass crown** (reads as a flat-topped dark box).
- **Visual bugs**: Dark sliver clipping near the east podium edge facing the roundabout; overly dark podium pilasters.
- **Top fix**: Add the signature slanted glass crown to the Meliá Vinpearl tower and lighten podium pilasters/cornice to cream-white.

### 17. Bến xe phía Nam (`benxenam`) — **4.5/10**
- **Satellite comparison**: Right location off An Dương Vương with a rough loop road, but misses the massive paved bus apron, terracotta pitched-roof terminal, and long covered bus-bay sheds visible on satellite — the lot is mostly bare grass.
- **Street/Photo comparison**: Rendered as a flat-roofed bright yellow box with red trim looking like a generic ward office rather than the real bus terminal.
- **Visual bugs**: Internal loop road dead-ends into grass; entire bus yard is unpaved grass terrain.
- **Top fix**: Pave the bus parking yard, give the main terminal its terracotta pitched roof and cream facade, and add covered bus-boarding canopies.

### 18. AEON MALL Huế (`aeon`) — **7.5/10**
- **Satellite comparison**: Remarkably accurate footprint — sweeping curved NW facade ("Culture Stream"), boomerang SE inner courtyard, rooftop planters, and rooftop solar arrays closely mirror Google Satellite. Missing the huge exterior paved parking lots and solar-covered parking canopies.
- **Street/Photo comparison**: Captures the curved white fascia, dark glass curtain wall, magenta AEON signage, warm wood/terracotta louvers, and brick-toned lower facades convincingly.
- **Visual bugs**: Generic procedural residential houses crowd directly against the curved NW entrance plaza where the driveway/parking lot should be; minor jagged step where the curved parapet meets the louver wall.
- **Top fix**: Clear the misplaced procedural houses from the NW entrance parcel and add surrounding paved parking lots and solar-covered canopies.

### 19. Bến xe phía Bắc (`benxebac`) — **4.5/10**
- **Satellite comparison**: Lý Thái Tổ boulevard and Y-junction context match, but satellite shows a red-roofed main terminal flanked by a long L-shaped teal-green metal-roofed wing and large paved bus yard — 3D reduces this to a flat-roofed grey/yellow box on bare grass.
- **Street/Photo comparison**: Wrong roof form and colors (flat grey + bright yellow instead of red pitched roof + long teal-green wing); no paved depot apron.
- **Visual bugs**: Access road abruptly ends in grass; depot yard is unpaved grass.
- **Top fix**: Pave the bus yard, replace the flat grey roof with the red pitched terminal roof, and add the L-shaped teal-green eastern wing.

### 20. Nhà thờ Phủ Cam (`phucam`) — **8.0/10**
- **Satellite comparison**: Cruciform plan, NNW–SSE orientation, twin bell towers, stepped forecourt, polygonal apse, and neighboring U-shaped building align closely with Google Satellite.
- **Street/Photo comparison**: Instantly recognizable Ngô Viết Thụ modernist cathedral — tapered stone bell towers, parabolic "open Bible" front wings, central gable with cross and blue glazing, and ribbed side bays. Roof texture has overly loud orange/dark-brown vertical stripes.
- **Visual bugs**: Minor clipping/gap where curved front wings meet the inner tower faces and gable; harsh striped roof texture.
- **Top fix**: Smooth the high-contrast striped roof texture into uniform terracotta tiles and cleanly join the curved front wings to the towers.

### 21. Nghênh Lương Đình (`nghenhluong`) — **8.0/10**
- **Satellite comparison**: Spot-on Perfume River north-bank location, axial alignment with Phu Văn Lâu and Kỳ Đài, wide NW plaza, and stepped SE river dock. Flanking tree groves are much sparser than satellite.
- **Street/Photo comparison**: Accurately captures the 3-part pavilion silhouette (central 2-tier roof + lower side wings), red columns on stone plinth, and stepped dock. Roof tiles are slightly too bright/metallic gold.
- **Visual bugs**: Awkward narrow plank/catwalk jutting out from the stepped dock into the river; minor terrain-to-dock intersection along the riverbank edge.
- **Top fix**: Remove the awkward dock plank extension, clean up the bank-to-dock join, and add dense flanking plaza trees.

### 22. Thế Miếu (`themieu`) — **8.5/10**
- **Satellite comparison**: Excellent match — long NW–SE double-roof temple, wide SE courtyard, Hiển Lâm Các, Nine Dynastic Urns (*Cửu Đỉnh*) on axis, perimeter walls/gates, and Hưng Miếu behind.
- **Street/Photo comparison**: Faithful *trùng thiềm điệp ốc* silhouette, red colonnade, yellow glazed tiles, 3-tiered Hiển Lâm Các, and Cửu Đỉnh on stone pedestals.
- **Visual bugs**: Jarring low-poly bright-green cone pine and bright purple tree placed right inside the solemn paved courtyard.
- **Top fix**: Remove the out-of-place cone pine and purple trees from the courtyard and tone down roof specular streaking.

### 23. Hưng Miếu (`hungmieu`) — **8.0/10**
- **Satellite comparison**: Exact placement NW of Thế Miếu inside its walled enclosure, with accurate double-roof hall, brick courtyard, central walkway, and gates. Sparser greenery than satellite.
- **Street/Photo comparison**: Great double-roof silhouette, red front colonnade, bonsai pots, and gate, but real Hưng Miếu has **whitewashed plaster/masonry side end walls** rather than solid dark red side/rear walls.
- **Visual bugs**: None observed.
- **Top fix**: Change side/end masonry walls from red to whitewashed plaster and densify surrounding trees.

### 24. Thái Miếu (`thaimieu`) — **7.5/10** *(historically complete reconstruction)*
- **Satellite comparison**: Sits accurately on the exact rectangular foundation visible in Google Satellite, with walled enclosure, side pavilions (Tả/Hữu Tùng Tự), and alignment with Triệu Miếu.
- **Street/Photo comparison**: Matches historic photos well in grand *trùng thiềm điệp ốc* proportions, red colonnade, yellow roof, and stone plinth. Missing the row of large planters on stone pedestals along the front terrace; side walls look like rough yellow cinderblocks.
- **Visual bugs**: **Courtyard paving clips/sinks under the grass** in the SE forecourt, creating two jagged reddish-brown triangles flanking the central path.
- **Top fix**: Raise/flatten the front courtyard paving to eliminate the jagged clipping triangles and add the front terrace planters.

### 25. Triệu Miếu (`trieumieu`) — **8.0/10**
- **Satellite comparison**: Accurate square-ish double-roof footprint, orientation, placement behind Thái Miếu, and walled enclosure; sparser greenery than satellite.
- **Street/Photo comparison**: Good match in *trùng thiềm điệp ốc* form, yellow-ochre side walls, red wooden front, stone plinth, and front planters. Side walls use an overly blocky stone-brick texture instead of smooth pale-ochre plaster.
- **Visual bugs**: No major geometry bugs observed.
- **Top fix**: Replace the blocky stone-brick side wall texture with smooth pale-ochre plaster and densify surrounding garden trees.

### 26. Cung Diên Thọ (`dientho`) — **8.5/10**
- **Satellite comparison**: Outstanding multi-building compound accuracy — Điện Diên Thọ, 2-story colonial Tịnh Minh Lâu, green *trường lang* corridors, square pond with Tạ Trường Du, rear hall, and front screen all match satellite.
- **Street/Photo comparison**: Rich, cohesive palette contrasting yellow imperial halls, emerald corridors, and cream/terracotta Tịnh Minh Lâu. SE front courtyard has a stark grey curved path arc instead of the oval garden bed.
- **Visual bugs**: Minor roof-eave overlaps where green corridors meet the corners of yellow-roofed halls.
- **Top fix**: Clean up corridor-to-hall eave junctions and replace the stark grey front path arc with the oval garden bed and mature trees.

### 27. Cung Trường Sanh (`truongsanh`) — **7.0/10**
- **Satellite comparison**: Very faithful island-in-a-moat layout — rounded-corner island, rectangular moat, 3 arched bridges, perimeter walls/gates, central hall + wings, and SW rockeries/ponds.
- **Street/Photo comparison**: **Major color error** — all roofs are bright **yellow/gold** instead of the real **green glazed tiles (*thanh lưu ly*)** clearly seen in both photo and satellite; front walls miss the bright yellow plastered masonry bays with relief panels.
- **Visual bugs**: Slightly awkward double-wall alignment at the SE outer perimeter gate.
- **Top fix**: Change all palace roofs from yellow to green glazed tiles (*thanh lưu ly*) and add yellow plastered front wall bays.

### 28. Duyệt Thị Đường (`duyetthi`) — **5.5/10**
- **Satellite comparison**: Footprint, SW–NE orientation, adjacent green *trường lang* corridor, and reflection pond match Google Satellite.
- **Street/Photo comparison**: **Major color mismatch** — rendered with solid red walls and glossy yellow-gold roof instead of **pale yellow/cream plastered masonry walls**, projecting portico, and **muted grey-green/weathered terracotta roof**.
- **Visual bugs**: **Severe mesh clipping** — the green-roofed *trường lang* corridor slices straight into and through the SW roof slope of Duyệt Thị Đường.
- **Top fix**: Terminate the green corridor cleanly beside Duyệt Thị Đường without piercing its roof, and recolor to cream-yellow plaster walls with a muted weathered tile roof.

### 29. Điện Kiến Trung (`kientrung`) — **7.0/10**
- **Satellite comparison**: Footprint, NE–SW orientation, raised terrace, projecting bays, formal front garden beds, rear moat, and bridges match Google Satellite well. Front lawn pavilions use oversized square hipped roofs instead of smaller octagonal pavilions.
- **Street/Photo comparison**: Good 2-story, 13-bay proportions, but **wrong facade color** — painted flat ochre-yellow instead of the real restored palace's **vermilion-red pilasters/panels with cream-white balustrades and ornate ceramic-mosaic crests**.
- **Visual bugs**: Awkward intersecting hip/valley roof geometry in the center (Top view); plain boxy yellow side walls.
- **Top fix**: Repaint the facade to vermilion-red and cream-white and add ornate curved ceramic roof crests/pediments.

### 30. Điện Cần Chánh (`canchanh`) — **8.0/10** *(historically complete reconstruction)*
- **Satellite comparison**: Footprint and NE–SW orientation align accurately with the surviving rectangular stone foundation platform on Google Satellite, properly framed by *trường lang* corridors.
- **Street/Photo comparison**: Faithful historical *trùng thiềm điệp ốc* double-roofed hall with yellow glazed tiles, red-lacquered columns, stone terrace with 3 stairs, and forecourt bronze cauldron.
- **Visual bugs**: NE flanking green-roofed *trường lang* corridor clips directly into the corner eave of Điện Cần Chánh's front roof.
- **Top fix**: Pull back the flanking green *trường lang* corridors to eliminate roof-eave clipping and add imperial ridge ornaments.

### 31. Cửa Hiển Nhơn (`hiennhon`) — **7.5/10**
- **Satellite comparison**: Accurately positioned on the eastern Imperial City wall with approach aligned cleanly to the NE moat bridge.
- **Street/Photo comparison**: Recognizable 3-arch lower gate and 3-arch upper pavilion, but upper roofs are overly tall, swooping bright-gold pagoda roofs instead of compact terracotta tiled roofs with grey ceramic-scroll ridges, and facade lacks vivid golden-ochre/cobalt-blue *khảm sành sứ* mosaic.
- **Visual bugs**: None observed.
- **Top fix**: Compact the upper roof tiers with terracotta tiles and scroll ridges, and enrich the facade with ochre/blue ceramic mosaic detailing.

### 32. Cửa Chương Đức (`chuongduc`) — **7.0/10**
- **Satellite comparison**: Accurate placement on the western Imperial City wall with continuous western moat and NW bastion matching satellite.
- **Street/Photo comparison**: Mirrors Cửa Hiển Nhơn with the same overly tall bright-gold upper roofs and muted facade compared to the real vivid ochre/blue mosaic and terracotta roofs.
- **Visual bugs**: A large weeping willow stands directly in the Low SW sightline, completely blocking the street-level view.
- **Top fix**: Compact the upper roofs to terracotta-tiled ceramic-crested profiles, enrich mosaic colors, and adjust the willow blocking the SW approach.

### 33. Lầu Tứ Phương Vô Sự (`tuphuong`) — **7.5/10**
- **Satellite comparison**: Spot-on placement on the northern bastion (*Bắc Khuyết Đài*) matching moat, flanking bridges, and terrace layout.
- **Street/Photo comparison**: Accurate 2-story pavilion massing, upper wrap-around balcony, and stone bastion, but roof uses shiny gold tiles instead of muted weathered terracotta clay tiles (*ngói liệt*); terrace flowerbeds and tiny faceted trees look cartoonish.
- **Visual bugs**: Northern bridge path terminates awkwardly against the bastion wall/willow; minor stair/balustrade corner seam.
- **Top fix**: Recolor the roof to weathered terracotta clay tiles and replace the cartoonish red-circle flowerbeds and low-poly terrace trees.

### 34. Quốc Tử Giám (`quoctugiam`) — **6.0/10**
- **Satellite comparison**: Correct NW–SE axis, central Di Luân Đường, and flanking side halls, but adds a heavy walled front gate and bright gold roofs not matching satellite's open forecourt and dark clay roofs.
- **Street/Photo comparison**: Uses shiny imperial gold roofs instead of terracotta clay tiles, and a solid walled *tam quan* gate instead of the iconic open **4-pillar *trụ biểu* ceremonial gate** and wide brick forecourt.
- **Visual bugs**: Jarring pale-grey square ground patch around the front pavilion; tree stands directly on courtyard paving.
- **Top fix**: Switch roofs to weathered terracotta clay tiles, replace the heavy walled gate with the real 4-pillar *trụ biểu* entrance, and unify brick forecourt paving.

### 35. Bảo tàng Cổ vật Cung đình (`baotangcovat`) — **6.5/10**
- **Satellite comparison**: Điện Long An's footprint and NE–SW orientation match satellite, but generic modern flat-roofed grey concrete OSM buildings crowd immediately behind it on NW/NE (satellite shows red/green-roofed heritage museum wings).
- **Street/Photo comparison**: Nice *trùng thiềm điệp ốc* massing and dark *gỗ lim* wood facade, but roof is shiny gold instead of terracotta clay tiles, and the iconic circular forecourt with bronze cannons/cauldron is missing.
- **Visual bugs**: Massive ugly generic grey flat-roofed OSM block with colored stripes dominates the NW Oblique view right behind the historic palace.
- **Top fix**: Replace the ugly grey flat-roofed OSM block on the NW with a pitched-roof heritage wing, switch roof to terracotta tiles, and add the circular forecourt.

### 36. Tàng Thư Lâu (`tangthulau`) — **7.5/10**
- **Satellite comparison**: Footprint, NE–SW orientation, rectangular island in Hồ Học Hải, and SW stone bridge match Google Satellite closely, except for a **stray generic grey concrete OSM building sitting directly on the NW lawn of the island**.
- **Street/Photo comparison**: Very accurate restored Tàng Thư Lâu — 2-story ochre plastered masonry ground floor, upper colonnaded gallery with pale balustrade, exterior stair, and terracotta hipped roof.
- **Visual bugs**: Glaring stray generic grey concrete OSM building sitting on the historic island right next to the walkway.
- **Top fix**: Remove/exclude the stray grey concrete OSM building from the Tàng Thư Lâu island.

### 37. Đàn Xã Tắc (`xatac`) — **8.0/10**
- **Satellite comparison**: Spot-on concentric 2-tier square rotated to the Citadel grid with 4 axial staircases and walkways.
- **Street/Photo comparison**: Accurately captures the brick retaining walls, 4 axial stone stairs, red outer balustrade, and yellow inner balustrade. Upper tier surface is plain green grass instead of ritual brick / Five-Color (*Ngũ Hành*) altar paving.
- **Visual bugs**: Tall tree planted directly on/overlapping the NW axial stone walkway in front of the stairs.
- **Top fix**: Add ritual brick / Five-Color altar paving to the upper tier and relocate the tree encroaching on the NW walkway.

### 38. Trấn Bình Đài · Mang Cá (`mangca`) — **5.5/10**
- **Satellite comparison**: Vauban fortress moat, bastions, and Trấn Bình Kiều bridge are in the right general area, but the gatehouse (*Trấn Bình Môn*) is drastically undersized compared to the wide roofed barracks/gate structure on satellite.
- **Street/Photo comparison**: Real photo shows weathered grey-brown brick ramparts and a prominent wide 2-story colonnaded gate/barracks; 3D renders only a tiny dark 5-bay shack on a muddy wall block flanked by generic houses.
- **Visual bugs**: SW approach road dead-ends abruptly into the solid fortress wall without a clean pass-through; NE bridge connects at an awkward offset.
- **Top fix**: Rebuild Trấn Bình Môn to proper scale and weathered brick detail, and cleanly align the SW road, arched portal, and NE bridge.

### 39. Đông Thành Thủy Quan (`thuyquan`) — **7.0/10**
- **Satellite comparison**: Accurately spans Ngự Hà canal on the exact NW–SE alignment of the eastern Citadel wall.
- **Street/Photo comparison**: Surprisingly nice weathered brick bridge with stone-ringed semicircular water arch, gently arched deck, and stone-capped parapets with embrasure details, though missing the vertical sluice-gate bars (*cửa áp quan*) and bank side-arches.
- **Visual bugs**: Road abruptly pinches/kinks at the NW bridge abutment; Citadel wall rampart terminates with an awkward gap next to the bridge.
- **Top fix**: Seamlessly join bridge abutments into the Citadel ramparts on both banks and add vertical sluice-gate bars inside the central arch.

### 40. Chùa Diệu Đế (`dieude`) — **6.5/10**
- **Satellite comparison**: Correct SW orientation toward Đông Ba canal, accurate Điện Đại Hùng placement, courtyard, and flanking bell/drum pavilions. Sparser trees than satellite and intrusive OSM buildings along the perimeter.
- **Street/Photo comparison**: Good traditional *nhà rường* silhouette, terracotta tiles, yellow walls, and flanking pavilions; canal-side Tam Quan gate is under-detailed.
- **Visual bugs**: Extremely crude faceted low-poly polyhedral "ball-on-stick" trees throughout the courtyard; generic OSM buildings (blue-striped shed on SE, long grey block on NE) sit inside or clip directly through the yellow perimeter wall.
- **Top fix**: Replace the crude polyhedral courtyard trees with standard foliage and exclude/replace OSM buildings clipping the compound wall.

### 41. Nhà thờ Dòng Chúa Cứu Thế (`dcct`) — **8.5/10**
- **Satellite comparison**: Outstanding match — polygonal western apse, central octagonal crossing tower, long eastern nave, side chapels, and stepped eastern facade match Google Satellite precisely.
- **Street/Photo comparison**: One of the most faithful complex models in the set — nails the 1959 Vietnamese-Gothic fusion, 53 m octagonal terracotta-roofed spire, lancet windows, clerestory dormers, and corner turrets. Walls read slightly muddy grey instead of crisp white, roofs are dark brown-red rather than bright terracotta, and the east facade is slightly plain.
- **Visual bugs**: Tiny white ring artifact at the spire apex in Top view (minor).
- **Top fix**: Brighten walls to crisp white, brighten roof to orange-terracotta, and add louvered window/portico detail to the east facade.

### 42. Hiển Lâm Các (`hienlam`) — **8.5/10**
- **Satellite comparison**: Spot-on placement centered on the Thế Miếu courtyard axis, paired with the staggered row of Nine Dynastic Urns (*Cửu Đỉnh*) behind it, twin side gates, and stele pavilions.
- **Street/Photo comparison**: Captures the 3-story, 17 m memorial pavilion silhouette, red columns, 3 yellow glazed roof tiers, and stone base very well. Slightly simplified wing eaves and missing the iconic yellow *pháp lam* gourd finial (*bầu rượu*) atop the ridge.
- **Visual bugs**: None observed.
- **Top fix**: Add the yellow *pháp lam* gourd finial on the top ridge and refine wing eaves toward the *thập nhất trùng diên* profile.

### 43. Chùa Từ Đàm (`tudam`) — **7.5/10**
- **Satellite comparison**: Strong NNW–SSE compound layout — main hall, long eastern monastery hall, rear halls, courtyard, and 7-tier Tháp Ấn Tôn stupa in SW align well. However, a small east annex extends right through the eastern perimeter wall.
- **Street/Photo comparison**: Immediately recognizable 7-story octagonal stupa, multi-tiered curved roofs with white ridges, and Tam Quan gate. Stupa is slightly chunkier, roof tiles too bright orange-brown, and courtyard trees are crude low-poly cones/icosahedra.
- **Visual bugs**: East annex clips visibly through the perimeter wall; faceted low-poly courtyard trees; minor roof intersection between east hall and north wing.
- **Top fix**: Fix the eastern annex clipping through the perimeter wall and replace the faceted geometric courtyard trees.

### 44. Chùa Báo Quốc (`baoquoc`) — **5.5/10**
- **Satellite comparison**: Overall NE–SW orientation, approach plaza, main hall, rear cloister, NW wing, and SE stupa garden match reasonably well, but misses dense Hàm Long hill forest canopy and open rear cloister courtyard (*giếng trời*).
- **Street/Photo comparison**: Iconic mossy weathered dark-grey triple-arch **Tam Quan** gatehouse (prominent in photo) is reduced to tiny thin grey stubs; rear/SW walls are blank featureless bright mustard-yellow boxes.
- **Visual bugs**: Missing/undersized Tam Quan gatehouse; blank exterior walls; abrupt flat pink courtyard edges.
- **Top fix**: Model the iconic weathered dark-grey triple-arch Tam Quan gatehouse and add doors/windows/colonnade detail to the blank yellow walls.

### 45. Bảo tàng Hồ Chí Minh (`baotanghcm`) — **8.0/10**
- **Satellite comparison**: Very accurate 45°-rotated square footprint parallel to Lê Lợi street, matching the double-tiered pyramidal roof, paved plaza, and palm frontage.
- **Street/Photo comparison**: Faithfully captures the modern-traditional Huế building's white walls, tall recessed glazing, front portico, and double-tiered red-tiled pyramidal roof.
- **Visual bugs**: In Top view, white hip-ridge bars on the lower pyramidal roof are visibly misaligned/offset from the roof corners (pinwheel X); generic small blue-roofed shed on SW.
- **Top fix**: Align the white hip-ridge bars cleanly with the corners of the pyramidal roof.

### 46. Thương Bạc (`thuongbac`) — **7.5/10**
- **Satellite comparison**: Pavilion sits in the right spot in Công viên Thương Bạc, but satellite shows a **semicircular stone terrace** projecting toward the river rather than the 3D model's rectangular twin-pond water feature with 4 white pillars.
- **Street/Photo comparison**: Two-tiered yellow-roofed pavilion with red columns, octagonal lower tier, and raised balustrade terrace is cleanly rendered.
- **Visual bugs**: Inaccurate rectangular twin-pond/4-pillar riverside platform instead of the real semicircular terrace.
- **Top fix**: Replace the rectangular twin-pond/4-pillar platform with the accurate semicircular stone terrace facing the Perfume River.

### 47. Hổ Quyền (`hoquyen`) — **8.0/10**
- **Satellite comparison**: Excellent circular footprint, concentric ring walls, northern royal stand with twin staircases, and southern tiger cages; wide grey roads crowd the outer wall instead of dense foliage.
- **Street/Photo comparison**: Nails the arena architecture, frieze band, and tiger cage openings, but renders masonry in **warm reddish-brown** instead of the real dark weathered charcoal-grey/mossy stone.
- **Visual bugs**: Surrounding grey roads crowd/encroach against the outer apron and staircases; overly reddish-brown masonry color.
- **Top fix**: Recolor masonry to weathered dark charcoal-grey with light-grey coping, pull back encroaching roads, and densify trees.

### 48. Trung tâm Nghệ thuật Điềm Phùng Thị (`diemphungthi`) — **7.5/10**
- **Satellite comparison**: Accurate NW–SE rectangular villa footprint with wing, red hipped roof, and riverside park setting at 17 Lê Lợi; pathways and outdoor sculptures are a nice touch (missing NE circular plaza).
- **Street/Photo comparison**: Great 1940 French-colonial villa proportions, shutters, and balcony portico, but painted **bright yellow instead of white** (17 Lê Lợi is white; 25 Lê Lợi is yellow).
- **Visual bugs**: Wrong exterior wall color (yellow instead of white).
- **Top fix**: Repaint the villa's exterior walls from yellow to white/off-white.

### 49. Quan Tượng Đài (`quantuong`) — **6.0/10**
- **Satellite comparison**: Correctly placed on the angled SW bastion (*Nam Minh Đài*) with square observatory platform and north brick causeway, but bastion earthwork geometry clashes badly with the continuous terraced rampart on satellite.
- **Street/Photo comparison**: Bát Phong Lâu pavilion accurately features 2-tier green glazed tiles (*thanh lưu ly*), red columns, and stone balustrades.
- **Visual bugs**: **Severe terrain/bastion clipping** — flat green bastion rampart half-buries the brick base on the S/SE/SW sides while dropping into a sheer vertical-walled sunken pit on the N/NW side; a tree at the pit bottom clips into the brick causeway.
- **Top fix**: Fix the citadel bastion earthwork around Quan Tượng Đài so the masonry base stands cleanly above the terraced bastion without burial or a sunken pit.

### 50. Chợ Tây Lộc (`tayloc`) — **7.0/10**
- **Satellite comparison**: Accurately reproduces the rounded-corner horseshoe/L-shaped red-roofed hall, central yard, 2-story block, and parallel corrugated sheds.
- **Street/Photo comparison**: Great local market atmosphere with mixed roofs, stall awnings, umbrellas, and "CHỢ TÂY LỘC" signboard; 2-story central block is overly plain/boxy.
- **Visual bugs**: Awkward bulbous roof-ridge overlap where the curved section meets the straight wing on the red-roofed hall.
- **Top fix**: Smooth the curved-to-straight roof junction on the red hall and detail the plain 2-story central block.

### 51. Chợ An Cựu (`ancuu`) — **7.0/10**
- **Satellite comparison**: Accurate placement beside An Cựu canal and Hùng Vương street, matching the large corrugated main hall with clerestory monitor, 2-story west block, and stall arcades.
- **Street/Photo comparison**: Recognizable market massing, corrugated roofing, perimeter sheds, and umbrellas.
- **Visual bugs**: Clerestory monitor has solid dark brown/black walls instead of light louvered vents; 2-story west block roof has two odd recessed pits.
- **Top fix**: Replace dark solid clerestory walls with light louvered vents and add a prominent "CHỢ AN CỰU" sign facing Hùng Vương street.

### 52. Chợ Bến Ngự (`benngu`) — **7.5/10**
- **Satellite comparison**: Very accurate footprint at Phan Bội Châu / Phan Đình Phùng beside An Cựu canal, faithfully reproducing the 4-bay parallel multi-gable roof and side annex.
- **Street/Photo comparison**: Great neighborhood market feel with yellow walls, red "CHỢ BẾN NGỰ" signboard, canopy, and street-side tarp stalls.
- **Visual bugs**: Flat-shaded untextured grey roof planes lacking corrugated ribs or ridge/gutter trim.
- **Top fix**: Add corrugated metal texture and ridge/gutter trim to the flat-shaded grey multi-gable roofs.

### 53. Làng hương Thủy Xuân (`thuyxuan`) — **1.5/10**
- **Satellite comparison**: Almost completely empty — satellite shows Huyền Trân Công Chúa street tightly lined with village houses and craft courtyards, whereas 3D has only **two tiny generic shacks** on a barren road.
- **Street/Photo comparison**: Completely missing the world-famous vibrant fanned-out bouquets of colorful incense sticks (*bó hương*) and dense village shopfronts.
- **Visual bugs**: Essentially missing landmark.
- **Top fix**: Build traditional village shopfronts along both sides of Huyền Trân Công Chúa lined with vibrant fanned-out colorful incense stick bouquets and drying racks.

### 54. Làng đúc đồng Phường Đúc (`phuongduc`) — **2.0/10**
- **Satellite comparison**: Satellite shows a dense historic craft neighborhood with long foundry sheds along Bùi Thị Xuân; 3D shows only sparse generic procedural city houses.
- **Street/Photo comparison**: Zero bronze-casting foundry workshops, brick kilns/chimneys, or displays of bronze bells, gongs, and incense urns.
- **Visual bugs**: No custom landmark model at all.
- **Top fix**: Add custom open-sided bronze foundry sheds, brick kiln chimneys, and courtyard displays of bronze bells and urns.

### 55. Làng tranh Sình (`sinh`) — **2.0/10**
- **Satellite comparison**: Satellite shows a lush tree-shaded riverside village bordered by geometric rice paddies to the east; 3D shows only generic procedural urban blocks on bare tan ground.
- **Street/Photo comparison**: Missing traditional Huế *nhà rường* craft workshops, drying folk-print racks, and village communal house / wrestling yard (*sới vật Làng Sình*).
- **Visual bugs**: No custom landmark model; missing village canopy and eastern rice paddies.
- **Top fix**: Add a traditional *nhà rường* print workshop with drying racks, village communal house/wrestling yard, denser greenery, and eastern rice paddies.

### 56. Lăng Tự Đức (`tuduc`) — **6.5/10**
- **Satellite comparison**: Ambitious, recognizable masterplan — Lưu Khiêm lake, Xung Khiêm Tạ / Dũ Khiêm Tạ pavilions, Hòa Khiêm / Lương Khiêm / Minh Khiêm palace compound, Bái Đình, Bi Đình, and tomb axis. However, the lake is too narrow/canal-like and surrounding pines are overly sparse.
- **Street/Photo comparison**: Palace halls have **overly bright golden-yellow roofs** instead of Tự Đức's real weathered brown/terracotta tiles.
- **Visual bugs**: **Bi Đình (Stele Pavilion) is missing its roof completely** (renders as an open/flat-topped dark box in Top and NW Oblique).
- **Top fix**: Add the missing pyramidal tiled roof to Bi Đình, tone palace roofs down to weathered terracotta/brown, and widen Lưu Khiêm Lake with denser pines.

### 57. Lăng Đồng Khánh (`dongkhanh`) — **6.5/10**
- **Satellite comparison**: Worship compound (Ngưng Hy), circular SE pond, curving access road, and WNW burial axis match satellite well; small SW enclosure is missing and forest cover is sparse.
- **Street/Photo comparison**: Imperial yellow roofs, red columns, and multi-hall layout are recognizable, though entrance stairs/balustrades are simplified.
- **Visual bugs**: Serrated/sawtooth grey road triangles clip into the NW shoreline of the pond; harsh low-poly terrain faceting creases run across the hillside; generic modern beige 3-story house sits on the SE lake corner.
- **Top fix**: Fix the serrated road-to-pond shoreline clipping and smooth the faceted terrain mesh between worship and burial compounds.

### 58. Lăng Thiệu Trị (`thieutri`) — **8.0/10** *(Đức Hinh Lâu intentionally complete)*
- **Satellite comparison**: Dual-axis layout matches Google Satellite very accurately — SW Biểu Đức worship compound, curved Ngưng Thúy lake, NE burial axis, 3 parallel bridges, and circular Bửu Thành.
- **Street/Photo comparison**: Aligns well with historical aerials; complete Đức Hinh Lâu, yellow roofs, 3-bridge crossing, and circular tomb wall read cleanly.
- **Visual bugs**: Minor awkward merging where the 3 bridge abutments meet the curved lake banks.
- **Top fix**: Add clean stone abutments where the 3 bridges meet the curved lake shoreline and densify woodland around Bửu Thành.

### 59. Lăng Minh Mạng (`minhmang`) — **7.5/10**
- **Satellite comparison**: Iconic W–E axial symmetry is spot-on — Sùng Ân compound, 3 parallel bridges over Trừng Minh Lake, Minh Lâu hillock, straight bridge over Crescent Lake, and circular Bửu Thành.
- **Street/Photo comparison**: Strong overall massing, but Minh Lâu has bright yellow roofs and sits on a stark un-stepped green grassy box instead of its real terracotta/orange-red tiles, whitewashed lower walls, and grey stone retaining walls/stairs/balustrades.
- **Visual bugs**: Prominent water material/color mismatch in Trừng Minh Lake — a darker blue-green rectangular water strip under the 3 bridges clashes sharply with the lighter cyan lake; thin SW bridge meets shore awkwardly.
- **Top fix**: Fix the darker water seam rectangle under the 3 bridges and add stone retaining walls/staircases to Minh Lâu's terrace.

### 60. Lăng Khải Định (`khaidinh`) — **7.5/10**
- **Satellite comparison**: Narrow tiered hillside complex climbing SW-to-NE, curving approach road, flanking pavilions, octagonal Bi Đình, honour courtyard, and Thiên Định Palace match Google Satellite closely.
- **Street/Photo comparison**: Immediately recognizable concrete mausoleum silhouette, stairs, statue rows, and Bi Đình; color leans too warm/muddy brown instead of cool weathered charcoal-grey concrete.
- **Visual bugs**: **Green tree grows directly out of the middle of the front asphalt road** (Low SW); bright diagonal X-shaped stripe artifacts on the dark roofs of Thiên Định Palace and lower pavilions (Top view); generic modern houses beside entrance road.
- **Top fix**: Remove the tree in the entrance road, fix the diagonal X-stripe roof artifacts, and shift stone color cooler toward weathered charcoal-grey.

### 61. Đàn Nam Giao (`namgiao`) — **8.5/10**
- **Satellite comparison**: Concentric 3-tier geometry (red rectangle, yellow square, blue circular Viên Đàn), 4 cardinal stairs, and SE burner match Google Satellite with high precision; interior terraces are bare lawn instead of pine groves.
- **Street/Photo comparison**: Symbolic blue/yellow/red tier colors and concentric Viên Đàn paving are faithfully rendered and crisp.
- **Visual bugs**: None observed on the monument itself.
- **Top fix**: Plant the signature pine groves inside the outer and middle terraces to match satellite and photos.

### 62. Hồ Thủy Tiên (`thuytien`) — **7.0/10**
- **Satellite comparison**: Lake shape, perimeter paths, central water-slide peninsula, and SE circular dragon island with 3 radial bridges match Google Satellite well. Place coordinates center on the water-slide peninsula, pushing the iconic dragon island into the far distance.
- **Street/Photo comparison**: Water slides on the peninsula and distant dragon island with 3 bridges are recognizable.
- **Visual bugs**: Trees on the peninsula sit tightly against/clip slightly with the water-slide chutes.
- **Top fix**: Clear trees clipping into the water-slide chutes and frame/showcase the iconic SE dragon island more prominently.

### 63. Đan viện Thiên An (`thienan`) — **5.0/10**
- **Satellite comparison**: Building footprint, NNW–SSE orientation, cloister courtyard, and terracotta massing match satellite reasonably, though surrounding pine forest is sparse.
- **Street/Photo comparison**: Real Đan viện Thiên An is famous for East–West fusion architecture with curved Vietnamese tiled eaves and a **multi-tiered Asian-style bell tower topped with a cross**; 3D renders generic straight-ridged rectangular blocks and **omits the iconic bell tower**.
- **Visual bugs**: Severe framing/elevation issue (Low SW shows only bare hillside/trunks; obliques crop the buildings at the top edge); heavy dark-brown slope skirts; harsh dark-striped roof texture.
- **Top fix**: Add the multi-tiered Asian-style bell tower and curved Vietnamese roof eaves, soften roof stripes, and fix vertical/camera framing.

### 64. Đồi Vọng Cảnh (`vongcanh`) — **6.5/10**
- **Satellite comparison**: Hilltop geography over the Perfume River bend, winding summit paths, and historic concrete bunkers match satellite well, but dense pine forest canopy is rendered as sparse spindly pines over bare olive ground.
- **Street/Photo comparison**: River bend vista, paths, and bunkers match real-world descriptions, lacking lush pine-forested atmosphere.
- **Visual bugs**: Winding beige footpaths have jagged/stepped segments and edge clipping on slopes; sharp angular green polygon shelf along the riverbank.
- **Top fix**: Densify the pine forest canopy across the hill and smooth the jagged footpath ribbons over the terrain.

### 65. Núi Ngự Bình (`ngubinh`) — **5.5/10**
- **Satellite comparison**: Broad flat-topped trapezoidal *bình phong* profile and summit trail match geography, but dense pine forest is broken up by a large bald brown summit patch and sparse slopes.
- **Street/Photo comparison**: Real mountain is blanketed in continuous dark-green pine forest; 3D reads as a mostly bare grassy/dirt hill.
- **Visual bugs**: Two clashing tree styles right next to each other on the summit — spindly pines vs. chunky solid dark-green low-poly cones reading as dark squares from above; bald brown summit patch.
- **Top fix**: Replace the clashing chunky cone trees with a uniform, much denser pine canopy covering the summit and slopes.

### 66. Bia Quốc Học (`biaquochoc`) — **6.0/10**
- **Satellite comparison**: Riverside plaza and SW–NE alignment opposite Quốc Học match satellite, but on satellite the two tall outer pillars (*trụ biểu*) stand wide apart on the lateral wings, whereas 3D squeezes them right against the central screen.
- **Street/Photo comparison**: Major color/proportion mismatch — real monument is weathered dark charcoal-grey stone with subtle cream/ochre central panel, whereas 3D is bright saturated yellow-gold with compressed pillar spacing.
- **Visual bugs**: Low SW view is completely blocked by a tree exposing an ugly blocky green diamond/octahedron inner canopy mesh.
- **Top fix**: Widen the terrace and move flanking pillars outward to true spacing, tone down bright yellow to weathered stone, and move the blocking tree.

### 67. Cầu gỗ lim (`golim`) — **7.0/10**
- **Satellite comparison**: ~400 m ironwood boardwalk cantilevered over the southern bank of the Perfume River with shore gangways matches satellite alignment and scale; riverside park behind it lacks dense shade trees.
- **Street/Photo comparison**: Dark brown *gỗ lim* decking on piers is recognizable, but the walkway's signature gleaming **golden-bronze vertical railings** are barely visible.
- **Visual bugs**: Connecting wooden gangway in Low SW has a slightly rough/misaligned joint with the main boardwalk; bare park behind.
- **Top fix**: Make the golden-bronze railings clearly legible along both sides of the deck and populate the park behind it with shade trees.

### 68. Chùa Thiên Mụ (`thienmu`) — **8.5/10**
- **Satellite comparison**: Outstanding layout fidelity — river bend, boat pier, curving road, yellow hill retaining wall, octagonal Phước Duyên Pagoda, flanking stele/bell pavilions, 4 pillars, Tam Quan, axial walkway, Đại Hùng hall, and east green-roofed pavilion all match satellite.
- **Street/Photo comparison**: 7-story octagonal Phước Duyên Pagoda and curved terracotta roofs are immediately recognizable; Tam Quan roofs lean reddish-brown instead of weathered grey-slate, and courtyard trees are sparser than photo.
- **Visual bugs**: Very minor overlap where the bottom of the front staircase meets the curving asphalt road.
- **Top fix**: Densify mature courtyard/hillside trees framing the pagoda and Tam Quan, and shift Tam Quan roofs to weathered grey-slate tiles.

### 69. Phố đi bộ Nguyễn Đình Chiểu (`ndchieu`) — **7.5/10**
- **Satellite comparison**: Riverside pedestrian promenade south of Trường Tiền, circular garden plaza, and riverside park align well, though a couple of tall generic 3–4 story white-grey apartment blocks sit inside the park where satellite shows lower pavilions and trees.
- **Street/Photo comparison**: Tiled promenade, lampposts, alternating red/white craft stalls, flame trees, willows, and Trường Tiền backdrop capture the walking street nicely.
- **Visual bugs**: None observed.
- **Top fix**: Replace generic multi-story apartment blocks inside the park with lower traditional *nhà rường* / gallery pavilions and increase shade canopy.

### 70. Cầu Nguyễn Hoàng (`nguyenhoang`) — **8.5/10**
- **Satellite comparison**: NNW–SSE crossing, multi-lane roadway, twin bright golden-yellow steel arches, red pedestrian walkways, and approaches match satellite closely; misses the outward-bowed pedestrian viewing decks around the main arch span.
- **Street/Photo comparison**: Faithfully models the twin golden arches, vertical hangers, red pedestrian edges, and signature golden royal-parasol (*lọng vàng*) streetlamps; arch rise is slightly flatter than the sleeker real profile.
- **Visual bugs**: None observed (very crisp geometry).
- **Top fix**: Add outward-bowed pedestrian viewing balconies around the main arch span and slightly increase arch rise/sculpted pier profile.

### 71. Phố Tây (`photay`) — **4.5/10**
- **Satellite comparison**: Diagonal road grid of Phú Hội (Phạm Ngũ Lão, Chu Văn An, Võ Thị Sáu) aligns reasonably, but building density is drastically too sparse — wide bare grass lawns between scattered boxes vs near-100% lot coverage on satellite.
- **Street/Photo comparison**: Real Phố Tây is a lively 2–5 story walking-street district of continuous shophouses, cafes, awnings, and lanterns; 3D shows generic procedural boxes and a massive 12-story grey apartment block dominating the street view.
- **Visual bugs**: Oversized grey high-rise blocks half the Low SW street view; huge bare grass patches in downtown core; blank flat grey pad in center block.
- **Top fix**: Replace sparse generic blocks along the three walking streets with dense, continuous 2–4 story shophouse rows with awnings, sidewalks, and warm lanterns.

### 72. Cồn Hến (`conhen`) — **7.0/10**
- **Satellite comparison**: Island silhouette, N–S orientation, river channels, northern farm plots, and Phú Lưu bridge match satellite well, but housing density is sparser and riverbanks are bare brown embankments instead of a continuous lush green tree belt.
- **Street/Photo comparison**: Moored wooden boats, low-rise terracotta houses, and narrow bridge are nice touches, lacking the lush overhanging riverbank canopy.
- **Visual bugs**: Bare tan-brown shoreline embankments; interior roads look too wide/clean asphalt compared to narrow village lanes.
- **Top fix**: Add a dense, continuous green tree/bamboo belt along both riverbanks and increase village house density along narrower lanes.

### 73. Cồn Dã Viên (`daVien`) — **7.5/10**
- **Satellite comparison**: Teardrop geometry, looping white park paths, both bridge crossings, and concrete water tower align accurately with satellite, though tree canopy is much sparser than satellite's dense woodland.
- **Street/Photo comparison**: Faithfully captures Dã Viên bridge's trusses with yellow rest pavilions and the cylindrical concrete water tower (though somewhat plain).
- **Visual bugs**: Sparse tree cover over flat yellowish-green grass; large empty flat tan patch on the north bank across the river in NW Oblique.
- **Top fix**: Significantly densify park tree canopy across the island (especially western tip) and add architectural detailing to the water tower.

### 74. Cửa Quảng Đức (`gate:Cửa Quảng Đức`) — **5.5/10**
- **Satellite comparison**: Accurate south Citadel wall placement, rampart, perpendicular moat bridge (slightly wider than satellite), inner T-intersection, and nearby cannon pavilion.
- **Street/Photo comparison**: Open arched tunnel and stone plaque are accurate, but topped by the wrong **generic bright-red wooden imperial pavilion with shiny yellow tiles** instead of an authentic weathered 2-tier brick/plaster masonry *vọng lâu*.
- **Visual bugs**: Wrong watchtower architecture/colors; tree stands tightly against inner rampart corner.
- **Top fix**: Replace the red/yellow wooden pavilion with an authentic 2-tier brick/plaster masonry *vọng lâu* with arched openings and clay-tile roofs.

### 75. Cửa Thượng Tứ (`gate:Cửa Thượng Tứ`) — **5.0/10**
- **Satellite comparison**: Accurate SE Citadel wall placement, bastion, moat bridge, and distinctive triangular/Y-shaped inner road fork.
- **Street/Photo comparison**: Directly contradicted by its reference photo, which shows a weathered stone/brick arched gate, narrow humpbacked stone-arch bridge, and **2-tier cream-plastered masonry *vọng lâu*** (3 arches below, 1 above) with clay tiles — 3D uses the wrong red-columned wooden pavilion with flashy yellow roof.
- **Visual bugs**: Wrong *vọng lâu* architecture/colors; bridge too wide/flat.
- **Top fix**: Replace the generic red/yellow wooden pavilion with the authentic 2-tier cream-plaster/weathered-brick arched *vọng lâu* shown in the reference photo.

### 76. Cửa Hậu (`gate:Cửa Hậu`) — **8.5/10**
- **Satellite comparison**: North Citadel wall placement, rampart thickness, straight northern moat bridge, and inner T-junction match Google Satellite very accurately.
- **Street/Photo comparison**: Strong match to photo — weathered masonry lower gate, open arched tunnel, stone plaque, and **authentic 2-tier masonry *vọng lâu*** (3 arched bays below, 1 above) with upturned clay-tile roofs. Masonry is slightly darker brown-grey than the pale mossy stone in photo, and bridge parapets are dark instead of white.
- **Visual bugs**: None observed.
- **Top fix**: Lighten masonry to weathered mossy grey-stone and paint bridge balustrades white/light-grey.

### 77. Cửa An Hòa (`gate:Cửa An Hòa`) — **5.5/10**
- **Satellite comparison**: NW Citadel wall alignment, long straight moat bridge (slightly wider than satellite), and inner T-intersection match well.
- **Street/Photo comparison**: Open arched tunnel ok, but uses the inaccurate generic red wooden pavilion with bright yellow glazed tiles instead of a 2-tier masonry *vọng lâu*.
- **Visual bugs**: Wrong *vọng lâu* style; tree crowds outer berm corner beside the gate/bridge edge.
- **Top fix**: Replace the red/yellow wooden pavilion with an authentic 2-tier brick/plaster masonry *vọng lâu* with arched openings and clay-tile roofs.

### 78. Cửa Chánh Tây (`gate:Cửa Chánh Tây`) — **8.0/10**
- **Satellite comparison**: West Citadel wall placement, rampart alignment, narrow straight moat bridge, and inner road intersection match Google Satellite accurately.
- **Street/Photo comparison**: Matches the restored (2009) Cửa Chánh Tây well — warm brick lower gate, open vaulted arch, stone plaque, terrace balustrade, and **cream-plastered 2-tier masonry *vọng lâu*** with arched openings and terracotta roofs.
- **Visual bugs**: None major; *vọng lâu* roofs look slightly flat/boxy from oblique angles compared to Cửa Hậu and Cửa Hữu.
- **Top fix**: Refine the *vọng lâu* roof tiers with crisper overhanging pitched terracotta eaves and upturned corner ridges.

### 79. Cửa Hữu (`gate:Cửa Hữu`) — **8.5/10**
- **Satellite comparison**: SW Citadel wall footprint, orientation, rampart thickness, perpendicular moat bridge, and inner road intersection match Google Satellite accurately.
- **Street/Photo comparison**: Faithfully represents Cửa Hữu — warm weathered brick lower gate, open arched tunnel with plaque, terrace balustrade, and **authentic 2-tier masonry *vọng lâu*** (3 arches below, 1 above) with upturned terracotta roofs.
- **Visual bugs**: None observed (clean open arch, no clipping).
- **Top fix**: Add subtle mossy/weathered surface variation to the rampart masonry, outer berm, and bridge parapets.

### 80. Cửa Nhà Đồ (`gate:Cửa Nhà Đồ`) — **5.5/10**
- **Satellite comparison**: South Citadel wall alignment, straight moat bridge (wider than satellite), and Nguyễn Trãi inner intersection match well.
- **Street/Photo comparison**: Open arch ok, but uses the inaccurate generic red wooden pavilion with bright yellow glazed tiles instead of a 2-tier masonry *vọng lâu*.
- **Visual bugs**: Wrong *vọng lâu* style/colors; bridge deck too wide; lower gate masonry dark in shadow.
- **Top fix**: Replace the red/yellow wooden pavilion with an authentic 2-tier weathered masonry *vọng lâu* with arched openings and clay-tile roofs.

### 81. Cửa Ngăn (`gate:Cửa Ngăn`) — **8.5/10**
- **Satellite comparison**: South Citadel wall (Thể Nhơn Môn) placement, narrow moat bridge, inner road alignment, and adjacent cannon pavilion match Google Satellite accurately.
- **Street/Photo comparison**: Excellent match to photo — **authentic 2-tier masonry *vọng lâu*** (3 arches below, 1 above) with upturned clay-tile roofs, open arch, stone plaque, and arched stone bridge with white balustrades. Masonry is too saturated orange-red terracotta vs weathered mossy grey-brick in photo.
- **Visual bugs**: None major; overly orange-red masonry tint; minor tree crowding near inner rampart edge.
- **Top fix**: Shift gate and *vọng lâu* masonry from bright terracotta-orange to weathered mossy grey-brick.

### 82. Cửa Đông Ba (`gate:Cửa Đông Ba`) — **5.5/10**
- **Satellite comparison**: East Citadel wall orientation, rampart, moat bridge (slightly wider than satellite), and Mai Thúc Loan inner intersection match cleanly.
- **Street/Photo comparison**: Open arch ok, but uses the inaccurate generic red wooden pavilion with bright yellow glazed tiles instead of the restored 2-tier masonry *vọng lâu*.
- **Visual bugs**: Wrong *vọng lâu* style; street tree sits right in front of the archway axis on the inner approach.
- **Top fix**: Replace the red/yellow wooden pavilion with an authentic 2-tier brick/plaster masonry *vọng lâu* with arched openings and clay-tile roofs.

### 83. Cửa Kẻ Trài (`gate:Cửa Kẻ Trài`) — **4.5/10**
- **Satellite comparison**: NE Citadel wall placement and moat bridge align with satellite, but the inner rampart immediately S/W of the gate has an abrupt squared-off bastion stub terminating against the inner road.
- **Street/Photo comparison**: Uses the inaccurate generic red wooden pavilion with bright yellow glazed tiles instead of a weathered grey 2-tier masonry *vọng lâu*.
- **Visual bugs**: **Purple flowering tree visibly clips directly into the Citadel rampart wall** right beside the gate; abrupt dark-walled rampart stub beside the gate; wrong watchtower style.
- **Top fix**: Replace the red/yellow wooden pavilion with an authentic 2-tier masonry *vọng lâu*, remove the purple tree clipping into the rampart, and fix the abrupt rampart-end geometry.
