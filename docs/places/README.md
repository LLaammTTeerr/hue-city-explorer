# Place replicas

One note per place (`<slug>.md`), written by the agent that re-modelled it: sources (with URLs), what is confirmed,
what is estimated, what changed in the model, and what is left. The model itself is in
`src/landmarks/places/<slug>.js` (see the header of `src/landmarks/places/index.js`) or, for small fixes, in the
older builder. Check a place headlessly with `npm run build && npm run shot -- <placeId> --port <free port>`.

Moving parts that run on the city's shared clock and wind (flags so far) come from `src/landmarks/anim.js`: add one
to the place's dynamic group and it animates with no `update()` of its own.
