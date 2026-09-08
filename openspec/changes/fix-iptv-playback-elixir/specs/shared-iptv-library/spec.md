## ADDED Requirements

### Requirement: Upload endpoints honor catalog ownership

The shared-library upload endpoints (`POST /api/theater/playlists`, `POST /api/theater/epg`) SHALL write to the same store the catalog reads from. When the gateway is not serving the catalog (catalog ownership flipped away from Phoenix), the upload endpoints SHALL refuse uploads with a clear, stable error instead of persisting into a store no client is served from. A player's uploaded list SHALL be visible in the catalog snapshot regardless of which process owns the catalog.

#### Scenario: Upload against a flipped-to-Phoenix gateway

- **WHEN** the gateway serves the catalog (e.g. `npm run dev:stack`, production compose)
- **THEN** an uploaded playlist or guide is persisted, a fresh `iptv_state` catalog snapshot reaches the theater room, and the uploader's list appears in the booth.

#### Scenario: Upload against a gateway not owning the catalog

- **WHEN** a gateway boots without catalog ownership (e.g. `npm run server:elixir` with no owner environment set)
- **THEN** an upload attempt is refused with an explicit error naming the reason, no catalog record is written, and the browser surfaces the refusal in the add-status line rather than reporting success.

#### Scenario: No silent split-brain

- **WHEN** uploads succeed but catalog reads come from a different store
- **THEN** this combination is not reachable through any shipped boot path (dev stack, local Elixir script, or production compose).
