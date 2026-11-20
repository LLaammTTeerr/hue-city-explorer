# Nghênh Lương Đình (`nghenhluong`)

Riverside pavilion on the Hương River bank in front of Phu Văn Lâu, on the Kỳ Đài axis.
Replica: `src/landmarks/places/nghenhluong.js` (old code in `citadel.js` skipped via `replaced('nghenhluong')`).

## Sources
- https://vi.wikipedia.org/wiki/Nghênh_Lương_Đình
- https://vietnammonpaysnatal.fr/nghinh-luong-dinh-pavillon-de-lembarcadere-royale
- https://mia.vn (Nghênh Lương Đình article), https://vov.vn (Nghênh Lương Đình article)
- https://www.gpsmycity.com (Nghenh Luong Dinh entry: 16 columns)
- OpenStreetMap way 239568224 (pavilion outline), way 618267890 (landing / jetty)
- `docs/heights-reference.json` (h 7–8 m, estimated)

## Confirmed
- Built 1852 (Tự Đức), restored 1903, rebuilt 1918; restored again in modern times; still standing.
- Plan: phương đình, 1 gian 4 chái, open on all four sides, with vỏ cua porches at front and back.
- Roof: two tiers with a chồng diêm band; yellow glazed tiles (tubular on the main roof, flat on the porches); two dragons facing the sun on the ridge (lưỡng long chầu nhật).
- 16 columns; red lacquer with gold fretwork (liên ba).
- Platform about 0.9 m high with brick face and bluestone kerbs; 13 steps down to a corridor at the water's edge.
- OSM outline 14.7 × 11.1 m; long axis points to the river, matching the Kỳ Đài direction.

## Estimated
- Column grid (±1.6 / ±4.0 m), column heights (outer 3.1 m, inner 5.0 m), porch depth 2.4 m.
- Roof heights: lower tier 1.35 m, upper tier 1.85 m; total ≈ 8.3 m (inside the 7–8 m ±25% reference).
- Step flights from platform (5 risers, 3.4 m wide), apron width 8.4 m.
- Bank compromise: the model's land polygon reaches past where the real flight drops to the water, so the 13 steps are laid down the model's bank face; landing and jetty are kept where OSM puts them, but centred on the pavilion axis (OSM has it ~2.5 m off, likely imagery parallax).

## What changed
- Open 16-column colonnade instead of a closed core box.
- Correct roof form: two-tier hip with chồng diêm band, separate porch roofs, ridge sun disc and dragons.
- Platform with kerbs and steps, paved apron, 13-step river flight, water-level corridor and jetty from OSM.
- Night lighting: eave light strips on both tiers and the porches, plus six lantern posts (warm glow).

## Left
- Fretwork and ridge ornament are simplified at model scale; tile colour is from photos, not a measured value.
- Real dimensions of the column grid and roof heights are not published; confirm if a survey drawing turns up.
- Note for the coordinator: `scripts/shot.mjs` leaves its vite preview server running after each run (kill it by port).
