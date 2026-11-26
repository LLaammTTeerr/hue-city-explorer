#!/usr/bin/env python3
"""Terrain for the slab: FABDEM v1-2 and Copernicus GLO-30 surface on the same 1 arc-second grid.

Fetches both remote rasters concurrently via HTTP/2 multiplexed range requests and writes data/raw/dem/terrain.json.
"""
from concurrent.futures import ThreadPoolExecutor
import json, os
import numpy as np
import rasterio
from rasterio.windows import from_bounds

URL = '/vsizip//vsicurl/https://data.bris.ac.uk/datasets/s5hqmjcdj8yo2ibzi9b4ew3sn/N10E100-N20E110_FABDEM_V1-2.zip/N16E107_FABDEM_V1-2.tif'
COP = '/vsicurl/https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_N16_00_E107_00_DEM/Copernicus_DSM_COG_10_N16_00_E107_00_DEM.tif'
W, S, E, N = 107.530, 16.375, 107.620, 16.537
OUT = 'data/raw/dem/terrain.json'
GDAL_ENV = dict(
    GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR',
    CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif,.zip',
    CPL_VSIL_CURL_CHUNK_SIZE='1048576',
    GDAL_HTTP_MULTIPLEX='YES',
    GDAL_HTTP_MERGE_CONSECUTIVE_RANGES='YES',
    GDAL_HTTP_VERSION='2',
    VSI_CACHE='TRUE',
    GDAL_HTTP_MAX_RETRY='3',
)


def fetch_window(src_url):
    with rasterio.Env(**GDAL_ENV):
        with rasterio.open(src_url) as ds:
            win = from_bounds(W, S, E, N, ds.transform).round_offsets().round_lengths()
            return ds.read(1, window=win), ds.window_transform(win)


with ThreadPoolExecutor(max_workers=2) as pool:
    (a, t), (c, t2) = list(pool.map(fetch_window, (URL, COP)))

assert a.shape == c.shape and abs(t.c - t2.c) < 1e-9 and abs(t.f - t2.f) < 1e-9, 'the two grids do not line up'
ny, nx = a.shape
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w') as f:
    json.dump({
        'source': 'FABDEM v1-2, N16E107 (University of Bristol / Fathom); Copernicus DEM GLO-30 (ESA)',
        'licence': 'CC BY-NC-SA 4.0 (FABDEM); Copernicus DEM licence, attribution required',
        'doi': '10.5523/bris.s5hqmjcdj8yo2ibzi9b4ew3sn',
        'datum': 'EGM2008',
        'lon0': t.c, 'lat0': t.f, 'dlon': t.a, 'dlat': t.e, 'nx': nx, 'ny': ny,
        'h': np.rint(a.astype(np.float64) * 10).astype(np.int32).ravel().tolist(),
        's': np.rint(c.astype(np.float64) * 10).astype(np.int32).ravel().tolist(),
    }, f, separators=(',', ':'))
print(OUT, nx, 'x', ny, 'min', float(a.min()), 'max', float(a.max()))
