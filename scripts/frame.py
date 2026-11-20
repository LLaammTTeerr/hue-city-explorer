"""The model's frame for the raw-data fetchers, read from scripts/frame.json (shared with scripts/build-data.mjs).

ORIGIN (lat, lon), KX/KZ (metres per degree) and BOUNDS = (x0, z0, x1, z1): the slab in metres east and south of the
origin, rounded to the decimetre exactly as build-data writes them into meta.bounds. Reading the frame from here
rather than from the built public/data/hue.json removes the fetch -> build -> fetch loop after a change of box.
"""
import json, math, os

_f = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frame.json'), encoding='utf-8'))
ORIGIN = (_f['origin']['lat'], _f['origin']['lon'])
KX = math.cos(math.radians(ORIGIN[0])) * 111319.49
KZ = _f['kz']
_b = _f['bbox']
_dm = lambda v: math.floor(v * 10 + 0.5) / 10  # Math.round to the decimetre, as build-data's q()
BOUNDS = (_dm((_b['w'] - ORIGIN[1]) * KX), _dm(-(_b['n'] - ORIGIN[0]) * KZ), _dm((_b['e'] - ORIGIN[1]) * KX), _dm(-(_b['s'] - ORIGIN[0]) * KZ))
