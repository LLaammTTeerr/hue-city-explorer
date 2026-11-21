# Changelog

Each release of the Huế explorer, newest first. Version numbers follow [Semantic Versioning](https://semver.org/), read for a map rather than a library:

- **Major**: the explorer changes in a way a returning visitor would notice as a new edition, such as a new area of the city or a redesigned interface.
- **Minor**: new places, models, features or data sources.
- **Patch**: fixes to models, data or rendering that add nothing new.

The version shown in the app's About dialog (ⓘ) is the one below, with the commit it was built from.

## 1.0.0 (2026-11-21)

The first numbered release, covering everything built since the project started on 2026-11-19.

### Added
- An interactive 3D model of central Huế built from OpenStreetMap, with terrain, the Hương river, streets, bridges and over a hundred thousand buildings (#1, #2).
- Replicas of all 77 listed places: the Citadel and Đại Nội, the royal tombs, pagodas, gates, bridges, markets and schools (#13, #23).
- Craft villages and the stretch north to Sình (#26); forest round the tombs and heritage sites (#27); the tomb lakes as water (#34).
- Search over the place list with a docked card for each place (#1).
- An illustrated look by default, with a realistic look behind a switch (#2, #28, #33).
- Time of day and weather moods; the Trường Tiền night show (#39); riverside lights on the Hương at night (#45); waving flags (#30).
- A Vietnamese / English switch (#25).
- Roof colours on the south bank read from Sentinel-2 (#31); green medians on divided roads (#41); paved yards in the riverside parks (#44).
- Checks run on every pull request: terrain data, landmark heights, models sunk into the ground, and overlaps between models, streets and buildings (#12, #24, #32, #43, #48).

### Fixed
- Heights at the tombs and lakeside hills (#4, #12); models sunk into the ground (#24).
- Buildings, trees and models standing in streets or each other (#20, #29, #37, #47, #48).
- Bridge decks and their approach streets (#3, #35, #36, #46).
- Label ghosting (#40), tree colours (#42).
- White flicker while zooming, and ring-shaped arcs on the river (#50).

### Removed
- The era switcher and boat features (#9).
