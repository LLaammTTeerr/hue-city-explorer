import type * as THREE from 'three';

export const CAPTURE_PRESETS = ['screen', '2x', '4k'] as const;
export type CapturePreset = (typeof CAPTURE_PRESETS)[number];

const MIN_CAPTURE_PX = 2;
const FOUR_K_LONG_EDGE_PX = 3840;
const MAX_DESKTOP_CAPTURE_PX = 5120;
const MAX_LOW_CAPTURE_PX = 3840;
const REVOKE_URL_DELAY_MS = 1000;

export function getMaxCaptureDim(renderer: THREE.WebGLRenderer, low: boolean): number {
  const gl = renderer.getContext();
  const maxTex = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) || FOUR_K_LONG_EDGE_PX;
  const maxRb = Number(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)) || FOUR_K_LONG_EDGE_PX;
  const maxVp = gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array | number[] | null;
  const maxVpDim = maxVp ? Math.min(maxVp[0], maxVp[1]) : FOUR_K_LONG_EDGE_PX;
  const cap = low ? MAX_LOW_CAPTURE_PX : MAX_DESKTOP_CAPTURE_PX;
  return Math.max(MIN_CAPTURE_PX, Math.min(maxTex, maxRb, maxVpDim, cap));
}

export function computeCaptureSize(
  preset: CapturePreset,
  viewportW: number,
  viewportH: number,
  dpr: number,
  maxDim: number,
): { width: number; height: number } {
  const safeW = Math.max(1, viewportW);
  const safeH = Math.max(1, viewportH);
  const safeDpr = Math.max(1, dpr || 1);

  let width: number;
  let height: number;
  if (preset === '4k') {
    const scale = FOUR_K_LONG_EDGE_PX / Math.max(safeW, safeH);
    width = Math.round(safeW * scale);
    height = Math.round(safeH * scale);
  } else {
    const mult = preset === '2x' ? 2 : 1;
    width = Math.round(safeW * safeDpr * mult);
    height = Math.round(safeH * safeDpr * mult);
  }

  const longest = Math.max(width, height);
  if (longest > maxDim) {
    const clampScale = maxDim / longest;
    width = Math.round(width * clampScale);
    height = Math.round(height * clampScale);
  }

  return {
    width: Math.max(MIN_CAPTURE_PX, width),
    height: Math.max(MIN_CAPTURE_PX, height),
  };
}

function buildFilename(placeId: string | null, width: number, height: number): string {
  const slug = placeId
    ? placeId
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    : '';
  if (slug) return `hue-${slug}-${width}x${height}.png`;
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `hue-${width}x${height}-${stamp}.png`;
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_URL_DELAY_MS);
}

export interface CaptureResult {
  blob: Blob;
  width: number;
  height: number;
  filename: string;
}

export function createCapture(opts: {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  post: any;
  water: any;
  shadows: any;
  lowQuality: boolean;
  getUsePost: () => boolean;
  setUsePost: (on: boolean) => void;
  syncGlow: () => void;
  updateShadow: () => void;
  restoreLiveView: () => void;
  getPlaceId: () => string | null;
  onBusy?: (busy: boolean) => void;
}) {
  const {
    renderer, scene, camera, post, water, shadows, lowQuality,
    getUsePost, setUsePost, syncGlow, updateShadow, restoreLiveView, getPlaceId, onBusy,
  } = opts;

  let busy = false;
  const maxDim = getMaxCaptureDim(renderer, lowQuality);

  function sizeFor(preset: CapturePreset): { width: number; height: number } {
    return computeCaptureSize(preset, innerWidth, innerHeight, devicePixelRatio || 1, maxDim);
  }

  async function capture(
    preset: CapturePreset = 'screen',
    options: { download?: boolean } = {},
  ): Promise<CaptureResult | null> {
    if (busy) return null;
    busy = true;
    onBusy?.(true);

    const prevUsePost = getUsePost();
    const prevPostFast = !!post?.occlusion?.skipAO;
    const prevNearShadow = shadows?.near ? !!shadows.near.castShadow : null;
    const prevReflect = water?.mesh?.material?.uniforms?.uReflect
      ? water.mesh.material.uniforms.uReflect.value > 0.5
      : null;

    try {
      const { width, height } = sizeFor(preset);
      renderer.setPixelRatio(1);
      renderer.setSize(width, height, false);

      if (post) {
        setUsePost(true);
        post.setFast(false);
        post.resize();
      }
      if (water?.mesh?.userData) {
        if (prevReflect !== null) water.mesh.userData.setReflection?.(true);
        water.mesh.userData.resize?.(width, height, 1);
      }
      if (shadows) {
        if (prevNearShadow !== null) shadows.setNearEnabled?.(true);
        shadows.invalidate?.();
        updateShadow();
      }
      syncGlow();

      if (post) post.render();
      else renderer.render(scene, camera);

      const blob = await canvasToPngBlob(renderer.domElement);
      if (!blob) throw new Error('Canvas produced an empty image');

      const filename = buildFilename(getPlaceId(), width, height);
      if (options.download !== false) downloadBlob(blob, filename);
      return { blob, width, height, filename };
    } finally {
      setUsePost(prevUsePost);
      if (post) post.setFast(prevPostFast);
      if (prevReflect !== null) water?.mesh?.userData?.setReflection?.(prevReflect);
      if (prevNearShadow !== null) shadows?.setNearEnabled?.(prevNearShadow);
      restoreLiveView();
      busy = false;
      onBusy?.(false);
    }
  }

  return {
    get busy() { return busy; },
    sizeFor,
    capture,
  };
}
