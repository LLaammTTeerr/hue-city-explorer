// Compact columnar SoA + delta binary codec for Hue's bulk numeric arrays (terrain heights, trees, infill houses).
// Files are stored gzip-compressed on disk (.bin) and inflated via native DecompressionStream('gzip') in the browser
// or node:zlib in build/check scripts.

const align4 = (n: number) => (n + 3) & ~3;

function writeTrees(view: DataView, off: number, arr: ArrayLike<number>, count: number): number {
  let px = 0, pz = 0;
  for (let i = 0; i < count; i++) { const v = arr[i * 4]; view.setInt32(off, v - px, true); px = v; off += 4; }
  for (let i = 0; i < count; i++) { const v = arr[i * 4 + 1]; view.setInt32(off, v - pz, true); pz = v; off += 4; }
  for (let i = 0; i < count; i++) { view.setUint8(off++, arr[i * 4 + 2]); }
  for (let i = 0; i < count; i++) { view.setUint8(off++, arr[i * 4 + 3]); }
  return align4(off);
}

function readTrees(view: DataView, off: number, count: number): [Int32Array, number] {
  const out = new Int32Array(count * 4);
  let px = 0, pz = 0;
  for (let i = 0; i < count; i++) { px += view.getInt32(off, true); out[i * 4] = px; off += 4; }
  for (let i = 0; i < count; i++) { pz += view.getInt32(off, true); out[i * 4 + 1] = pz; off += 4; }
  for (let i = 0; i < count; i++) { out[i * 4 + 2] = view.getUint8(off++); }
  for (let i = 0; i < count; i++) { out[i * 4 + 3] = view.getUint8(off++); }
  return [out, align4(off)];
}

function writeInfill(view: DataView, off: number, arr: ArrayLike<number>, count: number): number {
  let px = 0, pz = 0;
  for (let i = 0; i < count; i++) { const v = arr[i * 8]; view.setInt32(off, v - px, true); px = v; off += 4; }
  for (let i = 0; i < count; i++) { const v = arr[i * 8 + 1]; view.setInt32(off, v - pz, true); pz = v; off += 4; }
  for (let c = 2; c <= 5; c++) {
    for (let i = 0; i < count; i++) { view.setInt16(off, arr[i * 8 + c], true); off += 2; }
  }
  for (let c = 6; c <= 7; c++) {
    for (let i = 0; i < count; i++) { view.setUint8(off++, arr[i * 8 + c]); }
  }
  return align4(off);
}

function readInfill(view: DataView, off: number, count: number): [Int32Array, number] {
  const out = new Int32Array(count * 8);
  let px = 0, pz = 0;
  for (let i = 0; i < count; i++) { px += view.getInt32(off, true); out[i * 8] = px; off += 4; }
  for (let i = 0; i < count; i++) { pz += view.getInt32(off, true); out[i * 8 + 1] = pz; off += 4; }
  for (let c = 2; c <= 5; c++) {
    for (let i = 0; i < count; i++) { out[i * 8 + c] = view.getInt16(off, true); off += 2; }
  }
  for (let c = 6; c <= 7; c++) {
    for (let i = 0; i < count; i++) { out[i * 8 + c] = view.getUint8(off++); }
  }
  return [out, align4(off)];
}

export function encodeHueBin(h: ArrayLike<number>, trees: ArrayLike<number>, infill: ArrayLike<number>): Uint8Array {
  const hLen = h.length;
  const treeCount = Math.floor(trees.length / 4);
  const infillCount = Math.floor(infill.length / 8);
  const totalBytes = 12 + align4(hLen * 2) + align4(treeCount * 10) + align4(infillCount * 18);
  const bytes = new Uint8Array(totalBytes);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, hLen, true);
  view.setUint32(4, treeCount, true);
  view.setUint32(8, infillCount, true);
  let off = 12;
  let ph = 0;
  for (let i = 0; i < hLen; i++) {
    const v = h[i];
    view.setInt16(off, v - ph, true);
    ph = v;
    off += 2;
  }
  off = align4(off);
  off = writeTrees(view, off, trees, treeCount);
  writeInfill(view, off, infill, infillCount);
  return bytes;
}

export function decodeHueBin(buf: ArrayBuffer | ArrayBufferView): { h: Int16Array; trees: number[]; infill: number[] } {
  const view = ArrayBuffer.isView(buf)
    ? new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
    : new DataView(buf);
  const hLen = view.getUint32(0, true);
  const treeCount = view.getUint32(4, true);
  const infillCount = view.getUint32(8, true);
  let off = 12;
  const h = new Int16Array(hLen);
  let ph = 0;
  for (let i = 0; i < hLen; i++) {
    ph += view.getInt16(off, true);
    h[i] = ph;
    off += 2;
  }
  off = align4(off);
  let treesTyped: Int32Array;
  [treesTyped, off] = readTrees(view, off, treeCount);
  const [infillTyped] = readInfill(view, off, infillCount);
  // First-frame trees/infill may be mutated (e.g. `.push()`) by place builders before populate()
  return { h, trees: Array.from(treesTyped), infill: Array.from(infillTyped) };
}

export function encodeTileBin(body: { i0: [number, number]; treesNear: number; infillNear: number; trees: ArrayLike<number>; infill: ArrayLike<number> }): Uint8Array {
  const treeCount = Math.floor(body.trees.length / 4);
  const infillCount = Math.floor(body.infill.length / 8);
  const totalBytes = 24 + align4(treeCount * 10) + align4(infillCount * 18);
  const bytes = new Uint8Array(totalBytes);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, body.i0[0], true);
  view.setUint32(4, body.i0[1], true);
  view.setUint32(8, body.treesNear, true);
  view.setUint32(12, body.infillNear, true);
  view.setUint32(16, treeCount, true);
  view.setUint32(20, infillCount, true);
  let off = 24;
  off = writeTrees(view, off, body.trees, treeCount);
  writeInfill(view, off, body.infill, infillCount);
  return bytes;
}

export function decodeTileBin(buf: ArrayBuffer | ArrayBufferView): { i0: [number, number]; treesNear: number; infillNear: number; trees: Int32Array; infill: Int32Array } {
  const view = ArrayBuffer.isView(buf)
    ? new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
    : new DataView(buf);
  const i0: [number, number] = [view.getUint32(0, true), view.getUint32(4, true)];
  const treesNear = view.getUint32(8, true);
  const infillNear = view.getUint32(12, true);
  const treeCount = view.getUint32(16, true);
  const infillCount = view.getUint32(20, true);
  let off = 24;
  let trees: Int32Array;
  [trees, off] = readTrees(view, off, treeCount);
  const [infill] = readInfill(view, off, infillCount);
  return { i0, treesNear, infillNear, trees, infill };
}
