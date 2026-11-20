# Bia Quốc Học (place id `biaquochoc`)

Đài tưởng niệm Chiến sĩ trận vong, the 1920 war memorial on the south bank of the Hương, in the riverside park facing
the gate of Trường Quốc Học across Lê Lợi. Model: `src/landmarks/places/biaquochoc.js`. The older builder
`buildBiaQuocHoc` in `src/landmarks/memorial.js` now skips it with `replaced('biaquochoc')`.

## Sources
- https://vi.wikipedia.org/wiki/Bia_Qu%E1%BB%91c_H%E1%BB%8Dc: a large roofed screen (bình phong), two tiers, on a
  two-step base; kim khánh plaque with a medal at the centre; dragon, qilin, 壽, tứ quý and fretwork in Nguyễn
  style; 31 French names on the front and 78 Vietnamese on the back, later chiselled off; inaugurated 18 Sept 1920.
- https://kienthuc.net.vn/kho-tri-thuc/anh-cuc-doc-ve-bia-quoc-hoc-hue-dau-the-ky-20-1167109.html: one trụ biểu on
  each side.
- https://www.vietnamplus.vn/dau-tu-700-trieu-dong-thuc-hien-trung-tu-bia-quoc-hoc-hue-post415775.vnp and
  https://en.vietnamplus.vn/restoration-of-bia-quoc-hoc-undergoing-in-hue-post102467.vnp: 2016-17 restoration
  (~700 M VND) of the stele, balustrade and trụ biểu; the space in front hosts the Huế festival events.
- https://thuonghieucongluan.com.vn/bia-quoc-hoc-hue-bi-ve-ao-moi-a33134.html: painted bright yellow after the
  restoration, glazed tubular tiles, 67 lamps on roof, walls and pillars.
- Tạp chí Sông Hương (cited in the older builder; the page tapchisonghuong.com.vn/tap-chi/c371/n25392 now returns 404):
  10.95 m overall, trụ biểu 9.85 m, balustrade nearly 1.4 m.
- https://www.vietnammonpaysnatal.fr/stele-commemorative-bia-tuong-niem/: roofed screen, two levels, raised base with
  steps, faces the school.
- OpenStreetMap (local extract `data/raw/hue-osm*.json`): memorial node 5299153429 at (-675.1, 879.2) m; school wall
  way 695775622 with the gate at (-639.6, 923.5); Lê Lợi sidewalk way 1167513717; riverside footway way 1182616608.

## Confirmed
- Form: two-tier roofed screen on two steps, balustrade, one trụ biểu at each end, bright yellow, glazed tiles, night
  lighting.
- Heights: 10.95 m to the crown, 9.85 m to the trụ biểu finials (model matches both, measured from the paving).
- Position: the OSM node lies exactly on the gate's normal (node → gate vector within ~1° of it), 37 m back from the
  Lê Lợi sidewalk and 12 m in front of the riverside footway. (The older builder's comment said the node was 40 m off
  the axis; it is not.)

## Estimated
- Plan: central bay 6 m, side bays 4.4 m, ~20 m across the pillars, wall 1.1 m thick; tier heights.
- Tile colour (only "glazed" is known): deep ochre-yellow.
- Pillar heads (lantern box + lotus-bud finial), balustrade layout, stairs front and back.
- The paved forecourt to the Lê Lợi sidewalk (28 × 22 m), kerbed, with a darker axis band.

## What changed (vs. the older builder)
- Moved to a replica file; geometry and dimensions kept.
- The forecourt was hidden under the park's grass overlay; it now shows, runs out to the sidewalk, and is marked
  paved so trees and houses keep off it (before, trees stood in it).
- Name tablets drawn as light stone (names chiselled off) instead of near-black; balustrade has its panel infill;
  round 壽 medallion; crown raised to the sourced 10.95 m.
- Night lamps are this place's own glow points in `group` with `userData.landmark = 'biaquochoc'`; the lantern lights
  of the trụ biểu now sit at the openings instead of inside the solid lantern.

## Left
- No measured plan or elevation drawing found; the bay widths and roof profiles are estimates. A photo-based check of
  the wing count (three sections assumed) and tile colour would help.
