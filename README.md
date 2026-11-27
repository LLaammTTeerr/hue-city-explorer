# Huế · bên dòng Hương

An interactive 3D model of central Huế, Vietnam, that you can explore in your web browser. It shows the Hương river and its bridges, the Citadel with its walls, moat and gates, the Imperial City, chợ Đông Ba, the royal tombs in the hills, and the craft villages up the river. The streets, riverbanks and buildings are drawn from real map data, in their true places.

**Open it here: https://hue-city.lamter.cc**

There is nothing to install. It works in any recent desktop or phone browser.

## What to explore

- **Places:** search for any of the 83 landmarks (`/`), filter by kind, or pick one from the grouped list (Citadel and heritage sites, along the river, tombs and outskirts, and craft villages). Click a place to fly there and read its card with a short story, facts and photos.
- **Time of day:** drag the continuous time-of-day slider from morning through golden hour into evening, or jump straight to the three presets (`1` Morning, `2` Late afternoon, `3` Lights on, or `N` for next). In the evening the riverside lamps, the lit facades and the colour band on cầu Trường Tiền come on.
- **Four Huế seasons:** switch between **Xuân** (Spring), **Hạ** (Summer), **Thu** (Autumn) and **Đông** (Winter, with mist rising off the Hương).
- **Passing shower (Mưa rào):** a short rain shower (`R`) crosses the city, with rings on the river and haze over the far banks.
- **Two looks:** switch between the illustrated ink-and-wash look (the default) and a realistic one with the **Ink / Nét mực** button or `I` (`V`).
- **Labels:** show or hide place and street names (`L`).
- **Capture & share:** export a clean PNG screenshot of your current frame at screen resolution (`1×`), `2×`, or `4K` from the camera menu (or press `P`), or share a direct link to your exact view and mood.
- **Language:** switch between Vietnamese (VI) and English (EN) at the top right.
- **Compass:** the compass returns you to the opening view from anywhere (`H`).

## Controls

| | Mouse | Touch | Keyboard |
| --- | --- | --- | --- |
| Move around | drag (or `Shift` + middle-drag) | one finger | arrow keys |
| Zoom | scroll wheel (zooms at the cursor) | pinch | `+` / `-` |
| Turn and tilt (orbit) | middle-drag or right-drag (or `Ctrl` / `Shift`-drag) | two-finger twist and tilt | `Q` / `E` |
| Fly closer | double-click | | |
| Back to the opening view | compass | compass | `H` |
| Search places | search bar | search bar | `/` |
| Time of day | continuous slider or preset ticks | continuous slider or preset ticks | `1` / `2` / `3` (`N` next) |
| Seasons (`Xuân` / `Hạ` / `Thu` / `Đông`) | season bar | season bar | |
| Rain on or off | shower button | shower button | `R` |
| Labels on or off | labels button | labels button | `L` |
| Switch Ink / Real look | ink button | ink button | `I` (`V`) |
| Save PNG screenshot (`1×` / `2×` / `4K`) | camera menu | camera menu | `P` |

## What is real and what is drawn

The positions and shapes of the river, canals, moats, lakes, streets, railway, bridges, city walls and over 6,000 building footprints come from map data and are true to life. The ground height and most building heights are measured.

All 83 listed landmarks stand on their real footprints — cầu Trường Tiền, Kỳ Đài, Ngọ Môn, Điện Thái Hòa, Phu Văn Lâu, the Citadel gates, the market hall, the royal tombs, pagodas, churches and craft villages — combining hand-built architectural models with self-hosted hero `.glb` ornament meshes streamed lazily as you approach (`public/data/models/*-hero.glb`). Their forms are based on photos and published plans.

Some things are illustration:
- houses on streets that have no mapped buildings yet
- trees, boats and lamps
- roof shapes and facades of ordinary buildings
- the style of each district's houses

You can hide the extra houses from the info panel (ⓘ).

## Data sources

| What | Source | Licence |
| --- | --- | --- |
| Rivers, streets, walls, building footprints | © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors | ODbL |
| Ground height | [FABDEM v1-2](https://doi.org/10.5523/bris.s5hqmjcdj8yo2ibzi9b4ew3sn), © University of Bristol / Fathom | CC BY-NC-SA 4.0 |
| Ground height | [Copernicus DEM GLO-30](https://registry.opendata.aws/copernicus-dem/), © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018, provided under COPERNICUS by the European Union and ESA | Copernicus DEM licence |
| Ground height checks | NASA ICESat-2 ATL03 satellite lidar (NSIDC DAAC), processed with [SlideRule](https://slideruleearth.io) | open NASA data |
| Building heights | The city of Huế's 3D building survey on [GISHue](https://gishue.hue.gov.vn), made for the city with ADB support | no licence stated; used with attribution |
| Building heights where the survey has none | [Google Open Buildings 2.5D Temporal](https://sites.research.google/gr/open-buildings/temporal/) v1 | CC BY 4.0 |
| Where forest grows | [ESA WorldCover](https://esa-worldcover.org) 10 m 2021 v200, contains modified Copernicus Sentinel data (2021) | CC BY 4.0 |
| Roof colours and paved yards | Copernicus Sentinel-2 L2A, scene of 30 March 2026, contains modified Copernicus Sentinel data (2026) | Copernicus data licence |
| Photos on the place cards | [Wikimedia Commons](https://commons.wikimedia.org); each photo shows its author and licence | the licence shown on each photo |

Fonts and three.js come from npm under their own licences. No live map service is used. Everything the model needs is bundled with the site.

## Versions

Each release is listed in [CHANGELOG.md](CHANGELOG.md) and on the [releases page](https://github.com/LLaammTTeerr/hue-city-explorer/releases). The version you are looking at is shown at the bottom of the About dialog (ⓘ).

## Licensing

- **Code:** no licence has been chosen yet, so the code is all rights reserved for now. You are welcome to look at it and explore the model.
- **Data:** each source keeps its own licence (see the table above). The bundled data files (`public/data/hue.json`, `public/data/hue.bin`, and `public/data/tiles/*.bin`) combine OpenStreetMap data (ODbL), terrain derived from FABDEM (CC BY-NC-SA 4.0) and heights from GISHue (no stated licence). Anyone reusing those files is bound by all three. In practice that means non-commercial use only and share-alike, and part of it is not openly licensed.

## Contributors

- [LLaammTTeerr](https://github.com/LLaammTTeerr): author and maintainer.
- [sleepyluno](https://github.com/sleepyluno): [bug reports and suggestions](https://github.com/LLaammTTeerr/hue-city-explorer/issues?q=author%3Asleepyluno) that shaped the Nam Giao esplanade, the language switch, the craft villages, the forest round the tombs, the bridges, the river lights and the riverside squares.

Found something wrong, or know Huế well? [Open an issue](https://github.com/LLaammTTeerr/hue-city-explorer/issues) with a screenshot or a photo of the real place.

## For developers

Running the project locally, the data pipeline, the checks and how to contribute are covered in [docs/development.md](docs/development.md). Ideas for larger features are kept in [docs/ideas.md](docs/ideas.md).
