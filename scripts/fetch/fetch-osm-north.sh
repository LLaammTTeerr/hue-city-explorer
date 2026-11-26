#!/bin/sh
# The northern outskirts down the Hương to làng tranh Sình (Lại Ân), fetched concurrently in four pieces.
# A piece already on disk is kept unless --force is given.
set -eu
exec node scripts/fetch/fetch-osm-all.mjs --only north "$@"
