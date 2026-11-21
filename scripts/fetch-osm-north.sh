#!/bin/sh
# The northern outskirts down the Hương to làng tranh Sình (Lại Ân), fetched as four pieces so no single Overpass
# query is heavy. Each piece lands in data/raw/hue-osm-north<N>.json and is merged by build-data.
# A piece already on disk is kept unless --force is given. Exits 1 if any piece could not be fetched.
set -eu
FORCE=0; [ "${1:-}" = "--force" ] && FORCE=1
FAIL=0
i=0
for LAT in "16.4965,16.5130" "16.5130,16.5300"; do
  S=${LAT%,*}; N=${LAT#*,}
  for LON in "107.5385,107.5760" "107.5760,107.6130"; do
    W=${LON%,*}; E=${LON#*,}
    i=$((i + 1))
    if [ $FORCE = 0 ] && [ -s "data/raw/hue-osm-north$i.json" ]; then echo "north$i already there"; continue; fi
    sh scripts/fetch-osm-strip.sh "$S,$W,$N,$E" "north$i" || FAIL=1
    sleep 6
  done
done
[ $FAIL = 0 ] || { echo "fetch-osm-north: some pieces FAILED" >&2; exit 1; }
