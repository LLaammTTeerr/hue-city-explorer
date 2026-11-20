#!/bin/sh
# Fetch the main Overpass extract for central Huế (bbox south,west,north,east) into data/raw/hue-osm.json.
# The query and the checks live in scripts/fetch-osm-strip.sh; scripts/fetch-osm-all.sh refreshes every extract.
set -eu
exec sh scripts/fetch-osm-strip.sh "16.4455,107.5520,16.4965,107.6130" main 180
