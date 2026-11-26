#!/bin/sh
# Fetch one Overpass extract (bbox south,west,north,east) into data/raw/. Every extract uses this one query with a
# global [bbox:...] header (scanning the spatial index once instead of per clause) and HTTP gzip/br compression.
# Usage: sh scripts/fetch/fetch-osm-strip.sh "16.4455,107.5385,16.4965,107.5520" west [timeout-seconds]
#        (name "main" writes data/raw/hue-osm.json, any other name data/raw/hue-osm-<name>.json)
set -eu
BBOX="$1"; NAME="${2:-strip}"; TIMEOUT="${3:-120}"
case "$NAME" in main) OUT=data/raw/hue-osm.json ;; *) OUT="data/raw/hue-osm-$NAME.json" ;; esac
PAVED="way[place=square];relation[place=square];way[\"area:highway\"];way[amenity=parking];way[amenity=bus_station];node[amenity=bus_station];"
Q="[out:json][timeout:$TIMEOUT][bbox:$BBOX];(\
${PAVED}\
way[building];relation[building];\
way[highway];way[railway];\
way[natural=water];relation[natural=water];way[waterway];relation[waterway];\
way[barrier~'city_wall|wall'];\
way[historic];relation[historic];node[historic];\
way[leisure~'park|garden|pitch|stadium'];relation[leisure~'park|garden|pitch|stadium'];\
way[landuse];relation[landuse];\
way[natural~'wood|scrub|grassland|sand|wetland'];relation[natural~'wood|scrub|grassland|sand|wetland'];\
way[amenity~'marketplace|place_of_worship|university|school|hospital'];node[amenity~'marketplace|place_of_worship'];\
way[bridge];way[man_made~'bridge|pier|tower'];node[man_made=tower];\
node[place];\
node[tourism~'attraction|museum'];way[tourism~'attraction|museum'];\
);out body geom;"
[ "$NAME" = paved ] && Q="[out:json][timeout:$TIMEOUT][bbox:$BBOX];(${PAVED});out body geom;"
TMP=$(mktemp "$OUT.XXXXXX")
trap 'rm -f "$TMP"' EXIT
for EP in https://overpass-api.de/api/interpreter https://overpass.private.coffee/api/interpreter https://overpass.kumi.systems/api/interpreter; do
  echo "$NAME: trying $EP"
  if curl -sS --compressed --fail --max-time $((TIMEOUT + 60)) -A "hue-city-explorer/1.2" --data-urlencode "data=$Q" "$EP" -o "$TMP" \
    && node scripts/checks/check-overpass.mjs "$TMP"; then
    mv "$TMP" "$OUT"; echo "$NAME: ok"; ls -la "$OUT"; exit 0
  fi
done
echo "$NAME: FAILED ($OUT left as it was)" >&2; exit 1
