// A sparse grid of 1 m cells holding a few bit flags each, for the "is anything built here" tests run hundreds of
// thousands of times while the city is planted. Cells live in 64 × 64 tiles made on first write, so memory follows
// what is built, and a lookup is one Map read on a small-integer key plus one array read (a Set of cell keys
// beyond the small-integer range hashes a heap number per call and was the slowest part of the build).
const TILE_BITS = 6;
const TILE = 1 << TILE_BITS;
const MASK = TILE - 1;
const OFFSET = 1 << 14; // tiles of ±16384 (±1000 km): the key stays a small integer

const tileKey = (tx: number, tz: number) => (tx + OFFSET) * (OFFSET * 2) + (tz + OFFSET);

export class CellGrid {
  tiles = new Map<number, Uint8Array>();

  set(ix: number, iz: number, flags: number) {
    const key = tileKey(ix >> TILE_BITS, iz >> TILE_BITS);
    let tile = this.tiles.get(key);
    if (!tile) this.tiles.set(key, (tile = new Uint8Array(TILE * TILE)));
    tile[((iz & MASK) << TILE_BITS) | (ix & MASK)] |= flags;
  }

  get(ix: number, iz: number): number {
    const tile = this.tiles.get(tileKey(ix >> TILE_BITS, iz >> TILE_BITS));
    return tile ? tile[((iz & MASK) << TILE_BITS) | (ix & MASK)] : 0;
  }

  // flags of the cell holding the point (x, z) in metres
  at(x: number, z: number): number {
    return this.get(Math.floor(x), Math.floor(z));
  }
}
