# Summit Run — asset provenance and attribution

Status: contract-freeze record for `add-multiplayer-snowboard-arcade` (task
1.4), extended as production assets are created. Every visual, audio and code
element that ships with the Summit Run race is accounted for here. Anything
without established rights is independently created for Afterlight — a missing
license for an optional extraction is resolved by original implementation,
never by inventing a license.

## Reference source authorization

- **Reference**: `SSXTricky/` (origin `git@github.com:melpomenex/SSXTricky.git`),
  pinned commit `e87f6c7dc80d1a3d440acbd8b44db8597b263c9d` (2026-09-06).
- **Authorization**: the repository owner identifies it as their own project
  and authorizes its use as a gameplay/implementation reference for Afterlight.
  This authorization is recorded in
  `openspec/changes/add-multiplayer-snowboard-arcade/investigation.md`.
- **License status**: no LICENSE file is tracked and `package.json` has no
  license field. The reference is therefore **not** MIT-licensed or under any
  other distributable license, and nothing here labels it as such. Afterlight
  does not redistribute reference files; adapted ideas are reimplemented in
  Afterlight's own code with this attribution.
- **Adaptations** (from the subsystem disposition in `investigation.md`):
  terrain generation and arcade movement feel are adapted as *techniques* into
  versioned course data and fixed-step rules (`shared/snowboard/`); the jump
  charge formula and chase-camera lookahead/speed-FOV approach are adapted as
  pure-rule starting points. Direct reuse is limited to small pure utilities
  (clamp, bounded charge), reimplemented with Afterlight tuning constants.
- **Explicitly excluded** (never transferred to Afterlight):
  - SSX branding, titles, trademarks, original soundtrack or audio.
  - The Next.js/React shell, standalone renderer, window listeners and local
    pause/state management (Afterlight owns renderer, frame loop, input and
    lifecycle).
  - The five scripted AI rivals, tricks/boost economy and local race logic.
  - Anything of unknown third-party provenance. The reference README states
    geometry and rider models are generated locally; this supports procedural
    techniques but is not proof of historical authorship for any particular
    extraction, so all uncertain elements are rebuilt independently.

## Shipped asset manifest

| Asset | Creator/source | Rights | Delivery | Notes |
| --- | --- | --- | --- | --- |
| Upright cabinet GLB | Existing Afterlight (`public/arcade/cabinet/afterlight_arcade_cabinet.glb`) | Afterlight original | Shared load-once template, existing fallback/hot-swap | Provenance unchanged from the canonical cabinet system |
| Cabinet skin/artwork | Original procedural art, `src/arcade/artwork.js` summit motif | Afterlight original | Startup canvas textures (1040×720, 13:9) | Silhouette, trail-map sides, cream/ice/amber palette; no SSX art |
| Course terrain, ramps, gates | Original procedural data, versioned course document (`shared/snowboard/`) | Afterlight original | Lazy mountain chunk, identical bytes + hash on client and server | SSX-inspired techniques only |
| Rider and snowboard | Original procedural robot parts and board | Afterlight original | Built in the lazy scene from host primitives | Player nickname/profile accent only; no imported outfit |
| Pines, lodge, lift, peaks | Original procedural construction | Afterlight original | Instanced/merged static meshes | Rethemed to Afterlight night palette |
| Snowfall/spray/trail sprites | Original procedural atlas, locally generated | Afterlight original | One small canvas atlas; pooled Points/instanced quads | No required external texture |
| Wind/slide/carve/landing/countdown/finish audio | Original synthesized sound (Web Audio) | Afterlight original | Host AudioContext via injected mixer, effect bus, gain automation | No new AudioContext per tone; respects existing mute/volume |
| Music | None in v1 | — | — | Only added later with documented compatible license/attribution; never SSX soundtrack |
| SSXTricky reference source | `melpomenex/SSXTricky` @ `e87f6c7` | Owner-authorized reference; no distributable license | Not shipped | Attribution and technique credit only |

## Update policy

New Summit Run assets (including any later-licensed music or textures) must be
appended to this table with path, creator/source, rights, delivery and
modifications before they are wired into the game. If a provenance question
cannot be answered, the asset is rebuilt procedurally instead of shipped.
