#!/bin/sh
# The southern hills (đàn Nam Giao, the royal tombs, đồi Thiên An, hồ Thủy Tiên), fetched as six pieces so no
# single Overpass query is heavy. Each piece lands in data/raw/hue-osm-south<N>.json and is merged by build-data.
# A piece already on disk is kept unless --force is given. Exits 1 if any piece could not be fetched.
set -eu
FORCE=0; [ "${1:-}" = "--force" ] && FORCE=1
FAIL=0
i=0
for LAT in "16.4245,16.4455" "16.4035,16.4245" "16.3820,16.4035"; do
  S=${LAT%,*}; N=${LAT#*,}
  for LON in "107.5385,107.5760" "107.5760,107.6130"; do
    W=${LON%,*}; E=${LON#*,}
    i=$((i + 1))
    if [ $FORCE = 0 ] && [ -s "data/raw/hue-osm-south$i.json" ]; then echo "south$i already there"; continue; fi
    if sh scripts/fetch-osm-strip.sh "$S,$W,$N,$E" "south$i"; then :
    elif [ $i = 6 ]; then
      # the south-east piece (lăng Khải Định) is the one that tends to time out: fetch it as two halves instead
      sleep 6
      sh scripts/fetch-osm-strip.sh "16.3820,107.5760,16.4035,107.5945" south6a || FAIL=1
      sleep 6
      sh scripts/fetch-osm-strip.sh "16.3820,107.5945,16.4035,107.6130" south6b || FAIL=1
      [ $FAIL = 0 ] && [ -s data/raw/hue-osm-south6.json ] && echo "note: south6a/b fetched; remove the stale data/raw/hue-osm-south6.json"
    else
      FAIL=1
    fi
    sleep 6
  done
done
[ $FAIL = 0 ] || { echo "fetch-osm-south: some pieces FAILED" >&2; exit 1; }
