// Compact columnar + delta binary codec (HUB2) for Hue's bulk geometry & numeric tables.
// Files are stored gzip-compressed on disk (.bin) and inflated via native DecompressionStream('gzip') in the browser
// or node:zlib in build/check scripts. Backwards-compatible with v1 hue.bin buffers.

const HUB2_MAGIC = 0x32425548; // 'HUB2' little-endian
const align4 = (n: number) => (n + 3) & ~3;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

class ByteWriter {
  buf: Uint8Array;
  view: DataView;
  off: number;

  constructor(initialBytes = 2 * 1024 * 1024) {
    this.buf = new Uint8Array(initialBytes);
    this.view = new DataView(this.buf.buffer);
    this.off = 0;
  }

  ensure(extra: number) {
    if (this.off + extra <= this.buf.length) return;
    let cap = this.buf.length * 2;
    while (cap < this.off + extra) cap *= 2;
    const next = new Uint8Array(cap);
    next.set(this.buf.subarray(0, this.off));
    this.buf = next;
    this.view = new DataView(next.buffer);
  }

  u8(v: number) { this.ensure(1); this.buf[this.off++] = v & 0xff; }
  u16(v: number) { this.ensure(2); this.view.setUint16(this.off, v, true); this.off += 2; }
  i16(v: number) { this.ensure(2); this.view.setInt16(this.off, v, true); this.off += 2; }
  u32(v: number) { this.ensure(4); this.view.setUint32(this.off, v >>> 0, true); this.off += 4; }
  i32(v: number) { this.ensure(4); this.view.setInt32(this.off, v | 0, true); this.off += 4; }
  f32(v: number) { this.ensure(4); this.view.setFloat32(this.off, v, true); this.off += 4; }

  bytes(arr: Uint8Array) {
    this.u32(arr.length);
    this.ensure(arr.length);
    this.buf.set(arr, this.off);
    this.off += arr.length;
  }

  strTable(strings: string[]) {
    this.bytes(textEncoder.encode(JSON.stringify(strings)));
  }

  deltaCoords(flat: ArrayLike<number>) {
    const n = flat.length;
    this.u32(n);
    this.ensure(n * 4);
    let px = 0, pz = 0;
    for (let i = 0; i + 1 < n; i += 2) {
      const x = flat[i] | 0, z = flat[i + 1] | 0;
      this.view.setInt32(this.off, x - px, true);
      this.view.setInt32(this.off + 4, z - pz, true);
      px = x; pz = z;
      this.off += 8;
    }
  }

  polys(list: number[][][]) {
    this.u32(list.length);
    for (const poly of list) {
      this.u16(poly.length);
      for (const ring of poly) this.deltaCoords(ring);
    }
  }

  finish(): Uint8Array {
    return this.buf.subarray(0, this.off);
  }
}

class ByteReader {
  bytes: Uint8Array;
  view: DataView;
  off: number;

  constructor(buf: ArrayBuffer | ArrayBufferView, startOffset = 0) {
    if (ArrayBuffer.isView(buf)) {
      this.bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
      this.view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    } else {
      this.bytes = new Uint8Array(buf);
      this.view = new DataView(buf);
    }
    this.off = startOffset;
  }

  u8(): number { return this.bytes[this.off++]; }
  u16(): number { const v = this.view.getUint16(this.off, true); this.off += 2; return v; }
  i16(): number { const v = this.view.getInt16(this.off, true); this.off += 2; return v; }
  u32(): number { const v = this.view.getUint32(this.off, true); this.off += 4; return v; }
  i32(): number { const v = this.view.getInt32(this.off, true); this.off += 4; return v; }
  f32(): number { const v = this.view.getFloat32(this.off, true); this.off += 4; return v; }

  byteSlice(): Uint8Array {
    const len = this.u32();
    const out = this.bytes.slice(this.off, this.off + len);
    this.off += len;
    return out;
  }

  strTable(): string[] {
    const len = this.u32();
    const s = textDecoder.decode(this.bytes.subarray(this.off, this.off + len));
    this.off += len;
    return JSON.parse(s);
  }

  deltaCoords(): number[] {
    const n = this.u32();
    const out = new Array<number>(n);
    let px = 0, pz = 0;
    for (let i = 0; i + 1 < n; i += 2) {
      px += this.view.getInt32(this.off, true);
      pz += this.view.getInt32(this.off + 4, true);
      out[i] = px;
      out[i + 1] = pz;
      this.off += 8;
    }
    return out;
  }

