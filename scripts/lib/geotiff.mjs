// A minimal GeoTIFF reader for the data build: one band, strips or tiles, no compression, LZW or Deflate,
// predictor 1-3, 8-64 bit samples (int, uint or float). Enough for an elevation raster written by GDAL; no dependency.
//
//   const r = readGeoTiff(fs.readFileSync(path));
//   r.width, r.height, r.data (Float64Array, row-major, north row first), r.nodata (number or null),
//   r.lon0, r.lat0 (centre of pixel 0,0), r.dlon, r.dlat (dlat < 0: rows run south), r.description
import zlib from 'node:zlib';

const TYPE_SIZE = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8, 16: 8, 17: 8 };

function lzw(src) {
  // TIFF LZW: MSB-first codes, 9-12 bits, 256 = clear, 257 = end, early change
  const out = [];
  let dict = [], bits = 9, pos = 0, prev = null;
  const reset = () => { dict = []; for (let i = 0; i < 256; i++) dict.push([i]); dict.push(null, null); bits = 9; };
  const read = () => {
    let v = 0;
    for (let i = 0; i < bits; i++) {
      const byte = src[(pos + i) >> 3];
      if (byte === undefined) return 257;
      v = (v << 1) | ((byte >> (7 - ((pos + i) & 7))) & 1);
    }
    pos += bits;
    return v;
  };
  reset();
  for (;;) {
    const code = read();
    if (code === 257) break;
    if (code === 256) { reset(); prev = null; continue; }
    let entry;
    if (code < dict.length && dict[code]) entry = dict[code];
    else if (prev) entry = prev.concat(prev[0]);
    else throw new Error('LZW: bad code ' + code);
    for (const b of entry) out.push(b);
    if (prev) dict.push(prev.concat(entry[0]));
    prev = entry;
    if (dict.length + 1 >= 1 << bits && bits < 12) bits++;
  }
  return Uint8Array.from(out);
}

