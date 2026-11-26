#!/usr/bin/env python3
"""Building heights for the slab, from the city of Huế's own 3D building survey (GISHue).

Queries matching objectIds once over the full bounding box (`returnIdsOnly=true`), then fetches batches of 1,000 IDs
concurrently over persistent keep-alive HTTPS connections with gzip compression (~100x faster than sequential cell
queries and free of duplicate cross-cell footprints).

Writes, on the same 2 m grid as scripts/fetch/fetch-heights.py (metres east and south of the origin):
  data/raw/heights/gishue.u8.gz   heights in half metres, one byte a cell, rows north to south (0: no footprint)
  data/raw/heights/gishue.json    the grid's frame and the outline of the drone survey

  .venv/bin/python scripts/fetch/fetch-gishue-heights.py [cache-dir]

Source: https://gishue.hue.gov.vn (Hosted/Hue_Produced_Data_3D_WFL1, layer chanCongTrinh_RambInfo_8_WGS84).
"""
from concurrent.futures import ThreadPoolExecutor, as_completed
import gzip, http.client, json, math, os, ssl, sys, tempfile, threading, time, urllib.parse
import numpy as np
from rasterio.features import rasterize
from rasterio.transform import Affine

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from frame import ORIGIN, KX, KZ, BOUNDS  # noqa: E402

HOST_NAME = 'gishue.hue.gov.vn'
BASE_PATH = '/server/rest/services/Hosted/'
LAYER_PATH = BASE_PATH + 'Hue_Produced_Data_3D_WFL1/FeatureServer/6/query'
DRONE_PATH = BASE_PATH + 'Hue_Master_3D_ADB_WFL1/FeatureServer/16/query'
SKIP = (
    'Urban Random Buildings',
    'Countryside Random Buildings',
    'Can not be qualified as building, Height below 1.5 m',
    'Footprint is located in the current water area 11-08-2023',
    'The footprint is checked and is not correct',
)
RANK = [
    'Overlap', 'Google AI', 'The footprint is covered', 'The height is below',
    'Hue delivered', 'Deep Learning Buildings', 'Manually created',
    'The footprint is checked and is correct',
]
rank = lambda rel: max([i for i, k in enumerate(RANK) if (rel or '').startswith(k)], default=1)

x0, z0, x1, z1 = BOUNDS
STEP = 2.0
nx, nz = int(math.ceil((x1 - x0) / STEP)), int(math.ceil((z1 - z0) / STEP))
W, E, N, S = ORIGIN[1] + x0 / KX, ORIGIN[1] + x1 / KX, ORIGIN[0] - z0 / KZ, ORIGIN[0] - z1 / KZ
cache = sys.argv[1] if len(sys.argv) > 1 else tempfile.mkdtemp(prefix='gishue-')
os.makedirs(cache, exist_ok=True)

WHERE = "percentile90z >= 2 AND reliability NOT IN (%s)" % ','.join("'%s'" % s for s in SKIP)
BATCH_SIZE = 1000
MAX_WORKERS = 16
_tls = threading.local()
_ssl_ctx = ssl.create_default_context()


def _conn():
    conn = getattr(_tls, 'conn', None)
    if conn is None:
        conn = http.client.HTTPSConnection(HOST_NAME, timeout=120, context=_ssl_ctx)
        _tls.conn = conn
    return conn


def post_json(path, params):
    body = urllib.parse.urlencode(params).encode('utf-8')
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept-Encoding': 'gzip',
        'Connection': 'keep-alive',
        'User-Agent': 'arcgis-query-client/2.0',
    }
    err = None
    for attempt in range(4):
        try:
            conn = _conn()
            conn.request('POST', path, body=body, headers=headers)
            resp = conn.getresponse()
            raw = resp.read()
            if resp.getheader('Content-Encoding') == 'gzip':
                raw = gzip.decompress(raw)
            if resp.status != 200:
                raise RuntimeError(f'HTTP {resp.status}')
            data = json.loads(raw)
            if 'error' not in data:
                return data
            err = data['error']
        except Exception as exc:  # noqa: BLE001 - reconnect on dropped keep-alive socket
            err = exc
            try:
                _tls.conn.close()
            except Exception:
                pass
            _tls.conn = None
        time.sleep(1.5 * (attempt + 1))
    raise SystemExit('GISHue query failed: %s' % err)


