import { KIND, hex, shade } from '../geo/buf.ts';

// Reusable architectural ornaments for Huế imperial halls, gates, temples and royal tombs.
// All primitives write directly into the shared static Buf (S) with KIND.PLAIN so they inherit
// both the Realistic (real) and Illustrated (ink) looks, shadows, and weathering with zero extra draw calls.

const GOLD = hex('#dfb84c');
const PEARL = hex('#e8643a');
const ENAMEL = hex('#3d8568');
const STONE = hex('#c9c2b2');
const PEARL_SEGS = 8;

// Twin dragons facing the sun / flaming pearl (lưỡng long chầu nhật) along a roof ridge.
export function ridgeDragons(S, center, y, ang, { span = 6.0, scale = 1.0, gold = GOLD, dragon = ENAMEL, pearl = PEARL } = {}) {
  const keepKind = S.kind;
  S.kind = KIND.PLAIN;
  const ux = Math.cos(ang), uz = Math.sin(ang);
  const nx = -uz, nz = ux;
  const ridgePt = (along, lift, across = 0) => [center[0] + ux * along + nx * across, y + lift, center[1] + uz * along + nz * across];

  const pearlR = 0.42 * scale, pearlY = 0.52 * scale;
  S.box(center[0], center[1], y, y + 0.24 * scale, 0.48 * scale, 0.26 * scale, ang, gold);
  for (let k = 0; k < PEARL_SEGS; k++) {
    const a0 = (k / PEARL_SEGS) * Math.PI * 2, a1 = ((k + 1) / PEARL_SEGS) * Math.PI * 2;
    for (const side of [-1, 1]) {
      S.tri(
        ridgePt(0, pearlY, side * 0.05 * scale),
        ridgePt(Math.cos(a0) * pearlR, pearlY + Math.sin(a0) * pearlR, side * 0.05 * scale),
        ridgePt(Math.cos(a1) * pearlR, pearlY + Math.sin(a1) * pearlR, side * 0.05 * scale),
        k % 2 ? gold : pearl,
        [nx * side, 0, nz * side],
      );
    }
  }
  S.beam(ridgePt(0, pearlY + pearlR * 0.7), ridgePt(0, pearlY + pearlR * 1.45), 0.14 * scale, 0.12 * scale, pearl);

  const halfSpan = Math.max(1.8 * scale, span / 2);
  for (const side of [-1, 1]) {
    const pts = [
      [0.65 * scale, 0.58 * scale],
      [0.95 * scale, 0.28 * scale],
      [halfSpan * 0.42, 0.62 * scale],
      [halfSpan * 0.64, 0.22 * scale],
      [halfSpan * 0.84, 0.54 * scale],
      [halfSpan, 0.24 * scale],
    ].map(([along, lift]) => ridgePt(side * along, lift));
    for (let i = 0; i + 1 < pts.length; i++) {
      const col = i === 0 ? gold : i % 2 ? dragon : shade(dragon, 1.15);
      S.beam(pts[i], pts[i + 1], (0.22 - i * 0.02) * scale, (0.24 - i * 0.02) * scale, col);
    }
    S.beam(pts[0], ridgePt(side * 0.48 * scale, 0.78 * scale), 0.16 * scale, 0.18 * scale, gold);
  }
  S.kind = keepKind;
}

// Traditional pháp lam gourd / lotus bud finial (hồ lô) on a pavilion apex or ridge end.
export function ridgeGourd(S, x, z, y, scale = 1.0, col = GOLD) {
  const keepKind = S.kind;
  S.kind = KIND.PLAIN;
  S.cyl(x, z, y, y + 0.28 * scale, 0.16 * scale, 0.24 * scale, 7, col);
  S.cyl(x, z, y + 0.28 * scale, y + 0.52 * scale, 0.24 * scale, 0.11 * scale, 7, shade(col, 1.08));
  S.cyl(x, z, y + 0.52 * scale, y + 0.78 * scale, 0.16 * scale, 0.03 * scale, 7, shade(col, 1.15));
  S.kind = keepKind;
}

// Ceremonial Huế pillar (trụ biểu) with plinth, panelled shaft, collar and lotus bud finial.
export function truBieu(S, x, z, y, height, ang, { col = STONE, cap = GOLD, accent = hex('#4a6d8a') } = {}) {
  const keepKind = S.kind;
  S.kind = KIND.MASONRY;
  const width = Math.max(0.45, height * 0.09);
  S.box(x, z, y, y + height * 0.14, width * 1.45, width * 1.45, ang, shade(col, 0.92));
  S.box(x, z, y + height * 0.14, y + height * 0.84, width, width, ang, col);
  S.kind = KIND.PLAIN;
  S.box(x, z, y + height * 0.24, y + height * 0.74, width + 0.05, width * 0.48, ang, accent);
  S.box(x, z, y + height * 0.24, y + height * 0.74, width * 0.48, width + 0.05, ang, accent);
  S.box(x, z, y + height * 0.84, y + height * 0.89, width * 1.38, width * 1.38, ang, shade(col, 1.06));
  ridgeGourd(S, x, z, y + height * 0.89, width * 1.15, cap);
  S.kind = keepKind;
}
