## 1. Remove the theater note from the manifest

- [ ] 1.1 In `shared/placeDefinitions.js`, delete `note: [-6, 7.2]`, `noteTitle` and `noteBody` from the `theater` entry only; keep its objective/action/done/message, landmark, seed, bounds, exits, capabilities and activities byte-identical
- [ ] 1.2 Confirm `validatePlaceDefinition(theater)` and the full manifest still validate with the note tuple absent

## 2. Update the tests to the new contract

- [ ] 2.1 In `tests/place-definitions.test.js`, replace the `theater.noteTitle === 'The Orpheum's house rules'` assertion with assertions that the theater declares no note, note title or note body while its landmark stays `[0, 7.6]`
- [ ] 2.2 In `tests/districts.test.js`, exempt the theater from the note-completeness rule while still requiring its objective/landmark tuple, and keep the note requirement for every other non-court/desert-camp place
- [ ] 2.3 In `tests/foosball-view.test.js`, extend the placement test: inside the foosball bay, the foosball activity is the only interaction item and its footprint is the only obstacle centered in the bay, and the built theater has no `field-note` item anywhere

## 3. Confirm scope stayed narrow

- [ ] 3.1 Run `node scripts/export-place-definitions.mjs --check` and confirm no server projection change is required (notes are excluded from the projection)
- [ ] 3.2 Confirm `README.md` and `docs/places.md` text about declared notes remains accurate and needs no edit

## 4. Verification

- [ ] 4.1 Run `npm test` and resolve any failures
- [ ] 4.2 Run `npm run build` and resolve any build errors
- [ ] 4.3 In the running app, travel to The Orpheum and visually inspect the foosball bay: the table is unobstructed by any box, the runner carpet and borders are intact, and the field-note stand is gone
- [ ] 4.4 Walk the table's approaches and confirm the foosball interaction is offered (no field-note prompt in the theater), then start and leave a foosball session to confirm the activity still binds
- [ ] 4.5 Travel away and reload: the theater objective, seats, screen and activities behave as before, and the foosball bay stays clear on rebuild
- [ ] 4.6 Record the follow-up in the final report: the unarchived `add-theater-district` spec still contains its "Theater field note" requirement and must be amended or dropped when that change is archived