def fetch_batch(batch_idx, oid_slice):
    cpath = os.path.join(cache, f'b_{batch_idx:04d}_{oid_slice[0]}_{oid_slice[-1]}.json')
    if os.path.exists(cpath):
        with open(cpath) as f:
            return json.load(f)
    data = post_json(LAYER_PATH, {
        'f': 'json',
        'objectIds': ','.join(map(str, oid_slice)),
        'outSR': '4326',
        'outFields': 'objectid,percentile90z,reliability,SHAPE__Area',
        'geometryPrecision': '6',
    })
    out = []
    for feat in data.get('features', []):
        attr = feat['attributes']
        geom = feat.get('geometry')
        if geom and geom.get('rings'):
            out.append([attr['objectid'], attr['SHAPE__Area'], attr['percentile90z'], rank(attr['reliability']), geom['rings']])
    with open(cpath, 'w') as f:
        json.dump(out, f)
    return out


t0 = time.perf_counter()
id_resp = post_json(LAYER_PATH, {
    'f': 'json',
    'where': WHERE,
    'geometry': f'{W:.6f},{S:.6f},{E:.6f},{N:.6f}',
    'geometryType': 'esriGeometryEnvelope',
    'inSR': '4326',
    'spatialRel': 'esriSpatialRelIntersects',
    'returnIdsOnly': 'true',
})
oids = sorted(set(id_resp.get('objectIds') or []))
batches = [oids[i:i + BATCH_SIZE] for i in range(0, len(oids), BATCH_SIZE)]
print(f'found {len(oids)} footprints -> {len(batches)} concurrent batches ({MAX_WORKERS} workers)', flush=True)

feats = []
with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
    drone_fut = pool.submit(post_json, DRONE_PATH, {
        'f': 'json', 'where': 'objectid=1', 'outSR': '4326',
        'geometryPrecision': '5', 'maxAllowableOffset': '0.00005',
    })
    batch_futs = {pool.submit(fetch_batch, idx, sl): idx for idx, sl in enumerate(batches)}
    done = 0
    for fut in as_completed(batch_futs):
        for _, area, h, rk, rings in fut.result():
            feats.append((rk, area, h, rings))
        done += 1
        if done % 10 == 0 or done == len(batches):
            print(f'batches {done}/{len(batches)} | footprints {len(feats)} | {time.perf_counter() - t0:.1f}s', flush=True)
    drone = drone_fut.result()

tr = Affine(STEP, 0, x0, 0, STEP, z0)
to_xz = lambda p: ((p[0] - ORIGIN[1]) * KX, (ORIGIN[0] - p[1]) * KZ)
feats.sort(key=lambda f: (f[0], -f[1]))
shapes = (({'type': 'Polygon', 'coordinates': [[to_xz(p) for p in r] for r in rings]}, min(255, max(1, round(h * 2)))) for _, _, h, rings in feats)
u8 = rasterize(shapes, out_shape=(nz, nx), transform=tr, fill=0, dtype='uint8')

ring = max(drone['features'][0]['geometry']['rings'], key=len)
os.makedirs('data/raw/heights', exist_ok=True)
with gzip.open('data/raw/heights/gishue.u8.gz', 'wb', compresslevel=9) as f:
    f.write(u8.tobytes())
with open('data/raw/heights/gishue.json', 'w') as f:
    json.dump({
        'source': 'GISHue, Hue_Produced_Data_3D_WFL1 / chanCongTrinh_RambInfo_8 (city of Huế, ADB 3D city model), field percentile90z',
        'licence': 'none stated (public service of the city government)',
        'x0': x0, 'z0': z0, 'step': STEP, 'nx': nx, 'nz': nz, 'unit': 0.5,
        'drone': [[round(v, 1) for v in to_xz(p)] for p in ring],
    }, f)
print(f'grid {nx} x {nz} | footprints {len(feats)} | cells with a building {int((u8 > 0).sum())} | max {u8.max() / 2} m | {time.perf_counter() - t0:.1f}s')
