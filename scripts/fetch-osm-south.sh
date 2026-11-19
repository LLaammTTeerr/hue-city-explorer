#!/bin/sh
# The southern hills (đàn Nam Giao, the royal tombs, đồi Thiên An, hồ Thủy Tiên), fetched as six pieces so no
# single Overpass query is heavy. Each piece lands in data/raw/hue-osm-south<N>.json and is merged by build-data.
i=0
for LAT in "16.4245,16.4455" "16.4035,16.4245" "16.3820,16.4035"; do
  S=${LAT%,*}; N=${LAT#*,}
  for LON in "107.5385,107.5760" "107.5760,107.6130"; do
    W=${LON%,*}; E=${LON#*,}
    i=$((i + 1))
    [ -s "data/raw/hue-osm-south$i.json" ] && { echo "south$i already there"; continue; }
    sh scripts/fetch-osm-strip.sh "$S,$W,$N,$E" "south$i" || echo "south$i FAILED"
    sleep 6
  done
done
# the south-east piece (lăng Khải Định) is the one that tends to time out, so it can also be fetched as two halves
if [ ! -s data/raw/hue-osm-south6.json ]; then
  sh scripts/fetch-osm-strip.sh "16.3820,107.5760,16.4035,107.5945" south6a || echo "south6a FAILED"
  sleep 6
  sh scripts/fetch-osm-strip.sh "16.3820,107.5945,16.4035,107.6130" south6b || echo "south6b FAILED"
fi
ls -la data/raw/
