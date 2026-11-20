#!/bin/sh
# The northern outskirts down the Hương to làng tranh Sình (Lại Ân), fetched as four pieces so no single Overpass
# query is heavy. Each piece lands in data/raw/hue-osm-north<N>.json and is merged by build-data.
i=0
for LAT in "16.4965,16.5130" "16.5130,16.5300"; do
  S=${LAT%,*}; N=${LAT#*,}
  for LON in "107.5385,107.5760" "107.5760,107.6130"; do
    W=${LON%,*}; E=${LON#*,}
    i=$((i + 1))
    [ -s "data/raw/hue-osm-north$i.json" ] && { echo "north$i already there"; continue; }
    sh scripts/fetch-osm-strip.sh "$S,$W,$N,$E" "north$i" || echo "north$i FAILED"
    sleep 6
  done
done
ls -la data/raw/
