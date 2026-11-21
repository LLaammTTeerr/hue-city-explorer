# Feature ideas

A backlog of larger features. None of these are scheduled. To start one, move it to PROGRESS.md and open a branch.

The question behind them: *what would someone who grew up in Huế show a friend who has never been there?*

## Huế trong 90 giây — a short guided journey

An optional flight linking **cầu Trường Tiền → chợ Đông Ba → Ngọ Môn**. Ninety seconds is a design target. Visitors can linger or leave the route at any point.

1. **Trường Tiền:** start at boat height, looking through the repeating steel spans. Then rise until the riverbanks come into view, so the bridge's shape is recognisable later from above.
2. **Đông Ba:** keep the bridge in view while the market comes into focus, so the visitor can place the market relative to the bridge. Give them one observation they can check by looking at the scene.
3. **Ngọ Môn:** pull back to reveal the walls and moat, then settle at the gate.

At the end the visitor controls the camera. Dragging during any leg takes control at once, without resetting the position.

Reuse the existing camera flights (`src/camera/controls.js` `flyTo`) and the bilingual place cards. Most of the work is choosing where the camera pauses and what each pause reveals.

## Find the photographer's spot

Pick one credited photograph with a clear architectural silhouette. Trường Tiền is a good first subject, because its arches and riverbanks give alignment points. Match its camera position in the model by hand. Let visitors switch between the photo and the model, then orbit away.

A playful variant: visitors try to line up the shot themselves before the photographer's spot is revealed.

*Needs a photo with usable rights and a credit.*

## Follow the river at your own pace

A boat-height exploration mode along a verified stretch of the Hương River. The visitor sets the pace, can pause under a bridge and can turn to look back. Prototype one short stretch where the change in perspective is worth the trip. Compare the same passage on a clear afternoon, in rain and after dark, using the existing atmosphere controls.

## Huế across time

Choose one place with reliable dated photographs or maps. Recreate a documented earlier view and let visitors compare it with the present from the same position. Attach dates and sources to the comparison, and mark any reconstructed details. One well-researched corner could be an experience in its own right.

*Needs sourced historical material.*

## Journeys worth a regression test

These are good candidates for an end-to-end check once the related features exist:

- Search `ngo mon`, press Enter, rotate the viewport, close the card. The camera stays at Ngọ Môn and keyboard focus returns to search.
- Open the site with WebGL unavailable and find Đông Ba through the fallback map.
- Drag away from a landmark and release near the start. No card opens.
- Open a shared rainy-night view in a fresh session. The first settled frame shows the intended landmark and atmosphere.

## Already done or in progress

- **Share a view ("Chia sẻ góc nhìn"):** in progress.
- **2D fallback when WebGL fails, and a light place index:** in progress.
- **Retry stories after a failed load:** done (#53).
