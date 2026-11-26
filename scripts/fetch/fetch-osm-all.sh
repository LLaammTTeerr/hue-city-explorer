#!/bin/sh
# Refresh every OSM extract the build merges (npm run data:fetch), concurrently across Overpass mirrors:
#   data/raw/hue-osm.json            main extract       16.4455,107.5520,16.4965,107.6130
#   data/raw/hue-osm-west.json       western strip      16.4455,107.5385,16.4965,107.5520 (out to chùa Thiên Mụ)
#   data/raw/hue-osm-south1..6.json  the southern hills, six pieces
#   data/raw/hue-osm-north1..4.json  the northern villages to làng Sình, four pieces
#   data/raw/hue-osm-east1..3.json   the eastern strip out to Aeon Mall, three pieces
#   data/raw/hue-osm-paved.json      paved squares, yards, car parks and bus stations over the whole box
#   data/raw/hue-osm-thuytien.json   fine detail at hồ Thủy Tiên from the OSM API
set -eu
exec node scripts/fetch/fetch-osm-all.mjs "$@"