export function readGeoTiff(buf) {
  const le = buf.toString('latin1', 0, 2) === 'II';
  const u16 = (o) => (le ? buf.readUInt16LE(o) : buf.readUInt16BE(o));
  const u32 = (o) => (le ? buf.readUInt32LE(o) : buf.readUInt32BE(o));
  if (u16(2) !== 42) throw new Error('not a classic TIFF (BigTIFF is not supported)');
  const ifd = u32(4), n = u16(ifd), tags = {};
  for (let i = 0; i < n; i++) {
    const e = ifd + 2 + i * 12, tag = u16(e), type = u16(e + 2), cnt = u32(e + 4), size = TYPE_SIZE[type] * cnt;
    const off = size <= 4 ? e + 8 : u32(e + 8), vals = [];
    for (let k = 0; k < cnt; k++) {
      const o = off + k * TYPE_SIZE[type];
      vals.push(type === 3 ? u16(o) : type === 4 ? u32(o) : type === 12 ? (le ? buf.readDoubleLE(o) : buf.readDoubleBE(o))
        : type === 11 ? (le ? buf.readFloatLE(o) : buf.readFloatBE(o)) : type === 8 ? (le ? buf.readInt16LE(o) : buf.readInt16BE(o)) : buf[o]);
    }
    tags[tag] = type === 2 ? String.fromCharCode(...vals).replace(/\0+$/, '') : vals;
  }
  const W = tags[256][0], H = tags[257][0], bps = tags[258][0], comp = (tags[259] || [1])[0];
  const spp = (tags[277] || [1])[0], pred = (tags[317] || [1])[0], fmt = (tags[339] || [1])[0];
  if (spp !== 1 && (tags[284] || [1])[0] !== 1) throw new Error('only one band (or chunky samples) is supported');
  const tiled = !!tags[322];
  const tw = tiled ? tags[322][0] : W, th = tiled ? tags[323][0] : (tags[278] || [H])[0];
  const offs = tiled ? tags[324] : tags[273], lens = tiled ? tags[325] : tags[279];
  const B = bps / 8, data = new Float64Array(W * H);
  const across = Math.ceil(W / tw);
  for (let c = 0; c < offs.length; c++) {
    let raw = buf.subarray(offs[c], offs[c] + lens[c]);
    if (comp === 5) raw = lzw(raw);
    else if (comp === 8 || comp === 32946) raw = zlib.inflateSync(raw);
    else if (comp !== 1) throw new Error('unsupported compression ' + comp);
    const rowBytes = tw * spp * B, rows = raw.length / rowBytes | 0;
    const bytes = Buffer.from(raw.buffer, raw.byteOffset, raw.length);
    if (pred === 3) {
      // floating-point predictor: bytes byte-differenced, then stored most significant byte plane first
      for (let r = 0; r < rows; r++) {
        const row = bytes.subarray(r * rowBytes, (r + 1) * rowBytes);
        for (let i = 1; i < row.length; i++) row[i] = (row[i] + row[i - 1]) & 255;
        const tmp = Buffer.from(row), cols = tw * spp;
        for (let i = 0; i < cols; i++) for (let k = 0; k < B; k++) row[i * B + (le ? B - 1 - k : k)] = tmp[k * cols + i];
      }
    }
    const read = (o) => {
      if (fmt === 3) return B === 4 ? (le ? bytes.readFloatLE(o) : bytes.readFloatBE(o)) : (le ? bytes.readDoubleLE(o) : bytes.readDoubleBE(o));
      if (fmt === 2) return B === 1 ? bytes.readInt8(o) : B === 2 ? (le ? bytes.readInt16LE(o) : bytes.readInt16BE(o)) : (le ? bytes.readInt32LE(o) : bytes.readInt32BE(o));
      return B === 1 ? bytes[o] : B === 2 ? (le ? bytes.readUInt16LE(o) : bytes.readUInt16BE(o)) : (le ? bytes.readUInt32LE(o) : bytes.readUInt32BE(o));
    };
    const cx = tiled ? (c % across) * tw : 0, cy = tiled ? Math.floor(c / across) * th : c * th;
    for (let r = 0; r < Math.min(th, rows); r++) {
      const y = cy + r;
      if (y >= H) break;
      let acc = 0;
      for (let i = 0; i < tw; i++) {
        let v = read((r * tw + i) * spp * B);
        if (pred === 2) { acc = i ? acc + v : v; v = acc; }
        const x = cx + i;
        if (x < W) data[y * W + x] = v;
      }
    }
  }
  // georeferencing: ModelPixelScale + ModelTiepoint; GeoKey 1025 (raster type) 2 = PixelIsPoint
  const scale = tags[33550], tie = tags[33922];
  if (!scale || !tie) throw new Error('no georeferencing (ModelPixelScale / ModelTiepoint)');
  const keys = tags[34735] || [], geo = {};
  for (let i = 4; i + 3 < keys.length; i += 4) geo[keys[i]] = keys[i + 2] === 0 ? keys[i + 3] : keys[i + 3];
  if (geo[1024] !== undefined && geo[1024] !== 2) throw new Error('not a geographic (lat/lon) raster');
  if (geo[2048] !== undefined && geo[2048] !== 4326) throw new Error('not WGS 84 (EPSG ' + geo[2048] + ')');
  const isPoint = geo[1025] === 2;
  const dlon = scale[0], dlat = -scale[1];
  // tiepoint: raster (i, j) -> (lon, lat); pixel-is-area means it names the corner of the pixel, so step half a pixel in
  const half = isPoint ? 0 : 0.5;
  const lon0 = tie[3] + (half - tie[0]) * dlon, lat0 = tie[4] + (half - tie[1]) * dlat;
  const nd = tags[42113] ? parseFloat(tags[42113]) : null;
  const desc = typeof tags[42112] === 'string' ? (/role="description">([^<]*)</.exec(tags[42112]) || [])[1] || '' : '';
  return { width: W, height: H, data, nodata: Number.isFinite(nd) ? nd : null, lon0, lat0, dlon, dlat, pixelIsPoint: isPoint, description: desc };
}
