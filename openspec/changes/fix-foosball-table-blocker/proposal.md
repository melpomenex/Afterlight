## Why

The Orpheum's foosball table at `[-5.8, 0, 7.0]` is physically intersected by pre-existing scenery: the theater's field-note stand, generated from the `theater` manifest entry's `note: [-6, 7.2]`, pushes a 1.2 m dark box up through the playing surface and pads the bay with its collision rectangle. The stand is also unreachable in practice — the foosball activity anchor at `[-5.8, 7.0]` is always nearer than the note item, so the note never wins the nearest-interaction search. It does nothing but block and disfigure the foosball table.

## What Changes

- Remove the Orpheum's field note entirely: drop `note`, `noteTitle` and `noteBody` from the `theater` manifest entry in `shared/placeDefinitions.js`. With no declared note, `worldFactory` no longer builds the note stand mesh, its `field-note` interaction item, or its collision rectangle at `[-6, 7.2]`.
- The foosball bay at `[-5.8, 7.0]` is left with only its intended contents: the 3D table, its runner carpet and brass borders, and the activity's own collision footprint. The table approach stays walkable.
- Retire the "Orpheum's house rules" lore and its interaction as a deliberate player-facing removal — no other place's field note changes.
- Update the manifest and reachability tests so the theater is explicitly note-free and a regression check proves no scenery, collision or interactable overlaps the foosball table volume.
- Keep the theater's projector-restoration objective, landmark, seats, screen and all activity content unchanged.

## Capabilities

### New Capabilities

- `foosball-table-clearance`: the Orpheum foosball bay and table volume stay free of unrelated scenery, collision and interactables, and the retired Orpheum field note is never rebuilt there.

### Modified Capabilities

- None in the archived corpus. The in-flight `add-theater-district` delta still declares a "Theater field note" requirement (and mentions the stand in its navigable-layout requirement); this change retires that behavior, so that requirement must be dropped or amended when that change is archived. The new capability is the authoritative statement until then.

## Impact

- `shared/placeDefinitions.js` — the `theater` entry loses its note tuple; validation, seeds, bounds, exits, objective and activities are untouched.
- `tests/place-definitions.test.js` — the assertion that `theater.noteTitle === 'The Orpheum's house rules'` becomes a theater-is-note-free assertion.
- `tests/districts.test.js` — the "every non-court place has a complete note tuple" rule must exempt the theater while still requiring its objective/landmark tuple.
- `tests/foosball-view.test.js` — add a clearance regression: no other obstacle or item intersects the foosball table volume, and the built theater has no `field-note` item.
- No server projection change: notes are client-side only and `server_elixir/priv/place_definitions.json` carries no note fields (verified). No save-schema, protocol, or dependency changes.
- Player-visible removal: the Orpheum's house-rules note can no longer be read; nothing else in the theater changes.
