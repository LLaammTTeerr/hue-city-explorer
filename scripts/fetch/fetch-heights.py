#!/usr/bin/env python3
"""Building heights for the slab, from Google Open Buildings 2.5D Temporal (2023 epoch).

Reads both tiles concurrently via HTTP/2 multiplexed range requests and multi-band overview reads,
resamples onto a 2 m grid in the model's own frame and writes:
  data/raw/heights/open-buildings-2023.u8.gz   heights in half metres, one byte a cell, rows north to south
  data/raw/heights/open-buildings-2023.json    the grid's frame
"""
from concurrent.futures import ThreadPoolExecutor
import gzip, json, math, os, sys
import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.transform import Affine
from rasterio.warp import reproject
from rasterio.windows import from_bounds

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from frame import ORIGIN, KX, KZ, BOUNDS  # noqa: E402

BASE = 'https://storage.googleapis.com/open-buildings-temporal-data/v1/geotiffs/3141c_2023_06_30/'
TILES = ['tile_MmkwMjIQ9Kc.tif', 'tile_F73tKZs3AmI.tif']
x0, z0, x1, z1 = BOUNDS
STEP = 2.0
nx, nz = int(math.ceil((x1 - x0) / STEP)), int(math.ceil((z1 - z0) / STEP))
dst_tr = Affine(STEP / KX, 0, ORIGIN[1] + x0 / KX, 0, -STEP / KZ, ORIGIN[0] - z0 / KZ)
UTM = (770700, 1812600, 780200, 1825950)
GDAL_ENV = dict(
    GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR',
    CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif',
    CPL_VSIL_CURL_CHUNK_SIZE='1048576',
    GDAL_HTTP_MULTIPLEX='YES',
    GDAL_HTTP_MERGE_CONSECUTIVE_RANGES='YES',
    GDAL_HTTP_VERSION='2',
    VSI_CACHE='TRUE',
    GDAL_HTTP_MAX_RETRY='3',
    GDAL_NUM_THREADS='ALL_CPUS',
)


def read_tile(t):
    with rasterio.Env(**GDAL_ENV):
        with rasterio.open('/vsicurl/' + BASE + t) as ds:
            b = ds.bounds
            w, s, e, n = max(UTM[0], b.left), max(UTM[1], b.bottom), min(UTM[2], b.right), min(UTM[3], b.top)
            if w >= e or s >= n:
                return None
            win = from_bounds(w, s, e, n, ds.transform).round_offsets().round_lengths()
            shape = (int(win.height // 4), int(win.width // 4))
            both = ds.read([2, 3], window=win, out_shape=(2, shape[0], shape[1]), resampling=Resampling.average)
            hgt, pres = both[0], both[1]
            hgt = np.where((hgt == ds.nodata) | (pres < 0.3), 0, hgt).astype('float32')
            src_tr = ds.window_transform(win) * Affine.scale(win.width / shape[1], win.height / shape[0])
            part = np.zeros((nz, nx), 'float32')
            reproject(hgt, part, src_transform=src_tr, src_crs=ds.crs, dst_transform=dst_tr, dst_crs='EPSG:4326', resampling=Resampling.bilinear, num_threads=4)
            print(t, 'window', shape, 'max', float(hgt.max()))
            return part


height = np.zeros((nz, nx), 'float32')
with ThreadPoolExecutor(max_workers=len(TILES)) as pool:
    for part in pool.map(read_tile, TILES):
        if part is not None:
            height = np.maximum(height, part)

os.makedirs('data/raw/heights', exist_ok=True)
u8 = np.clip(np.rint(height * 2), 0, 255).astype('uint8')
with gzip.open('data/raw/heights/open-buildings-2023.u8.gz', 'wb', compresslevel=9) as f:
    f.write(u8.tobytes())
with open('data/raw/heights/open-buildings-2023.json', 'w') as f:
    json.dump({'source': 'Google Open Buildings 2.5D Temporal v1, 2023-06-30', 'licence': 'CC BY 4.0',
               'x0': x0, 'z0': z0, 'step': STEP, 'nx': nx, 'nz': nz, 'unit': 0.5}, f)
print('grid', nx, 'x', nz, '| cells with a building', int((u8 > 0).sum()), '| max', float(height.max()), 'm')
