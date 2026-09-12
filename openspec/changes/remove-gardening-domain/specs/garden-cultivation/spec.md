# garden-cultivation

## REMOVED Requirements

### Requirement: Soil Preparation and Planting

**Reason**: Personal gardens and crop cultivation are removed from the product; the game has pivoted to shared places.

**Migration**: No replacement. Retired beds and fixtures stay in the frozen data snapshots and are ignored by all readers; the client's tool belt and bed interactions are deleted.

### Requirement: Crop Moisture and Visible Growth Stages

**Reason**: The server no longer simulates garden beds, moisture or crop growth. The only consumer was the removed garden tick and personal-garden rendering.

**Migration**: No replacement. Weather remains presentation-only and no longer waters anything; crop stage visuals (`src/render/plants.js`) are deleted with the personal garden world.

### Requirement: Harvesting and Quality Grading

**Reason**: Harvesting, quality grades and produce inventory are part of the removed market economy.

**Migration**: No replacement. Recorded produce in the frozen snapshots is retained read-only and never loaded or granted.

### Requirement: Initial Crop Catalog

**Reason**: The crop catalog only served planting, harvesting and market pricing, all removed.

**Migration**: No replacement. `shared/crops.js`, the Elixir crop table and the crop parity fixtures are deleted together.
