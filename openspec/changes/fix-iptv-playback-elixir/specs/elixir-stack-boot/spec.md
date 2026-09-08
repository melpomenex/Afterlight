## Purpose

The Phoenix stack SHALL come up with a database schema matching its code and a deployed backend SHALL serve the preserved shared IPTV catalog, so players joining a room receive a working theater bill, shared playlist library and program guide instead of a crashing channel loop or an empty catalog.

## ADDED Requirements

### Requirement: Schema matches code at boot

The supported Phoenix stack SHALL NOT serve game traffic against a database whose schema predates its migrations. The dev stack (`npm run dev:stack`) SHALL apply pending migrations before Phoenix starts serving, and a database whose schema still mismatches the code SHALL abort the boot with a legible error naming the cause, rather than crashing room channels at join time.

#### Scenario: Dev stack on a lagging database

- **WHEN** a developer runs `npm run dev:stack` against a Postgres that predates the latest theater migration
- **THEN** pending migrations are applied before Phoenix serves, and a client joining the theater receives both `theater_state` and `iptv_state` join snapshots without a channel crash.

#### Scenario: Unmigratable database fails loudly

- **WHEN** migrations cannot be applied (e.g. an unreachable or misconfigured database)
- **THEN** the stack boot aborts with an error message that names the migration failure, and Phoenix does not start serving rooms in a state that crashes on first read.

#### Scenario: Test setup enforces the same contract

- **WHEN** the Elixir test suite runs against a test database missing columns the code reads
- **THEN** setup migrates first so failures report actual behavior differences, not `undefined_column` errors.

### Requirement: Deployed backend serves the preserved catalog

A production deployment SHALL serve a shared IPTV catalog restored from the preserved read-only snapshots (`data/iptv.json`, `data/epg.json`) when the Postgres catalog is empty, without ever writing to or mutating the snapshot files. Import SHALL be idempotent: an existing, non-empty Postgres catalog SHALL NOT be re-imported, duplicated, or overwritten.

#### Scenario: Fresh VM first boot

- **WHEN** a newly deployed backend starts with an empty Postgres catalog and the preserved snapshot files present
- **THEN** the snapshot playlists and guide are imported once into Postgres, and a client joining the theater sees the shared library and guide populated.

#### Scenario: Restart with an existing catalog

- **WHEN** the backend restarts with a non-empty Postgres catalog
- **THEN** no import runs and the existing catalog, including player uploads made since deployment, is unchanged.

#### Scenario: Snapshots remain read-only

- **WHEN** the catalog import runs
- **THEN** the snapshot files' contents and hashes are unchanged afterwards.
