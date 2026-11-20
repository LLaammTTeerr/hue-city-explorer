#!/usr/bin/env python3
"""Building heights for the slab, from the city of Huế's own 3D building survey (GISHue).

The city's ADB-funded 3D model (Ramboll, 2022-24) holds a footprint layer in which every footprint carries the
90th-percentile height of a surface model above the ground under it (`percentile90z`). Inside the drone survey of
the urban core (about 12.6 km2: the eastern Citadel and the south bank) that surface model was flown by drone;
outside it the heights come from a satellite surface model. Footprints the survey itself marks as generated
("Random Buildings"), wrong, in the water or too low to be a building are left out.

Writes, on the same 2 m grid as scripts/fetch-heights.py (metres east and south of the origin):
  data/raw/heights/gishue.u8.gz   heights in half metres, one byte a cell, rows north to south (0: no footprint)
  data/raw/heights/gishue.json    the grid's frame and the outline of the drone survey

The layer keeps several generations of footprints on top of each other, and the survey's `reliability` note says
which is which. Where they overlap, a cell takes the best class that covers it (a footprint drawn by hand over one
found by a network, either over one the survey marks as overlapping a better one), and within a class the smallest.

  .venv/bin/python scripts/fetch-gishue-heights.py [cache-dir]

Source: https://gishue.hue.gov.vn (Hosted/Hue_Produced_Data_3D_WFL1, layer chanCongTrinh_RambInfo_8_WGS84).
The service is public and states no licence.
"""
import gzip, json, math, os, sys, tempfile, time, urllib.parse, urllib.request
import numpy as np
from rasterio.features import rasterize
from rasterio.transform import Affine

HOST = 'https://gishue.hue.gov.vn/server/rest/services/Hosted/'
LAYER = HOST + 'Hue_Produced_Data_3D_WFL1/FeatureServer/6/query'
DRONE = HOST + 'Hue_Master_3D_ADB_WFL1/FeatureServer/16/query'
SKIP = ('Urban Random Buildings', 'Countryside Random Buildings', 'Can not be qualified as building, Height below 1.5 m',
        'Footprint is located in the current water area 11-08-2023', 'The footprint is checked and is not correct')
# painted in this order, so the later classes win a shared cell
RANK = ['Overlap', 'Google AI', 'The footprint is covered', 'The height is below', 'Hue delivered', 'Deep Learning Buildings',
        'Manually created', 'The footprint is checked and is correct']
rank = lambda rel: max([i for i, k in enumerate(RANK) if (rel or '').startswith(k)], default=1)
from frame import ORIGIN, KX, KZ, BOUNDS  # scripts/frame.json, shared with scripts/build-data.mjs
x0, z0, x1, z1 = BOUNDS
STEP = 2.0
nx, nz = int(math.ceil((x1 - x0) / STEP)), int(math.ceil((z1 - z0) / STEP))
W, E, N, S = ORIGIN[1] + x0 / KX, ORIGIN[1] + x1 / KX, ORIGIN[0] - z0 / KZ, ORIGIN[0] - z1 / KZ
cache = sys.argv[1] if len(sys.argv) > 1 else tempfile.mkdtemp(prefix='gishue-')
os.makedirs(cache, exist_ok=True)


def get(url, q):
    req = urllib.request.Request(url + '?' + urllib.parse.urlencode(q), headers={'User-Agent': 'arcgis-query-client/1.0'})
    for attempt in range(4):
        try:
            d = json.load(urllib.request.urlopen(req, timeout=120))
            if 'error' not in d:
                return d
            err = d['error']
        except Exception as e:  # noqa: BLE001 - the service drops connections under load; retry
            err = e
        time.sleep(3 * (attempt + 1))
    raise SystemExit('GISHue query failed: %s' % err)


def cell(w, s, e, n):
    """Every kept footprint that touches one cell of the box: [id, area, height, class, rings]."""
    path = os.path.join(cache, 'c_%.3f_%.3f.json' % (w, s))
    if os.path.exists(path):
        return json.load(open(path))
    out, off = [], 0
    while True:
        d = get(LAYER, {'f': 'json', 'where': "percentile90z >= 2 AND reliability NOT IN (%s)" % ','.join("'%s'" % s for s in SKIP),
                        'geometry': '%f,%f,%f,%f' % (w, s, e, n), 'geometryType': 'esriGeometryEnvelope', 'inSR': '4326', 'outSR': '4326',
                        'spatialRel': 'esriSpatialRelIntersects', 'outFields': 'objectid,percentile90z,reliability,SHAPE__Area', 'geometryPrecision': '6',
                        'orderByFields': 'objectid', 'resultOffset': str(off), 'resultRecordCount': '2000'})
        fs = d.get('features', [])
        for f in fs:
            a = f['attributes']
            if f.get('geometry') and f['geometry'].get('rings'):
                out.append([a['objectid'], a['SHAPE__Area'], a['percentile90z'], rank(a['reliability']), f['geometry']['rings']])
        off += len(fs)
        if not fs or not d.get('exceededTransferLimit'):
            break
    json.dump(out, open(path, 'w'))
    return out


D = 0.01
seen, feats = set(), []
ys = np.arange(S, N, D)
for iy, s in enumerate(ys):
    for w in np.arange(W, E, D):
        for oid, area, h, rk, rings in cell(w, s, min(w + D, E), min(s + D, N)):
            if oid not in seen:
                seen.add(oid)
                feats.append((rk, area, h, rings))
    print('row', iy + 1, 'of', len(ys), '| footprints', len(feats), flush=True)

tr = Affine(STEP, 0, x0, 0, STEP, z0)  # column -> metres east, row -> metres south
to_xz = lambda p: ((p[0] - ORIGIN[1]) * KX, (ORIGIN[0] - p[1]) * KZ)
feats.sort(key=lambda f: (f[0], -f[1]))  # the better class last, and within a class the smaller footprint last
shapes = (({'type': 'Polygon', 'coordinates': [[to_xz(p) for p in r] for r in rings]}, min(255, max(1, round(h * 2)))) for _, _, h, rings in feats)
u8 = rasterize(shapes, out_shape=(nz, nx), transform=tr, fill=0, dtype='uint8')

drone = get(DRONE, {'f': 'json', 'where': 'objectid=1', 'outSR': '4326', 'geometryPrecision': '5', 'maxAllowableOffset': '0.00005'})
ring = max(drone['features'][0]['geometry']['rings'], key=len)
with gzip.open('data/raw/heights/gishue.u8.gz', 'wb', compresslevel=9) as f:
    f.write(u8.tobytes())
json.dump({'source': 'GISHue, Hue_Produced_Data_3D_WFL1 / chanCongTrinh_RambInfo_8 (city of Huế, ADB 3D city model), field percentile90z',
           'licence': 'none stated (public service of the city government)', 'x0': x0, 'z0': z0, 'step': STEP, 'nx': nx, 'nz': nz, 'unit': 0.5,
           'drone': [[round(v, 1) for v in to_xz(p)] for p in ring]}, open('data/raw/heights/gishue.json', 'w'))
print('grid', nx, 'x', nz, '| footprints', len(feats), '| cells with a building', int((u8 > 0).sum()), '| max', u8.max() / 2, 'm | drone outline', len(ring), 'points')
