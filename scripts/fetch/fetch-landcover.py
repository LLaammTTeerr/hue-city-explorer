#!/usr/bin/env python3
"""Where the trees really are: ESA WorldCover 2021 (v200, 10 m, from Sentinel-1 and -2), class 10 "tree cover".

Reads only the model's box via HTTP/2 multiplexed range requests and writes data/raw/dem/treecover.json.
"""
import base64, json, os
import numpy as np
import rasterio
from rasterio.windows import from_bounds

URL = '/vsicurl/https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_N15E105_Map.tif'
W, S, E, N = 107.530, 16.375, 107.620, 16.537
OUT = 'data/raw/dem/treecover.json'

with rasterio.Env(
    GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR',
    CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif',
    CPL_VSIL_CURL_CHUNK_SIZE='1048576',
    GDAL_HTTP_MULTIPLEX='YES',
    GDAL_HTTP_MERGE_CONSECUTIVE_RANGES='YES',
    GDAL_HTTP_VERSION='2',
    VSI_CACHE='TRUE',
    GDAL_HTTP_MAX_RETRY='3',
):
    with rasterio.open(URL) as ds:
        win = from_bounds(W, S, E, N, ds.transform).round_offsets().round_lengths()
        a = ds.read(1, window=win)
        t = ds.window_transform(win)

ny, nx = a.shape
bits = np.packbits((a == 10).astype(np.uint8), axis=None)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w') as f:
    json.dump({
        'source': 'ESA WorldCover 10 m 2021 v200 (class 10, tree cover)',
        'licence': 'CC BY 4.0, (c) ESA WorldCover project 2021 / Contains modified Copernicus Sentinel data (2021)',
        'west': t.c, 'north': t.f, 'dlon': t.a, 'dlat': -t.e, 'nx': nx, 'ny': ny,
        'share': round(float((a == 10).mean()), 4),
        'bits': base64.b64encode(bits.tobytes()).decode(),
    }, f)
print(OUT, nx, 'x', ny, 'tree share', round(float((a == 10).mean()), 3))
