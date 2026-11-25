import * as THREE from 'three';

const ATLAS_SIZE = 1024;
const ATLAS_SEED = 7;
const LCG_MULT = 16807;
const LCG_MOD = 2147483647;
const TWIG_SEGMENTS = 10;

// Leaf atlas, 1024², greyscale (the instance and vertex colours give the hue). Canvas layout (y down):
//   [ broadleaf branchlet | flamboyant frond ]   top half
//   [ willow curtain      | palm frond | pine tuft / solid ]   bottom half (the right quarter: tuft above, solid below)
export const LEAF_UV = {
  broad: [0.0, 0.5, 0.5, 1.0],
  frond: [0.5, 0.5, 1.0, 1.0],
  willow: [0.0, 0.0, 0.5, 0.5],
  palm: [0.5, 0.0, 0.75, 0.5],
  pine: [0.75, 0.25, 1.0, 0.5],
} as const;

export const SOLID_UV = [0.875, 0.11] as const;

interface AtlasCtx {
  ctx: CanvasRenderingContext2D;
  rnd: () => number;
  grey: (val: number, alpha?: number) => string;
  drawLeaf: (x: number, y: number, ang: number, len: number, width: number, lum: number) => void;
  drawTwig: (x0: number, y0: number, ang: number, len: number, width0: number, bend: number, lum?: number) => [number, number, number][];
}

function drawBroadleafCluster({ rnd, drawLeaf, drawTwig }: AtlasCtx) {
  const cx = 256, cy = 262;
  for (let i = 0; i < 70; i++) {
    const ang = rnd() * Math.PI * 2;
    const rad = Math.pow(rnd(), 0.55) * 175;
    drawLeaf(cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad * 0.92, ang + (rnd() - 0.5) * 1.6, 44 + rnd() * 26, 17 + rnd() * 6, 145 + rnd() * 55);
  }
  for (let branch = 0; branch < 10; branch++) {
    const ang = -Math.PI / 2 + (branch - 4.5) * 0.4 + (rnd() - 0.5) * 0.2;
    const len = 140 + rnd() * 60;
    const pts = drawTwig(cx + (rnd() - 0.5) * 30, cy + 70 + rnd() * 30, ang, len, 4.5, (rnd() - 0.5) * 0.7);
    for (let k = 2; k <= 10; k++) {
      const [x, y, ptAng] = pts[k];
      const frac = k / 10;
      for (const side of [-1, 1]) {
        const leafLen = 30 + 26 * Math.sin(Math.PI * Math.min(1, frac * 1.1)) + rnd() * 8;
        drawLeaf(x, y, ptAng + side * (0.7 + rnd() * 0.4), leafLen, leafLen * 0.36, 165 + rnd() * 80);
      }
    }
    drawLeaf(pts[10][0], pts[10][1], pts[10][2] + (rnd() - 0.5) * 0.3, 42, 14, 215 + rnd() * 40);
  }
  for (let i = 0; i < 70; i++) {
    const ang = rnd() * Math.PI * 2;
    const rad = 120 + rnd() * 90;
    drawLeaf(cx + Math.cos(ang) * rad * 0.9, cy + Math.sin(ang) * rad * 0.85, ang + (rnd() - 0.5) * 1.0, 26 + rnd() * 18, 10 + rnd() * 4, 185 + rnd() * 70);
  }
}

function drawFlamboyantFronds({ ctx, rnd, grey, drawLeaf, drawTwig }: AtlasCtx) {
  const cx = 768, cy = 256;
  for (let frond = 0; frond < 7; frond++) {
    const ang = (frond / 7) * Math.PI * 2 + rnd() * 0.4;
    const len = 175 + rnd() * 50;
    const pts = drawTwig(cx, cy, ang, len, 3, (rnd() - 0.5) * 0.5, 95);
    for (let k = 1; k <= 10; k++) {
      const [x, y, ptAng] = pts[k];
      const frac = k / 10;
      const pinnaLen = 62 * Math.sin(Math.PI * (0.18 + 0.75 * frac)) + 8;
      for (const side of [-1, 1]) {
        const pinnaAng = ptAng + side * (1.0 - frac * 0.3);
        ctx.strokeStyle = grey(120, 0.9);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(pinnaAng) * pinnaLen, y + Math.sin(pinnaAng) * pinnaLen);
        ctx.stroke();
        const leafletCount = Math.max(3, Math.round(pinnaLen / 6));
        for (let j = 1; j <= leafletCount; j++) {
          const px = x + Math.cos(pinnaAng) * pinnaLen * (j / leafletCount);
          const py = y + Math.sin(pinnaAng) * pinnaLen * (j / leafletCount);
          const lum = 170 + rnd() * 80;
          for (const subSide of [-1, 1]) drawLeaf(px, py, pinnaAng + subSide * 1.1, 14 + rnd() * 3, 5.6, lum);
        }
      }
    }
  }
}

