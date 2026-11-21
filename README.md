# Huế · bên dòng Hương

An interactive 3D model of central Huế, Vietnam, that you can explore in your web browser. It shows the Hương river and its bridges, the Citadel with its walls, moat and gates, the Imperial City, chợ Đông Ba, the royal tombs in the hills, and the craft villages up the river. The streets, riverbanks and buildings are drawn from real map data, in their true places.

**Open it here: https://hue-city.lamter.cc**

There is nothing to install. It works in any recent desktop or phone browser.

## What to explore

- **Places:** search for a place, or pick one from the list. The list is grouped into the Citadel and heritage sites, the riverside, the tombs and outskirts, and the craft villages. Click a place to fly there and read its card with a short story, facts and photos.
- **Time of day:** morning, late afternoon, or evening with the lights on. In the evening the riverside lamps, the lit facades and the colour band on cầu Trường Tiền come on.
- **Passing shower (Mưa rào):** a short rain shower crosses the city, with rings on the river and haze over the far banks.
- **Two looks:** the pencil button switches between the illustrated look (the default) and a more realistic one.
- **Labels:** the label button hides or shows every place name.
- **Language:** switch between Vietnamese (VI) and English (EN) at the top right.
- **Compass:** the compass returns you to the opening view from anywhere.

## Controls

| | Mouse | Touch | Keyboard |
| --- | --- | --- | --- |
| Move around | drag | one finger | arrow keys |
| Zoom | scroll wheel (zooms at the cursor) | pinch | `+` / `-` |
| Turn and tilt | right-drag or Shift-drag | two-finger twist and tilt | |
| Fly closer | double-click | | |
| Back to the opening view | compass | compass | `H` |
| Rain on or off | | | `R` |
| Next time of day | | | `N` |
| Labels on or off | | | `L` |
| Switch look | | | `V` |

## What is real and what is drawn

The positions and shapes of the river, canals, moats, lakes, streets, railway, bridges, city walls and about 5,000 building footprints come from map data and are true to life. The ground height and most building heights are measured.

The main landmarks are hand-built models that stand on their real footprints. These include cầu Trường Tiền, Kỳ Đài, Ngọ Môn, Điện Thái Hòa, Phu Văn Lâu, the market hall, the tombs and many more. Their forms are based on photos and published plans.

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
- **Data:** each source keeps its own licence (see the table above). The bundled data file `public/data/hue.json` combines OpenStreetMap data (ODbL), terrain derived from FABDEM (CC BY-NC-SA 4.0) and heights from GISHue (no stated licence). Anyone reusing that file is bound by all three. In practice that means non-commercial use only and share-alike, and part of it is not openly licensed.

## Contributors

- [LLaammTTeerr](https://github.com/LLaammTTeerr): author and maintainer.
- [sleepyluno](https://github.com/sleepyluno): [bug reports and suggestions](https://github.com/LLaammTTeerr/hue-city-explorer/issues?q=author%3Asleepyluno) that shaped the Nam Giao esplanade, the language switch, the craft villages, the forest round the tombs, the bridges, the river lights and the riverside squares.

Found something wrong, or know Huế well? [Open an issue](https://github.com/LLaammTTeerr/hue-city-explorer/issues) with a screenshot or a photo of the real place.

## For developers

Running the project locally, the data pipeline, the checks and how to contribute are covered in [docs/development.md](docs/development.md).
