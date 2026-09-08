## ADDED Requirements

### Requirement: In-world screen overlay legibility at perspective angles
The in-world theater screen DOM overlay SHALL maintain legible, unaliased typography and interactive controls across arbitrary camera viewing angles and distances in both first-person and isometric modes. When viewed at oblique or foreshortened angles in first-person view, the overlay sizing and raster resolution SHALL accommodate both the horizontal and vertical projected dimensions of the screen quad so text characters, hotkey indicators, and buttons do not alias, skip scanlines, or degrade into disjointed glyph strokes.

#### Scenario: First-person view of the idle screen at an angle
- **WHEN** the player in first-person mode looks at the idle theater screen from an angle or close perspective
- **THEN** the idle title "The screen sleeps", the booth hotkey prompt, and the "Open the Booth" button render with complete, legible letterforms without missing horizontal scanlines, sliced characters, or moiré distortion

#### Scenario: Interactive booth trigger at perspective angle
- **WHEN** the player clicks the "Open the Booth" button on the in-world screen while looking at the screen from an angle
- **THEN** the projection booth controls modal opens reliably, with the button maintaining its visual boundaries and readable label

#### Scenario: Isometric mode screen scaling preserved
- **WHEN** the player switches between first-person and isometric camera angles in The Orpheum
- **THEN** the screen overlay adjusts its raster dimensions to fit the active camera perspective without introducing layout shifts, blurred scaling artifacts, or clipping
