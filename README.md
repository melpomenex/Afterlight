# Afterlight — The Rain Court

A playable Three.js interpretation of the supplied isometric exploration reference. All scenery and characters are generated in code; no external game assets are required.

## Run

```sh
npm install
npm run dev
```

Open http://localhost:5173. `npm run build` creates the production site in `dist/`.

## Play

- WASD / arrows: move relative to the camera
- Click or tap the ground: walk to a location
- Shift: run
- E or the interaction card: collect / inspect / restore
- C: cycle three camera angles
- Mouse wheel: zoom
- Escape: pause and settings

Collect the three glowing power cells, then interact with the generator beside the maintenance shop. Read the old note and explore with Kiln. Progress is saved in browser local storage. Settings includes a fresh-start option. Sound is synthesized locally and enabled using the Sound button.

Includes instanced architectural geometry, shadows, bloom, wet paving, industrial scenery, a following companion, obstacle collision, local progress, and responsive UI. This is a four-district exploration prototype inspired by the video, with original procedural environments.

## Explore the districts

Use **Districts** (or **M**) to travel at any time, or press **E** beside a glowing gateway. The route loops through four areas:

1. **The Rain Court** — the original power-cell restoration.
2. **The Sluiceworks** — cross a canal bridge and turn the sluice valve.
3. **The Glass Garden** — explore the greenhouse and tend the seed nursery.
4. **The Last Platform** — explore an abandoned tram stop and light its signal.

Each new area has its own scenery, lighting, map, field note, collision layout, and persistent restoration state. Kiln travels with you. Existing courtyard saves migrate automatically; reloading returns to your last district at its entrance. Only the active area's scenery is rendered, and areas are built on their first visit.

Run `npm test` to check save migration and that every new district's exits and objectives are reachable with collision enabled.
