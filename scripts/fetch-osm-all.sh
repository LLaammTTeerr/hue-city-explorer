#!/bin/sh
# Refresh every OSM extract the build merges (npm run data:fetch), so none is stitched to one from another date:
#   data/raw/hue-osm.json            main extract       16.4455,107.5520,16.4965,107.6130
#   data/raw/hue-osm-west.json       western strip      16.4455,107.5385,16.4965,107.5520 (out to chùa Thiên Mụ)
#   data/raw/hue-osm-south1..6.json  the southern hills, six pieces (scripts/fetch-osm-south.sh)
#   data/raw/hue-osm-thuytien.json   fine detail at hồ Thủy Tiên from the OSM API (107.5712,16.4048,107.5815,16.4145)
# Each file is replaced only after its response checks out; one that fails keeps its old copy, and the script then
# exits 1 so the mix of dates does not go unnoticed.
set -eu
FAIL=""
sh scripts/fetch-osm.sh || FAIL="$FAIL main"
sleep 6
sh scripts/fetch-osm-strip.sh "16.4455,107.5385,16.4965,107.5520" west || FAIL="$FAIL west"
sleep 6
sh scripts/fetch-osm-south.sh --force || FAIL="$FAIL south"
node scripts/fetch-osm-detail.mjs thuytien 107.5712,16.4048,107.5815,16.4145 || FAIL="$FAIL thuytien"
if [ -n "$FAIL" ]; then echo "FAILED:$FAIL (those extracts keep their previous copy)" >&2; exit 1; fi
echo "all extracts refreshed"
