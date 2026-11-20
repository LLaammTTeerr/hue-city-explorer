#!/usr/bin/env python3
"""Bare-earth terrain for the slab, from FABDEM v1-2 (Copernicus GLO-30 with forests and buildings removed).

Reads only the model's box out of the 1.7 GB regional zip with HTTP range requests and writes
data/raw/dem/fabdem.json: a lat/lon grid of heights in decimetres above the EGM2008 geoid.

  python3 -m venv .venv && .venv/bin/pip install rasterio && .venv/bin/python scripts/fetch-terrain.py

Source: Hawker et al. 2022, https://doi.org/10.5523/bris.s5hqmjcdj8yo2ibzi9b4ew3sn
Licence: CC BY-NC-SA 4.0 -- the grid written here, and the terrain built from it, carry the same licence.
"""
import json
import rasterio
from rasterio.windows import from_bounds

URL = '/vsizip//vsicurl/https://data.bris.ac.uk/datasets/s5hqmjcdj8yo2ibzi9b4ew3sn/N10E100-N20E110_FABDEM_V1-2.zip/N16E107_FABDEM_V1-2.tif'
W, S, E, N = 107.530, 16.375, 107.620, 16.503  # the model's box (scripts/build-data.mjs BBOX) with a margin
OUT = 'data/raw/dem/fabdem.json'

with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR', CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif,.zip', GDAL_HTTP_MAX_RETRY='3'):
    with rasterio.open(URL) as ds:
        win = from_bounds(W, S, E, N, ds.transform).round_offsets().round_lengths()
        a = ds.read(1, window=win)
        t = ds.window_transform(win)
ny, nx = a.shape
json.dump({
    'source': 'FABDEM v1-2, N16E107 (University of Bristol / Fathom)',
    'licence': 'CC BY-NC-SA 4.0',
    'doi': '10.5523/bris.s5hqmjcdj8yo2ibzi9b4ew3sn',
    'datum': 'EGM2008',
    # cell (i, j) is centred at lon0 + (i + 0.5) * dlon, lat0 + (j + 0.5) * dlat; rows run north to south
    'lon0': t.c, 'lat0': t.f, 'dlon': t.a, 'dlat': t.e, 'nx': nx, 'ny': ny,
    'h': [int(round(float(v) * 10)) for v in a.ravel()],
}, open(OUT, 'w'), separators=(',', ':'))
print(OUT, nx, 'x', ny, 'min', float(a.min()), 'max', float(a.max()))
