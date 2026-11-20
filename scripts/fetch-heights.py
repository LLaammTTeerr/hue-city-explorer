#!/usr/bin/env python3
"""Building heights for the slab, from Google Open Buildings 2.5D Temporal (2023 epoch).

Reads the model's box out of the two 25,000 x 25,000 px tiles that cover it (overview level, range requests),
resamples the height band onto a 2 m grid in the model's own frame (metres east and south of the origin in
scripts/build-data.mjs) and writes
  data/raw/heights/open-buildings-2023.u8.gz   heights in half metres, one byte a cell, rows north to south
  data/raw/heights/open-buildings-2023.json    the grid's frame

  python3 -m venv .venv && .venv/bin/pip install rasterio && .venv/bin/python scripts/fetch-heights.py

Source: Sirko et al. 2023, https://sites.research.google/gr/open-buildings/temporal/  Licence: CC BY 4.0 (or ODbL 1.0).
"""
import gzip, json, math
import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.transform import Affine
from rasterio.warp import reproject
from rasterio.windows import from_bounds

BASE = 'https://storage.googleapis.com/open-buildings-temporal-data/v1/geotiffs/3141c_2023_06_30/'
TILES = ['tile_MmkwMjIQ9Kc.tif', 'tile_F73tKZs3AmI.tif']
from frame import ORIGIN, KX, KZ, BOUNDS  # scripts/frame.json, shared with scripts/build-data.mjs
x0, z0, x1, z1 = BOUNDS
STEP = 2.0
nx, nz = int(math.ceil((x1 - x0) / STEP)), int(math.ceil((z1 - z0) / STEP))
dst_tr = Affine(STEP / KX, 0, ORIGIN[1] + x0 / KX, 0, -STEP / KZ, ORIGIN[0] - z0 / KZ)
UTM = (770700, 1812600, 779400, 1825950)  # the box in EPSG:32648, with a margin
height = np.zeros((nz, nx), 'float32')

with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR', CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif', GDAL_HTTP_MAX_RETRY='3'):
    for t in TILES:
        with rasterio.open('/vsicurl/' + BASE + t) as ds:
            b = ds.bounds
            w, s, e, n = max(UTM[0], b.left), max(UTM[1], b.bottom), min(UTM[2], b.right), min(UTM[3], b.top)
            if w >= e or s >= n:
                continue
            win = from_bounds(w, s, e, n, ds.transform).round_offsets().round_lengths()
            shape = (int(win.height // 4), int(win.width // 4))  # 0.5 m pixels -> 2 m, served from the overviews
            hgt = ds.read(2, window=win, out_shape=shape, resampling=Resampling.average)
            pres = ds.read(3, window=win, out_shape=shape, resampling=Resampling.average)
            hgt = np.where((hgt == ds.nodata) | (pres < 0.3), 0, hgt).astype('float32')
            src_tr = ds.window_transform(win) * Affine.scale(win.width / shape[1], win.height / shape[0])
            part = np.zeros_like(height)
            reproject(hgt, part, src_transform=src_tr, src_crs=ds.crs, dst_transform=dst_tr, dst_crs='EPSG:4326', resampling=Resampling.bilinear)
            height = np.maximum(height, part)
            print(t, 'window', shape, 'max', float(hgt.max()))

u8 = np.clip(np.round(height * 2), 0, 255).astype('uint8')
with gzip.open('data/raw/heights/open-buildings-2023.u8.gz', 'wb', compresslevel=9) as f:
    f.write(u8.tobytes())
json.dump({'source': 'Google Open Buildings 2.5D Temporal v1, 2023-06-30', 'licence': 'CC BY 4.0',
           'x0': x0, 'z0': z0, 'step': STEP, 'nx': nx, 'nz': nz, 'unit': 0.5}, open('data/raw/heights/open-buildings-2023.json', 'w'))
print('grid', nx, 'x', nz, '| cells with a building', int((u8 > 0).sum()), '| max', float(height.max()), 'm')