  polys(): number[][][] {
    const count = this.u32();
    const out = new Array<number[][]>(count);
    for (let i = 0; i < count; i++) {
      const rings = this.u16();
      const poly = new Array<number[]>(rings);
      for (let r = 0; r < rings; r++) poly[r] = this.deltaCoords();
      out[i] = poly;
    }
    return out;
  }
}

function writeTreesRaw(view: DataView, off: number, arr: ArrayLike<number>, count: number): number {
  let px = 0, pz = 0;
  for (let i = 0; i < count; i++) { const v = arr[i * 4]; view.setInt32(off, v - px, true); px = v; off += 4; }
  for (let i = 0; i < count; i++) { const v = arr[i * 4 + 1]; view.setInt32(off, v - pz, true); pz = v; off += 4; }
  for (let i = 0; i < count; i++) { view.setUint8(off++, arr[i * 4 + 2]); }
  for (let i = 0; i < count; i++) { view.setUint8(off++, arr[i * 4 + 3]); }
  return align4(off);
}

function readTreesRaw(view: DataView, off: number, count: number): [Int32Array, number] {
  const out = new Int32Array(count * 4);
  let px = 0, pz = 0;
  for (let i = 0; i < count; i++) { px += view.getInt32(off, true); out[i * 4] = px; off += 4; }
  for (let i = 0; i < count; i++) { pz += view.getInt32(off, true); out[i * 4 + 1] = pz; off += 4; }
  for (let i = 0; i < count; i++) { out[i * 4 + 2] = view.getUint8(off++); }
  for (let i = 0; i < count; i++) { out[i * 4 + 3] = view.getUint8(off++); }
  return [out, align4(off)];
}

