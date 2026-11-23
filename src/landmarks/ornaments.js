import { KIND, hex, shade } from '../geo/buf.js';

// Reusable architectural ornaments for Huế imperial halls, gates, temples and royal tombs.
// All primitives write directly into the shared static Buf (S) with KIND.PLAIN so they inherit
// both the Realistic (real) and Illustrated (ink) looks, shadows, and weathering with zero extra draw calls.

const GOLD = hex('#dfb84c');
const PEARL = hex('#e8643a');
const ENAMEL = hex('#3d8568');
const STONE = hex('#c9c2b2');

// Twin dragons facing the sun / flaming pearl (lưỡng long chầu nhật) along a roof ridge.
// c: [x, z] centre of the ridge; y: top of the ridge beam; ang: direction along the ridge (radians).
export function ridgeDragons(S, c, y, ang, { span = 6.0, scale = 1.0, gold = GOLD, dragon = ENAMEL, pearl = PEARL } = {}) {
  const keep = S.kind;
  S.kind = KIND.PLAIN;
  const ux = Math.cos(ang), uz = Math.sin(ang);
  const nx = -uz, nz = ux;
  const P = (u, h, v = 0) => [c[0] + ux * u + nx * v, y + h, c[1] + uz * u + nz * v];

  // central flaming sun / pearl disc on a lotus pedestal
  const r = 0.42 * scale, yc = 0.52 * scale;
  S.box(c[0], c[1], y, y + 0.24 * scale, 0.48 * scale, 0.26 * scale, ang, gold);
  const seg = 8;
  for (let k = 0; k < seg; k++) {
    const a0 = (k / seg) * Math.PI * 2, a1 = ((k + 1) / seg) * Math.PI * 2;
    for (const sd of [-1, 1]) {
      S.tri(
        P(0, yc, sd * 0.05 * scale),
        P(Math.cos(a0) * r, yc + Math.sin(a0) * r, sd * 0.05 * scale),
        P(Math.cos(a1) * r, yc + Math.sin(a1) * r, sd * 0.05 * scale),
        k % 2 ? gold : pearl,
        [nx * sd, 0, nz * sd],
      );
    }
  }
  // flame tongue above the pearl
  S.beam(P(0, yc + r * 0.7), P(0, yc + r * 1.45), 0.14 * scale, 0.12 * scale, pearl);

  // two undulating dragons curving outward on either side of the pearl
  const half = Math.max(1.8 * scale, span / 2);
  for (const s of [-1, 1]) {
    const pts = [
      [0.65 * scale, 0.58 * scale],
      [0.95 * scale, 0.28 * scale],
      [half * 0.42, 0.62 * scale],
      [half * 0.64, 0.22 * scale],
      [half * 0.84, 0.54 * scale],
      [half, 0.24 * scale],
    ].map(([u, h]) => P(s * u, h));
    for (let i = 0; i + 1 < pts.length; i++) {
      const col = i === 0 ? gold : i % 2 ? dragon : shade(dragon, 1.15);
      S.beam(pts[i], pts[i + 1], (0.22 - i * 0.02) * scale, (0.24 - i * 0.02) * scale, col);
    }
    // dragon head crest facing the pearl
    S.beam(pts[0], P(s * 0.48 * scale, 0.78 * scale), 0.16 * scale, 0.18 * scale, gold);
  }
  S.kind = keep;
}

// Traditional pháp lam gourd / lotus bud finial (hồ lô) on a pavilion apex or ridge end.
export function ridgeGourd(S, x, z, y, scale = 1.0, col = GOLD) {
  const keep = S.kind;
  S.kind = KIND.PLAIN;
  S.cyl(x, z, y, y + 0.28 * scale, 0.16 * scale, 0.24 * scale, 7, col);
  S.cyl(x, z, y + 0.28 * scale, y + 0.52 * scale, 0.24 * scale, 0.11 * scale, 7, shade(col, 1.08));
  S.cyl(x, z, y + 0.52 * scale, y + 0.78 * scale, 0.16 * scale, 0.03 * scale, 7, shade(col, 1.15));
  S.kind = keep;
}

// Ceremonial Huế pillar (trụ biểu) with plinth, panelled shaft, collar and lotus bud finial.
export function truBieu(S, x, z, y, h, ang, { col = STONE, cap = GOLD, accent = hex('#4a6d8a') } = {}) {
  const keep = S.kind;
  S.kind = KIND.MASONRY;
  const w = Math.max(0.45, h * 0.09);
  S.box(x, z, y, y + h * 0.14, w * 1.45, w * 1.45, ang, shade(col, 0.92));
  S.box(x, z, y + h * 0.14, y + h * 0.84, w, w, ang, col);
  S.kind = KIND.PLAIN;
  S.box(x, z, y + h * 0.24, y + h * 0.74, w + 0.05, w * 0.48, ang, accent);
  S.box(x, z, y + h * 0.24, y + h * 0.74, w * 0.48, w + 0.05, ang, accent);
  S.box(x, z, y + h * 0.84, y + h * 0.89, w * 1.38, w * 1.38, ang, shade(col, 1.06));
  ridgeGourd(S, x, z, y + h * 0.89, w * 1.15, cap);
  S.kind = keep;
}
