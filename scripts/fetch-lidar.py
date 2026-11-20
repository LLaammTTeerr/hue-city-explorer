#!/usr/bin/env python3
"""Measured ground heights for the slab, from NASA's ICESat-2 satellite lidar.

ICESat-2 fires a green laser along six ground tracks and times the photons that come back. The ATL03 photons that
ATL08 classes as ground are fitted here in 20 m segments every 10 m along each track (SlideRule's ATL06-SR), which
gives ground heights good to a few decimetres on open flat ground. Heights are above the WGS84 ellipsoid; the EGM2008
geoid height that ATL03 carries is taken off, so they stand on the same datum as the elevation models
(scripts/fetch-terrain.py). Segments with fewer than 10 photons or a loose fit are dropped.

Writes data/raw/lidar/icesat2-ground.json: {pts: [[lat, lon, metres above sea level, overpass], ...]}; the overpass
number lets the build test the calibration on passes it was not fitted to.
scripts/build-data.mjs calibrates the terrain on them.

  .venv/bin/pip install sliderule && .venv/bin/python scripts/fetch-lidar.py

Source: ICESat-2 ATL03 v007 (NASA NSIDC DAAC), processed by SlideRule (https://slideruleearth.io). NASA data are open.
"""
import json, math, os
import sliderule
from sliderule import icesat2

from frame import ORIGIN, KX, KZ, BOUNDS  # scripts/frame.json, shared with scripts/build-data.mjs
x0, z0, x1, z1 = BOUNDS
W, E, N, S = ORIGIN[1] + x0 / KX, ORIGIN[1] + x1 / KX, ORIGIN[0] - z0 / KZ, ORIGIN[0] - z1 / KZ

sliderule.init(verbose=False)
poly = [{'lon': x, 'lat': y} for x, y in [(W, S), (E, S), (E, N), (W, N), (W, S)]]
g = icesat2.atl06p({'poly': poly, 'srt': icesat2.SRT_LAND, 'cnf': icesat2.CNF_SURFACE_LOW, 'atl08_class': ['atl08_ground'],
                    'ats': 5.0, 'cnt': 5, 'len': 20.0, 'res': 10.0, 'atl03_geo_fields': ['geoid']})
n = len(g)
g = g[(g.n_fit_photons >= 10) & (g.h_sigma < 0.2) & (g.rms_misfit < 0.4)]
g = g.sort_values(['rgt', 'cycle', 'gt', 'segment_id'])
over = {k: i for i, k in enumerate(sorted(set(zip(g.rgt, g.cycle))))}
pts = [[round(p.y, 6), round(p.x, 6), round(float(h - n0), 2), over[(r, c)]] for p, h, n0, r, c in zip(g.geometry, g.h_mean, g.geoid, g.rgt, g.cycle)]
os.makedirs('data/raw/lidar', exist_ok=True)
json.dump({'source': 'ICESat-2 ATL03 v007 ground photons (ATL08 class), 20 m segments by SlideRule ATL06-SR', 'licence': 'NASA open data',
           'datum': 'EGM2008', 'overpasses': len(over), 'pts': pts},
          open('data/raw/lidar/icesat2-ground.json', 'w'), separators=(',', ':'))
print('segments', n, '| kept', len(pts), '| overpasses', len(over))
