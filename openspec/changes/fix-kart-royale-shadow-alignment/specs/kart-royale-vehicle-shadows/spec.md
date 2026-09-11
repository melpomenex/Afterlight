## Purpose

Ensure every Kart Royale vehicle has one coherent, grounded contact shadow so racing cars remain visually anchored and never read as shadow duplicates.

## ADDED Requirements

### Requirement: Vehicle contact shadows remain aligned
Kart Royale SHALL render each active kart's contact shadow at that kart's ground footprint, following its position and orientation without a persistent lateral offset.

#### Scenario: Kart moves through the course
- **WHEN** a kart moves, turns, or reverses during a race
- **THEN** its contact shadow remains visually associated with the kart's wheel footprint rather than appearing beside the vehicle

#### Scenario: Kart suspension changes
- **WHEN** a kart's wheels move through supported suspension travel
- **THEN** the contact shadow continues to represent the current ground-contact footprint without introducing an offset silhouette

### Requirement: Vehicles do not render offset vehicle-shaped shadows
Kart Royale SHALL render no more than one visible contact-shadow silhouette per kart in a given frame. A kart SHALL NOT cast a directional-light silhouette that appears beside the vehicle.

#### Scenario: Near-detail vehicle render
- **WHEN** a kart is rendered in its near-detail representation
- **THEN** the visible contact shadow is a single grounded silhouette and no vehicle-shaped shadow is offset beside it

#### Scenario: Far-detail vehicle render
- **WHEN** a kart transitions to or from its far-detail representation
- **THEN** the transition does not introduce a second, displaced, stale, or directional-light vehicle silhouette
