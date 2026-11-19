#!/bin/sh
# Fetch one extra strip of OSM (south,west,north,east) and write it next to the main extract.
# Usage: sh scripts/fetch-osm-strip.sh "16.4455,107.5385,16.4965,107.5520" west
BBOX="$1"; NAME="${2:-strip}"
Q="[out:json][timeout:120];(way[building]($BBOX);relation[building]($BBOX);way[highway]($BBOX);way[railway]($BBOX);way[natural=water]($BBOX);relation[natural=water]($BBOX);way[waterway]($BBOX);way[historic]($BBOX);node[historic]($BBOX);way[leisure~'park|garden|pitch|stadium']($BBOX);way[landuse]($BBOX);way[natural~'wood|scrub|grassland|sand|wetland']($BBOX);way[amenity~'marketplace|place_of_worship|university|school|hospital']($BBOX);node[amenity~'place_of_worship']($BBOX);way[bridge]($BBOX);way[man_made~'bridge|pier|tower']($BBOX);node[man_made=tower]($BBOX);node[tourism~'attraction|museum']($BBOX);way[tourism~'attraction|museum']($BBOX););out body geom;"
for EP in https://overpass-api.de/api/interpreter https://overpass.private.coffee/api/interpreter https://overpass.kumi.systems/api/interpreter; do
  echo "trying $EP"
  if curl -sS --fail --max-time 150 -A "hue-city-explorer/1.0" --data-urlencode "data=$Q" "$EP" -o "data/raw/hue-osm-$NAME.json.part" && head -c 200 "data/raw/hue-osm-$NAME.json.part" | grep -q '"version"'; then
    mv "data/raw/hue-osm-$NAME.json.part" "data/raw/hue-osm-$NAME.json"; echo ok; ls -la "data/raw/hue-osm-$NAME.json"; exit 0
  fi
done
rm -f "data/raw/hue-osm-$NAME.json.part"; echo FAILED; exit 1