function writeInfillRaw(view: DataView, off: number, arr: ArrayLike<number>, count: number): number {
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

function readInfillRaw(view: DataView, off: number, count: number): [Int32Array, number] {
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

export interface HueBinPayload {
  h: ArrayLike<number>;
  cover?: string | Uint8Array | null;
  trees: ArrayLike<number>;
  infill: ArrayLike<number>;
  land?: number[][][];
  ponds?: number[][][];
  green?: [string, number[][]][];
  roads?: any[];
  medians?: [number, number[], number[]][];
  bld?: any[];
  streetLabels?: [string, number, number, number, number, number][];
  precomputed?: any;
}

export function encodeHueBin(
  hOrPayload: ArrayLike<number> | HueBinPayload,
  treesArg?: ArrayLike<number>,
  infillArg?: ArrayLike<number>,
): Uint8Array {
  const payload: HueBinPayload = (hOrPayload && typeof hOrPayload === 'object' && 'trees' in hOrPayload && !ArrayBuffer.isView(hOrPayload) && !Array.isArray(hOrPayload))
    ? (hOrPayload as HueBinPayload)
    : { h: hOrPayload as ArrayLike<number>, trees: treesArg || [], infill: infillArg || [] };

  const w = new ByteWriter(3 * 1024 * 1024);
  w.u32(HUB2_MAGIC);

  // 1. Terrain heights (delta i16) + cover grid (u8)
  const h = payload.h || [];
  w.u32(h.length);
  w.ensure(h.length * 2);
  let ph = 0;
  for (let i = 0; i < h.length; i++) {
    const v = h[i] | 0;
    w.view.setInt16(w.off, v - ph, true);
    ph = v;
    w.off += 2;
  }
  if (payload.cover) {
    const cov = typeof payload.cover === 'string'
      ? Uint8Array.from(payload.cover, (ch) => ch.charCodeAt(0) - 48)
      : payload.cover;
    w.u8(1);
    w.bytes(cov);
  } else {
    w.u8(0);
  }

  // 2. First-frame trees & infill (columnar SoA)
  const treeCount = Math.floor(payload.trees.length / 4);
  const infillCount = Math.floor(payload.infill.length / 8);
  w.u32(treeCount);
  w.u32(infillCount);
  w.off = align4(w.off);
  w.ensure(align4(treeCount * 10) + align4(infillCount * 18) + 16);
  w.off = writeTreesRaw(w.view, w.off, payload.trees, treeCount);
  w.off = writeInfillRaw(w.view, w.off, payload.infill, infillCount);

  // 3. Land & ponds multi-polygons
  const hasGeo = !!(payload.land && payload.ponds && payload.green && payload.roads && payload.medians && payload.bld);
  w.u8(hasGeo ? 1 : 0);
  if (hasGeo) {
    w.polys(payload.land!);
    w.polys(payload.ponds!);

    // Green polygons
    const greenKinds: string[] = [];
    const greenKindIdx = new Map<string, number>();
    for (const [k] of payload.green!) {
      if (!greenKindIdx.has(k)) { greenKindIdx.set(k, greenKinds.length); greenKinds.push(k); }
    }
    w.strTable(greenKinds);
    w.u32(payload.green!.length);
    for (const [k, poly] of payload.green!) {
      w.u8(greenKindIdx.get(k)!);
      w.u16(poly.length);
      for (const ring of poly) w.deltaCoords(ring);
    }

    // Roads: [c, bridge, pts, w?, ws?, lanes?]
    w.u32(payload.roads!.length);
    for (const r of payload.roads!) {
      const has3 = r.length > 3;
      const has4 = r.length > 4;
      const isArr4 = has4 && Array.isArray(r[4]);
      const has5 = r.length > 5;
      const flags = (has3 ? 1 : 0) | (has4 ? 2 : 0) | (isArr4 ? 4 : 0) | (has5 ? 8 : 0);
      w.u8(r[0]);
      w.u8(r[1]);
      w.u8(flags);
      w.deltaCoords(r[2]);
      if (has3) w.i32(r[3]);
      if (isArr4) {
        for (let i = 0; i < r[4].length; i++) w.i16(r[4][i]);
      }
      if (has5) w.u8(r[5]);
    }

    // Medians: [w, pts, ws]
    w.u32(payload.medians!.length);
    for (const [mw, pts, ws] of payload.medians!) {
      w.i32(mw);
      w.deltaCoords(pts);
      for (let i = 0; i < ws.length; i++) w.i16(ws[i]);
    }

    // Buildings: [ring, h, kind, nameOrZero, flags, measuredH?, trueH?]
    const bldNames: string[] = [];
    const bldNameIdx = new Map<string, number>();
    for (const b of payload.bld!) {
      if (typeof b[3] === 'string' && !bldNameIdx.has(b[3])) {
        bldNameIdx.set(b[3], bldNames.length);
        bldNames.push(b[3]);
      }
    }
    w.strTable(bldNames);
    w.u32(payload.bld!.length);
    for (const b of payload.bld!) {
      const hasName = typeof b[3] === 'string';
      const has5 = b.length > 5 && b[5] !== undefined;
      const has6 = b.length > 6 && b[6] !== undefined;
      const meta = (b.length & 0x0f) | (hasName ? 16 : 0) | (has5 ? 32 : 0) | (has6 ? 64 : 0);
      w.u8(meta);
      w.deltaCoords(b[0]);
      w.i32(b[1]);
      w.u8(b[2]);
      if (hasName) w.u16(bldNameIdx.get(b[3])!);
      w.u16(b[4] || 0);
      if (has5) w.i32(b[5] || 0);
      if (has6) w.u8(b[6] || 0);
    }
  }

  // 4. Street labels: [name, x_dm, z_dm, dx_1000, dz_1000, cls]
  if (payload.streetLabels) {
    w.u8(1);
    const stNames: string[] = [];
    const stIdx = new Map<string, number>();
    for (const [name] of payload.streetLabels) {
      if (!stIdx.has(name)) { stIdx.set(name, stNames.length); stNames.push(name); }
    }
    w.strTable(stNames);
    w.u32(payload.streetLabels.length);
    let px = 0, pz = 0;
    for (const [name, x, z, dx, dz, cls] of payload.streetLabels) {
      w.u16(stIdx.get(name)!);
      w.i32(x - px);
      w.i32(z - pz);
      px = x; pz = z;
      w.i16(dx);
      w.i16(dz);
      w.u8(cls);
    }
  } else {
    w.u8(0);
  }

  // 5. Precomputed junction holes, slivers, boat routes & lane dashes
  const pre = payload.precomputed;
  if (pre) {
    w.u8(1);
    const holes = pre.holes || [];
    w.u32(holes.length);
    for (const [c, x, z, area, flatRects] of holes) {
      w.u8(c);
      w.i32(Math.round(x * 100));
      w.i32(Math.round(z * 100));
      w.i32(Math.round(area * 100));
      w.u32(flatRects.length);
      for (let i = 0; i < flatRects.length; i++) w.i32(Math.round(flatRects[i] * 100));
    }
    const hc = pre.holeCells || [];
    w.u32(hc.length);
    let prevCell = 0;
    for (let i = 0; i < hc.length; i++) { w.i32(hc[i] - prevCell); prevCell = hc[i]; }

    const slv = pre.slivers || [];
    w.u32(slv.length);
    for (const [c, flatPts, ws] of slv) {
      w.u8(c);
      w.u32(ws.length);
      let sx = 0, sz = 0;
      for (let i = 0; i < flatPts.length; i += 2) {
        const ix = Math.round(flatPts[i] * 100), iz = Math.round(flatPts[i + 1] * 100);
        w.i32(ix - sx); w.i32(iz - sz);
        sx = ix; sz = iz;
      }
      for (let i = 0; i < ws.length; i++) w.i16(Math.round(ws[i] * 100));
    }

    const routes = pre.boatRoutes || [];
    w.u32(routes.length);
    for (const [lane, lo, hi] of routes) {
      w.i32(Math.round(lane * 100));
      w.i32(Math.round(lo * 100));
      w.i32(Math.round(hi * 100));
    }

    const dashes = pre.dashes || [];
    w.u32(dashes.length);
    let prevDashId = 0, prevDashS0 = 0;
    for (const [id, s0] of dashes) {
      w.i32(id - prevDashId);
      w.i32(s0 - prevDashS0);
      prevDashId = id;
      prevDashS0 = s0;
    }
  } else {
    w.u8(0);
  }

  return w.finish();
}

function decodeHueBinV1(view: DataView) {
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
  [treesTyped, off] = readTreesRaw(view, off, treeCount);
  const [infillTyped] = readInfillRaw(view, off, infillCount);
  return { h, trees: Array.from(treesTyped), infill: Array.from(infillTyped) };
}

export function decodeHueBin(buf: ArrayBuffer | ArrayBufferView): any {
  const r = new ByteReader(buf, 0);
  if (r.view.byteLength < 4 || r.view.getUint32(0, true) !== HUB2_MAGIC) {
    return decodeHueBinV1(r.view);
  }
  r.off = 4;

  const hLen = r.u32();
  const h = new Int16Array(hLen);
  let ph = 0;
  for (let i = 0; i < hLen; i++) {
    ph += r.i16();
    h[i] = ph;
  }
  const cover = r.u8() ? r.byteSlice() : undefined;

  const treeCount = r.u32();
  const infillCount = r.u32();
  r.off = align4(r.off);
  let treesTyped: Int32Array;
  [treesTyped, r.off] = readTreesRaw(r.view, r.off, treeCount);
  let infillTyped: Int32Array;
  [infillTyped, r.off] = readInfillRaw(r.view, r.off, infillCount);

  const out: any = {
    h,
    ...(cover ? { cover } : {}),
    // First-frame trees/infill may be mutated (e.g. `.push()`) by place builders before populate()
    trees: Array.from(treesTyped),
    infill: Array.from(infillTyped),
  };

  if (r.u8()) {
    out.land = r.polys();
    out.ponds = r.polys();

    const greenKinds = r.strTable();
    const greenCount = r.u32();
    const green = new Array<[string, number[][]]>(greenCount);
    for (let i = 0; i < greenCount; i++) {
      const k = greenKinds[r.u8()];
      const ringCount = r.u16();
      const poly = new Array<number[]>(ringCount);
      for (let j = 0; j < ringCount; j++) poly[j] = r.deltaCoords();
      green[i] = [k, poly];
    }
    out.green = green;

    const roadCount = r.u32();
    const roads = new Array<any>(roadCount);
    for (let i = 0; i < roadCount; i++) {
      const c = r.u8();
      const bridge = r.u8();
      const flags = r.u8();
      const pts = r.deltaCoords();
      const rec: any[] = [c, bridge, pts];
      if (flags & 1) rec.push(r.i32());
      if (flags & 2) {
        if (flags & 4) {
          const nPts = pts.length >> 1;
          const ws = new Array<number>(nPts);
          for (let j = 0; j < nPts; j++) ws[j] = r.i16();
          rec.push(ws);
        } else {
          rec.push(0);
        }
      }
      if (flags & 8) rec.push(r.u8());
      roads[i] = rec;
    }
    out.roads = roads;

    const medCount = r.u32();
    const medians = new Array<[number, number[], number[]]>(medCount);
    for (let i = 0; i < medCount; i++) {
      const mw = r.i32();
      const pts = r.deltaCoords();
      const nPts = pts.length >> 1;
      const ws = new Array<number>(nPts);
      for (let j = 0; j < nPts; j++) ws[j] = r.i16();
      medians[i] = [mw, pts, ws];
    }
    out.medians = medians;

    const bldNames = r.strTable();
    const bldCount = r.u32();
    const bld = new Array<any>(bldCount);
    for (let i = 0; i < bldCount; i++) {
      const meta = r.u8();
      const len = meta & 0x0f;
      const ring = r.deltaCoords();
      const bh = r.i32();
      const kind = r.u8();
      const name = (meta & 16) ? bldNames[r.u16()] : 0;
      const bFlags = r.u16();
      const rec: any[] = [ring, bh, kind, name, bFlags];
      if (meta & 32) rec.push(r.i32());
      else if (len > 5) rec.push(undefined);
      if (meta & 64) rec.push(r.u8());
      bld[i] = rec;
    }
    out.bld = bld;
  }

  if (r.u8()) {
    const stNames = r.strTable();
    const stCount = r.u32();
    const streetLabels = new Array<[string, number, number, number, number, number]>(stCount);
    let px = 0, pz = 0;
    for (let i = 0; i < stCount; i++) {
      const name = stNames[r.u16()];
      px += r.i32();
      pz += r.i32();
      const dx = r.i16();
      const dz = r.i16();
      const cls = r.u8();
      streetLabels[i] = [name, px, pz, dx, dz, cls];
    }
    out.streetLabels = streetLabels;
  }

  if (r.u8()) {
    const holeCount = r.u32();
    const holes = new Array<any>(holeCount);
    for (let i = 0; i < holeCount; i++) {
      const c = r.u8();
      const x = r.i32() / 100;
      const z = r.i32() / 100;
      const area = r.i32() / 100;
      const rLen = r.u32();
      const flatRects = new Array<number>(rLen);
      for (let j = 0; j < rLen; j++) flatRects[j] = r.i32() / 100;
      holes[i] = [c, x, z, area, flatRects];
    }
    const hcLen = r.u32();
    const holeCells = new Array<number>(hcLen);
    let prevCell = 0;
    for (let i = 0; i < hcLen; i++) { prevCell += r.i32(); holeCells[i] = prevCell; }

    const slvCount = r.u32();
    const slivers = new Array<any>(slvCount);
    for (let i = 0; i < slvCount; i++) {
      const c = r.u8();
      const ptCount = r.u32();
      const flatPts = new Array<number>(ptCount * 2);
      let sx = 0, sz = 0;
      for (let j = 0; j < ptCount; j++) {
        sx += r.i32(); sz += r.i32();
        flatPts[j * 2] = sx / 100;
        flatPts[j * 2 + 1] = sz / 100;
      }
      const ws = new Array<number>(ptCount);
      for (let j = 0; j < ptCount; j++) ws[j] = r.i16() / 100;
      slivers[i] = [c, flatPts, ws];
    }

    const routeCount = r.u32();
    const boatRoutes = new Array<[number, number, number]>(routeCount);
    for (let i = 0; i < routeCount; i++) {
      boatRoutes[i] = [r.i32() / 100, r.i32() / 100, r.i32() / 100];
    }

    const dashCount = r.u32();
    const dashes = new Array<[number, number]>(dashCount);
    let prevDashId = 0, prevDashS0 = 0;
    for (let i = 0; i < dashCount; i++) {
      prevDashId += r.i32();
      prevDashS0 += r.i32();
      dashes[i] = [prevDashId, prevDashS0];
    }
    out.precomputed = { holes, holeCells, slivers, boatRoutes, ...(dashCount ? { dashes } : {}) };
  }

  return out;
}

export function hydrateHueData(data: any, binBuf: ArrayBuffer | ArrayBufferView) {
  const dec = decodeHueBin(binBuf);
  if (data.terrain) {
    data.terrain.h = dec.h;
    if (dec.cover) data.terrain.cover = dec.cover;
  }
  data.trees = dec.trees;
  data.infill = dec.infill;
  if (dec.land) data.land = dec.land;
  if (dec.ponds) data.ponds = dec.ponds;
  if (dec.green) data.green = dec.green;
  if (dec.roads) data.roads = dec.roads;
  if (dec.medians) data.medians = dec.medians;
  if (dec.bld) data.bld = dec.bld;
  if (dec.streetLabels) data.streetLabels = dec.streetLabels;
  if (dec.precomputed) data.precomputed = dec.precomputed;
  return data;
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
  off = writeTreesRaw(view, off, body.trees, treeCount);
  writeInfillRaw(view, off, body.infill, infillCount);
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
  [trees, off] = readTreesRaw(view, off, treeCount);
  const [infill] = readInfillRaw(view, off, infillCount);
  return { i0, treesNear, infillNear, trees, infill };
}
