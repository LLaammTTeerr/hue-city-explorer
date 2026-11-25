#!/usr/bin/env python3
"""Where the trees really are: ESA WorldCover 2021 (v200, 10 m, from Sentinel-1 and -2), class 10 "tree cover".

OSM maps almost none of the pine and broadleaf forest that closes over the royal tombs and the hills, so planting
only inside OSM woods left the heritage sites standing on bare ground (issue #7). scripts/build-data.mjs plants its
forest from this grid instead.

Reads only the model's box (HTTP range requests on the public cloud-optimised GeoTIFF) and writes
data/raw/dem/treecover.json: the tree-cover cells of a lat/lon grid as a base64 bitmap, row-major from the north-west
corner, most significant bit first.

  python3 -m venv .venv && .venv/bin/pip install rasterio numpy && .venv/bin/python scripts/fetch/fetch-landcover.py

Source: ESA WorldCover 10 m 2021 v200, Zanaga et al. 2022, https://doi.org/10.5281/zenodo.7254221, (c) ESA WorldCover
project 2021 / contains modified Copernicus Sentinel data (2021) processed by the ESA WorldCover consortium, CC BY 4.0.
"""
import base64
import json
import numpy as np
import rasterio
from rasterio.windows import from_bounds

URL = '/vsicurl/https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_N15E105_Map.tif'
W, S, E, N = 107.530, 16.375, 107.620, 16.537  # the model's box (scripts/build-data.mjs BBOX) with a margin, as fetch-terrain.py
OUT = 'data/raw/dem/treecover.json'

with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR', CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif', GDAL_HTTP_MAX_RETRY='3'):
    with rasterio.open(URL) as ds:
        win = from_bounds(W, S, E, N, ds.transform).round_offsets().round_lengths()
        a = ds.read(1, window=win)
        t = ds.window_transform(win)
ny, nx = a.shape
bits = np.packbits((a == 10).astype(np.uint8), axis=None)
json.dump({
    'source': 'ESA WorldCover 10 m 2021 v200 (class 10, tree cover)',
    'licence': 'CC BY 4.0, (c) ESA WorldCover project 2021 / Contains modified Copernicus Sentinel data (2021)',
    'west': t.c, 'north': t.f, 'dlon': t.a, 'dlat': -t.e, 'nx': nx, 'ny': ny,
    'share': round(float((a == 10).mean()), 4),
    'bits': base64.b64encode(bits.tobytes()).decode(),
}, open(OUT, 'w'))
print(OUT, nx, 'x', ny, 'tree share', round(float((a == 10).mean()), 3))
