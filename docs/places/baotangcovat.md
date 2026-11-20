# Bảo tàng Cổ vật Cung đình Huế (`baotangcovat`)

Replica in `src/landmarks/places/baotangcovat.js`. It covers điện Long An (the museum hall at 3 Lê Trực), its platform and steps, the front court and path, the gate on Lê Trực, the fence round the grounds, and the outdoor exhibits in the front court. Quốc Tử Giám, across Lê Trực, is not part of it.

## Sources
- https://vi.wikipedia.org/wiki/Điện_Long_An: dimensions, platform, columns, bays, bare timber, history.
- https://mia.vn/cam-nang-du-lich/dien-long-an-hue-doc-dao-17073: yellow-glazed yin-yang tiles, bay and chái counts, 1.1 m platform.
- https://baotanglichsu.vn/en/Articles/3181/15909/long-an-palace-hue-royal-antiquities-museum-and-the-precious-treasures.html: three roof tiers, 1,750 m² of roof, 128 ironwood columns.
- https://tuoitre.vn/saigontimes/tham-long-an-bao-dien/: seven bays and two chái, bare lim wood.
- OpenStreetMap (from `data/raw`):
  - Hall: way 695810710. Its 40 × 30 m outline takes in the eaves.
  - Museum grounds: way 695810697. Lê Trực runs along the front (south-east side) and Đinh Công Tráng along the back.
- City height survey: the hall reads 9.0 m to the ridge (`public/data/hue.json`, kept over TRUE_H 11.5). The place is not in `docs/heights-reference.json`.

## Confirmed
- The hall is a rectangle, 35.70 × 28 m, on a 1.1 m stone-faced platform.
- It is a *trùng thiềm điệp ốc* double house on 128 lim columns.
  - Front house: 7 bays plus 2 single chái.
  - Rear house: 5 bays plus 2 double chái.
- The roof has three tiers of yellow-glazed yin-yang tiles.
- The timber is left bare, with no red lacquer or gilding.
- The hall faces Lê Trực (south-east), with the court in front of it.

## Estimated
- Depths: front house about 10.6 m, rear house about 15 m.
- Heights: eaves 3.0 and 3.3 m above the platform, and the tiers below the 9.0 m ridge.
- The three flights of six steps.
- The verandah's ten free columns and the door and transom treatment.
- The ridge ornament: a sun disc between two dragons.
- The gate: two ochre piers with a name board.
- The fence: an ochre plinth under an iron railing, following the OSM grounds outline.
- The outdoor exhibits: two bronze cauldrons flanking the path, and stone mortars and steles on the lawn. The Commons category lists a "Vạc đồng" photo, but where the exhibits stand is not confirmed.
- The brick path, and the stone pavement round the platform.

## What changed
- Before: a flat ochre block on the mapped outline. Now: a stepped platform, the two houses with a three-tier yellow roof and a verandah of free columns, a paved axis to a gate on Lê Trực, and a fence round the grounds.
- The generic mapped building is dropped automatically, because the model covers it (`populate` → `buildingOff`). No older builder drew this place, so no guard was needed.

## What is left
- Mapped annexes 695810708 and 695810709 (the latter wraps the rear of the hall) are still drawn by the generic building pass, as flat-roofed blocks. Their real form, and whether they are tiled, is not confirmed.
- The real gate form, the fence type and the positions of the outdoor exhibits need a photo check.
- Since 2023 there is a plan to move the museum out and return Long An to the heritage site. It does not change the 2026 state.
