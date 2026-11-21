#!/bin/sh
# Fetch one Overpass extract (bbox south,west,north,east) into data/raw/. Every extract (the main one, the western
# strip, the six southern pieces) uses this one query, so they carry the same classes.
# Usage: sh scripts/fetch-osm-strip.sh "16.4455,107.5385,16.4965,107.5520" west [timeout-seconds]
#        (name "main" writes data/raw/hue-osm.json, any other name data/raw/hue-osm-<name>.json)
# The name "paved" fetches only the paved-ground classes (squares, area:highway yards, surface car parks; issue #22),
# a light query run over the whole model box so the paved yards arrive without re-fetching every extract.
# The response goes to a temporary file and replaces the committed extract only once it parses as JSON, holds an
# "elements" array and carries no "remark" (Overpass answers a timed-out or out-of-memory query with HTTP 200, a
# partial element list and a remark).
set -eu
BBOX="$1"; NAME="${2:-strip}"; TIMEOUT="${3:-120}"
case "$NAME" in main) OUT=data/raw/hue-osm.json ;; *) OUT="data/raw/hue-osm-$NAME.json" ;; esac
B="($BBOX)"
PAVED="way[place=square]$B;relation[place=square]$B;way[\"area:highway\"]$B;way[amenity=parking]$B;"
Q="[out:json][timeout:$TIMEOUT];(\
${PAVED}\
way[building]$B;relation[building]$B;\
way[highway]$B;way[railway]$B;\
way[natural=water]$B;relation[natural=water]$B;way[waterway]$B;relation[waterway]$B;\
way[barrier~'city_wall|wall']$B;\
way[historic]$B;relation[historic]$B;node[historic]$B;\
way[leisure~'park|garden|pitch|stadium']$B;relation[leisure~'park|garden|pitch|stadium']$B;\
way[landuse]$B;relation[landuse]$B;\
way[natural~'wood|scrub|grassland|sand|wetland']$B;relation[natural~'wood|scrub|grassland|sand|wetland']$B;\
way[amenity~'marketplace|place_of_worship|university|school|hospital']$B;node[amenity~'marketplace|place_of_worship']$B;\
way[bridge]$B;way[man_made~'bridge|pier|tower']$B;node[man_made=tower]$B;\
node[place]$B;\
node[tourism~'attraction|museum']$B;way[tourism~'attraction|museum']$B;\
);out body geom;"
[ "$NAME" = paved ] && Q="[out:json][timeout:$TIMEOUT];(${PAVED});out body geom;"
TMP=$(mktemp "$OUT.XXXXXX")
trap 'rm -f "$TMP"' EXIT
for EP in https://overpass-api.de/api/interpreter https://overpass.private.coffee/api/interpreter https://overpass.kumi.systems/api/interpreter; do
  echo "$NAME: trying $EP"
  if curl -sS --fail --max-time $((TIMEOUT + 60)) -A "hue-city-explorer/1.0" --data-urlencode "data=$Q" "$EP" -o "$TMP" \
    && node scripts/check-overpass.mjs "$TMP"; then
    mv "$TMP" "$OUT"; echo "$NAME: ok"; ls -la "$OUT"; exit 0
  fi
done
echo "$NAME: FAILED ($OUT left as it was)" >&2; exit 1
