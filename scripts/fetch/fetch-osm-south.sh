#!/bin/sh
# The southern hills (đàn Nam Giao, the royal tombs, đồi Thiên An, hồ Thủy Tiên), fetched concurrently in six pieces.
# A piece already on disk is kept unless --force is given.
set -eu
exec node scripts/fetch/fetch-osm-all.mjs --only south "$@"
