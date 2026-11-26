#!/bin/sh
# The eastern strip from 107.613 E to 107.620 E (Aeon Mall Huế, issue #71), fetched concurrently in three pieces.
# A piece already on disk is kept unless --force is given.
set -eu
exec node scripts/fetch/fetch-osm-all.mjs --only east "$@"