function drawWillowCurtain({ rnd, drawLeaf, drawTwig }: AtlasCtx) {
  const originX = 0, originY = 512;
  for (let strand = 0; strand < 17; strand++) {
    const startX = originX + 18 + strand * 28.5 + (rnd() - 0.5) * 12;
    const len = 300 + rnd() * 200;
    const pts = drawTwig(startX, originY + 2, Math.PI / 2 + (rnd() - 0.5) * 0.12, len, 2.4, (rnd() - 0.5) * 0.25, 105);
    for (let k = 1; k <= 10; k++) {
      const [x, y, ptAng] = pts[k];
      for (let j = 0; j < 3; j++) {
        const frac = (k - 1 + j / 3) / 10;
        const px = x + Math.cos(ptAng) * j * len / 30;
        const py = y + Math.sin(ptAng) * j * len / 30;
        for (const side of [-1, 1]) {
          drawLeaf(px, py, ptAng + side * (0.32 + rnd() * 0.2), 22 + rnd() * 10 - frac * 6, 4.6, 165 + rnd() * 80);
        }
      }
    }
  }
}

function drawArecaFrond({ rnd, drawLeaf, drawTwig }: AtlasCtx) {
  const pts = drawTwig(640, 1020, -Math.PI / 2, 490, 7, 0.0, 180);
  for (let k = 0; k < 30; k++) {
    const frac = k / 30;
    const idx = Math.min(9, Math.floor(frac * 10));
    const sub = frac * 10 - idx;
    const x = pts[idx][0] + (pts[idx + 1][0] - pts[idx][0]) * sub;
    const y = pts[idx][1] + (pts[idx + 1][1] - pts[idx][1]) * sub;
    const len = 105 * Math.sin(Math.PI * (0.1 + 0.85 * frac)) + 14;
    for (const side of [-1, 1]) {
      drawLeaf(x, y, -Math.PI / 2 + side * (1.25 - frac * 0.55), len, 7, 175 + rnd() * 70);
    }
  }
}

function drawPineTier({ ctx, rnd, grey }: AtlasCtx) {
  const cx = 896, cy = 640;
  ctx.lineCap = 'round';
  for (let branch = 0; branch < 26; branch++) {
    const ang = rnd() * Math.PI * 2;
    const rad = Math.pow(rnd(), 0.6) * 92;
    const bx = cx + Math.cos(ang) * rad;
    const by = cy + Math.sin(ang) * rad;
    ctx.strokeStyle = grey(85);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(bx, by);
    ctx.stroke();
    for (let k = 0; k < 34; k++) {
      const needleAng = rnd() * Math.PI * 2;
      const needleLen = 16 + rnd() * 22;
      ctx.strokeStyle = grey(150 + rnd() * 100);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(needleAng) * needleLen, by + Math.sin(needleAng) * needleLen);
      ctx.stroke();
    }
  }
}

export function createLeafAtlas() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = ATLAS_SIZE;
  const ctx = canvas.getContext('2d')!;
  let seed = ATLAS_SEED;
  const rnd = () => { seed = (seed * LCG_MULT) % LCG_MOD; return seed / LCG_MOD; };
  const grey = (val: number, alpha = 1) => `rgba(${val | 0},${val | 0},${val | 0},${alpha})`;

  const drawLeaf = (x: number, y: number, ang: number, len: number, width: number, lum: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    const grad = ctx.createLinearGradient(0, 0, len, 0);
    grad.addColorStop(0, grey(lum * 0.78));
    grad.addColorStop(1, grey(Math.min(255, lum * 1.06)));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * 0.4, -width, len, 0);
    ctx.quadraticCurveTo(len * 0.4, width, 0, 0);
    ctx.fill();
    if (len > 14) {
      ctx.strokeStyle = grey(lum * 0.6, 0.7);
      ctx.lineWidth = Math.max(0.8, width * 0.14);
      ctx.beginPath();
      ctx.moveTo(len * 0.05, 0);
      ctx.lineTo(len * 0.85, 0);
      ctx.stroke();
    }
    ctx.restore();
  };

  const drawTwig = (x0: number, y0: number, ang: number, len: number, width0: number, bend: number, lum = 78) => {
    const pts: [number, number, number][] = [];
    let x = x0, y = y0, curAng = ang;
    for (let k = 0; k <= TWIG_SEGMENTS; k++) {
      pts.push([x, y, curAng]);
      x += (Math.cos(curAng) * len) / TWIG_SEGMENTS;
      y += (Math.sin(curAng) * len) / TWIG_SEGMENTS;
      curAng += bend / TWIG_SEGMENTS;
    }
    ctx.strokeStyle = grey(lum);
    ctx.lineCap = 'round';
    for (let k = 0; k < TWIG_SEGMENTS; k++) {
      ctx.lineWidth = Math.max(0.7, width0 * (1 - k / TWIG_SEGMENTS));
      ctx.beginPath();
      ctx.moveTo(pts[k][0], pts[k][1]);
      ctx.lineTo(pts[k + 1][0], pts[k + 1][1]);
      ctx.stroke();
    }
    return pts;
  };

  const atlasCtx: AtlasCtx = { ctx, rnd, grey, drawLeaf, drawTwig };
  drawBroadleafCluster(atlasCtx);
  drawFlamboyantFronds(atlasCtx);
  drawWillowCurtain(atlasCtx);
  drawArecaFrond(atlasCtx);
  drawPineTier(atlasCtx);

  // solid block for trunks, limbs and the dark cores
  ctx.fillStyle = '#fff';
  ctx.fillRect(776, 790, 240, 226);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}
