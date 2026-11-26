#!/usr/bin/env python3
"""What colour the roofs really are: a cloud-free Sentinel-2 L2A scene (10 m, true colour) over the model's box.

Fetches red, green, and blue Cloud-Optimised GeoTIFF bands concurrently with HTTP/2 range multiplexing.
"""
from concurrent.futures import ThreadPoolExecutor
import base64, json, os, urllib.request, zlib
import numpy as np
import rasterio
from rasterio.warp import reproject, Resampling
from rasterio.transform import from_origin

ITEM = 'https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_48QYD_20260330_0_L2A'
W, S, E, N = 107.530, 16.375, 107.620, 16.537
D = 0.00009  # about 10 m
OUT = 'data/raw/dem/roofrgb.json'
GDAL_ENV = dict(
    GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR',
    CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif',
    CPL_VSIL_CURL_CHUNK_SIZE='1048576',
    GDAL_HTTP_MULTIPLEX='YES',
    GDAL_HTTP_MERGE_CONSECUTIVE_RANGES='YES',
    GDAL_HTTP_VERSION='2',
    VSI_CACHE='TRUE',
    GDAL_HTTP_MAX_RETRY='3',
)

item = json.load(urllib.request.urlopen(ITEM))
nx, ny = round((E - W) / D), round((N - S) / D)
dst_t = from_origin(W, N, D, D)


def fetch_band(band_name):
    with rasterio.Env(**GDAL_ENV):
        with rasterio.open('/vsicurl/' + item['assets'][band_name]['href']) as ds:
            out = np.zeros((ny, nx), np.float32)
            reproject(rasterio.band(ds, 1), out, dst_transform=dst_t, dst_crs='EPSG:4326', resampling=Resampling.bilinear, num_threads=2)
            return np.clip(out / 12, 0, 255).astype(np.uint8)


with ThreadPoolExecutor(max_workers=3) as pool:
    bands = list(pool.map(fetch_band, ('red', 'green', 'blue')))

rgb = np.dstack(bands)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w') as f:
    json.dump({
        'source': 'Copernicus Sentinel-2 L2A ' + item['id'] + ', bands 4/3/2 surface reflectance / 12',
        'licence': 'Contains modified Copernicus Sentinel data (2026)',
        'west': W, 'north': N, 'dlon': D, 'dlat': D, 'nx': nx, 'ny': ny,
        'rgb': base64.b64encode(zlib.compress(rgb.tobytes(), 9)).decode(),
    }, f)
print(OUT, nx, 'x', ny)
