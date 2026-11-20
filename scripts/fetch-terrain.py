#!/usr/bin/env python3
"""Terrain for the slab: FABDEM v1-2 (Copernicus GLO-30 with forests and buildings removed) and the Copernicus
GLO-30 surface it was made from, on the same 1 arc-second grid.

Neither is right everywhere. Against documented heights (data/control-points.json) the surface model is within about
2 m on the hills, where FABDEM strips 5-10 m of "forest" that hides no ground; on the built-up plain the surface model
reads roofs and FABDEM is right. scripts/build-data.mjs blends the two by height above the plain.

Reads only the model's box (HTTP range requests) and writes data/raw/dem/terrain.json: a lat/lon grid of heights in
decimetres above the EGM2008 geoid, `h` bare earth (FABDEM) and `s` surface (Copernicus).

  python3 -m venv .venv && .venv/bin/pip install rasterio && .venv/bin/python scripts/fetch-terrain.py

Sources: FABDEM, Hawker et al. 2022, https://doi.org/10.5523/bris.s5hqmjcdj8yo2ibzi9b4ew3sn, CC BY-NC-SA 4.0 -- the
grid written here, and the terrain built from it, carry the same licence. Copernicus DEM GLO-30, (c) DLR e.V. 2010-2014
and (c) Airbus Defence and Space GmbH 2014-2018, provided under COPERNICUS by the European Union and ESA.
"""
import json
import rasterio
from rasterio.windows import from_bounds

URL = '/vsizip//vsicurl/https://data.bris.ac.uk/datasets/s5hqmjcdj8yo2ibzi9b4ew3sn/N10E100-N20E110_FABDEM_V1-2.zip/N16E107_FABDEM_V1-2.tif'
COP = '/vsicurl/https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_N16_00_E107_00_DEM/Copernicus_DSM_COG_10_N16_00_E107_00_DEM.tif'
W, S, E, N = 107.530, 16.375, 107.620, 16.503  # the model's box (scripts/build-data.mjs BBOX) with a margin
OUT = 'data/raw/dem/terrain.json'

with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR', CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif,.zip', GDAL_HTTP_MAX_RETRY='3'):
    with rasterio.open(URL) as ds:
        win = from_bounds(W, S, E, N, ds.transform).round_offsets().round_lengths()
        a = ds.read(1, window=win)
        t = ds.window_transform(win)
    with rasterio.open(COP) as ds:
        win2 = from_bounds(W, S, E, N, ds.transform).round_offsets().round_lengths()
        c = ds.read(1, window=win2)
        t2 = ds.window_transform(win2)
assert a.shape == c.shape and abs(t.c - t2.c) < 1e-9 and abs(t.f - t2.f) < 1e-9, 'the two grids do not line up'
ny, nx = a.shape
json.dump({
    'source': 'FABDEM v1-2, N16E107 (University of Bristol / Fathom); Copernicus DEM GLO-30 (ESA)',
    'licence': 'CC BY-NC-SA 4.0 (FABDEM); Copernicus DEM licence, attribution required',
    'doi': '10.5523/bris.s5hqmjcdj8yo2ibzi9b4ew3sn',
    'datum': 'EGM2008',
    # cell (i, j) is centred at lon0 + (i + 0.5) * dlon, lat0 + (j + 0.5) * dlat; rows run north to south
    'lon0': t.c, 'lat0': t.f, 'dlon': t.a, 'dlat': t.e, 'nx': nx, 'ny': ny,
    'h': [int(round(float(v) * 10)) for v in a.ravel()],
    's': [int(round(float(v) * 10)) for v in c.ravel()],
}, open(OUT, 'w'), separators=(',', ':'))
print(OUT, nx, 'x', ny, 'min', float(a.min()), 'max', float(a.max()))
