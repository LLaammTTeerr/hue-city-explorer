#!/bin/sh
# Elevation for the slab: four zoom-13 "terrarium" PNG tiles from the AWS Open Data Terrain Tiles set
# (https://registry.opendata.aws/terrain-tiles/). height_m = R*256 + G + B/256 - 32768.
mkdir -p data/raw/elev
for X in 6543 6544; do for Y in 3715 3716; do
  curl -fsSL --retry 2 --max-time 60 "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/13/$X/$Y.png" -o "data/raw/elev/13-$X-$Y.png" || { echo "FAILED 13/$X/$Y"; exit 1; }
done; done
ls -la data/raw/elev
