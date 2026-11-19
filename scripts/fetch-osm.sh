#!/bin/sh
# Fetch raw OSM data for central Huế from Overpass (run once; output is bundled).
# bbox: south,west,north,east
BBOX="16.4455,107.5520,16.4965,107.6130"
Q="[out:json][timeout:180];(way[building]($BBOX);relation[building]($BBOX);way[highway]($BBOX);way[railway]($BBOX);way[natural=water]($BBOX);relation[natural=water]($BBOX);way[waterway]($BBOX);relation[waterway]($BBOX);way[barrier~'city_wall|wall']($BBOX);way[historic]($BBOX);relation[historic]($BBOX);node[historic]($BBOX);way[leisure~'park|garden|pitch|stadium']($BBOX);way[landuse]($BBOX);way[natural~'wood|scrub|grassland|sand|wetland']($BBOX);way[amenity~'marketplace|place_of_worship|university|school|hospital']($BBOX);node[amenity~'marketplace|place_of_worship']($BBOX);way[bridge]($BBOX);way[man_made~'bridge|pier|tower']($BBOX);node[place]($BBOX);node[tourism~'attraction|museum']($BBOX);way[tourism~'attraction|museum']($BBOX););out body geom;"
for EP in https://overpass-api.de/api/interpreter https://overpass.kumi.systems/api/interpreter https://overpass.private.coffee/api/interpreter; do
  echo "trying $EP"
  if curl -sS --fail --max-time 240 -A "hue-city-explorer/1.0" --data-urlencode "data=$Q" "$EP" -o data/raw/hue-osm.json && head -c 200 data/raw/hue-osm.json | grep -q '"version"'; then
    echo ok; ls -la data/raw/hue-osm.json; exit 0
  fi
done
echo FAILED; exit 1
