#!/usr/bin/env python3
"""What colour the roofs really are: a cloud-free Sentinel-2 L2A scene (10 m, true colour) over the model's box.

OSM tags almost no roof colours (no roof:colour on any of the ~6,300 mapped buildings), so the builder used to guess
by district: everything near Lê Lợi got ochre walls under red Marseille tile, which the south bank is not (issue #5).
scripts/build-data.mjs now reads each building's roof family (red tile, blue sheet, grey or pale concrete) from this
grid. At 10 m a pixel is one small house or part of a larger roof, so the signal is per building, coarse but real.

Reads only the model's box (HTTP range requests on the public cloud-optimised GeoTIFFs of the Earth Search catalogue),
resamples it to a lat/lon grid and writes data/raw/dem/roofrgb.json: surface reflectance of bands 4, 3, 2 divided by
12 and clipped to a byte, interleaved RGB, row-major from the north-west corner, deflated and base64-encoded.

  python3 -m venv .venv && .venv/bin/pip install rasterio numpy && .venv/bin/python scripts/fetch-roofs.py

Source: Copernicus Sentinel-2 L2A, scene S2B_48QYD_20260330 (0.01 % cloud), via Earth Search (Element 84) on AWS.
Contains modified Copernicus Sentinel data (2026), free and open under the Copernicus data licence.
"""
import base64
import json
import urllib.request
import zlib
import numpy as np
import rasterio
from rasterio.warp import reproject, Resampling
from rasterio.transform import from_origin

ITEM = 'https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_48QYD_20260330_0_L2A'
W, S, E, N = 107.530, 16.375, 107.620, 16.537  # the model's box with a margin, as fetch-landcover.py
D = 0.00009  # about 10 m
OUT = 'data/raw/dem/roofrgb.json'

item = json.load(urllib.request.urlopen(ITEM))
nx, ny = round((E - W) / D), round((N - S) / D)
dst_t = from_origin(W, N, D, D)
bands = []
with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR', CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif', GDAL_HTTP_MAX_RETRY='3'):
    for b in ('red', 'green', 'blue'):
        with rasterio.open('/vsicurl/' + item['assets'][b]['href']) as ds:
            out = np.zeros((ny, nx), np.float32)
            reproject(rasterio.band(ds, 1), out, dst_transform=dst_t, dst_crs='EPSG:4326', resampling=Resampling.bilinear)
            bands.append(np.clip(out / 12, 0, 255).astype(np.uint8))
rgb = np.dstack(bands)
json.dump({
    'source': 'Copernicus Sentinel-2 L2A ' + item['id'] + ', bands 4/3/2 surface reflectance / 12',
    'licence': 'Contains modified Copernicus Sentinel data (2026)',
    'west': W, 'north': N, 'dlon': D, 'dlat': D, 'nx': nx, 'ny': ny,
    'rgb': base64.b64encode(zlib.compress(rgb.tobytes(), 9)).decode(),
}, open(OUT, 'w'))
print(OUT, nx, 'x', ny)
