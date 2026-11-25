#!/bin/sh
# The eastern strip from 107.613 E to the box's east edge at 107.620 E (Aeon Mall Huế, issue #71), over the box's
# whole height, fetched as three pieces (south hills, city band, north) so no single Overpass query is heavy. Each
# piece lands in data/raw/hue-osm-east<N>.json and is merged by build-data.
# A piece already on disk is kept unless --force is given. Exits 1 if any piece could not be fetched.
set -eu
FORCE=0; [ "${1:-}" = "--force" ] && FORCE=1
FAIL=0
i=0
for LAT in "16.3820,16.4455" "16.4455,16.4965" "16.4965,16.5300"; do
  S=${LAT%,*}; N=${LAT#*,}
  i=$((i + 1))
  if [ $FORCE = 0 ] && [ -s "data/raw/hue-osm-east$i.json" ]; then echo "east$i already there"; continue; fi
  sh scripts/fetch/fetch-osm-strip.sh "$S,107.6130,$N,107.6200" "east$i" || FAIL=1
  sleep 6
done
[ $FAIL = 0 ] || { echo "fetch-osm-east: some pieces FAILED" >&2; exit 1; }
