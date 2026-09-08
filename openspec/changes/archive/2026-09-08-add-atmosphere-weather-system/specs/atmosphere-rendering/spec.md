## Purpose

Defines reusable spatial weather rendering, wet surfaces and comfort controls with explicit active-resource and performance limits.

## ADDED Requirements

### Requirement: Spatial shelter

Authored shelter SHALL reduce precipitation below cover and local weather exposure without hiding rain in the exposed world. Partial shelter and deterministic overlap selection SHALL be supported.

#### Scenario: Under arcade

- **WHEN** the player stands below an authored roof
- **THEN** rain streaks and ground splashes are masked below that roof while outside rain remains visible.

#### Scenario: Overlapping zones

- **WHEN** a point belongs to arcade and alcove zones
- **THEN** the higher-priority alcove applies consistently with a smooth boundary transition.

### Requirement: Reversible wet surfaces

Wetness SHALL change exposed surface appearance and puddle response using retained dry parameters; sheltered surfaces SHALL remain distinguishable. Wet/dry cycles SHALL NOT progressively corrupt colors or roughness or affect other cached worlds.

#### Scenario: Repeated wetting

- **WHEN** a surface completes ten wet/dry cycles
- **THEN** its dry parameters return within numeric tolerance and another world’s material is unchanged.

#### Scenario: Late join in rain

- **WHEN** a client enters fixed heavy rain
- **THEN** the paving is already wet rather than appearing dry because that client just arrived.

### Requirement: Bounded effect resources

Effects SHALL use batched bounded render resources and SHALL NOT allocate one scene object or DOM element per particle. Normal rain SHALL cap at 4096 drops and reduced rain at 1024; total active effect batches SHALL cap at six and three respectively. Hidden worlds SHALL do no particle updates or uploads.

#### Scenario: Heavy rain

- **WHEN** normal quality reaches maximum rain intensity
- **THEN** drop count and batches remain within the configured ceilings.

#### Scenario: Exit weather

- **WHEN** the active weather world is deactivated
- **THEN** emitter allocations and per-frame updates stop and borrowed global rendering settings are restored.

### Requirement: Comfort controls

Users SHALL have effect quality, particle visibility, reduced-motion behavior and lightning-off/reduced controls. Default flashes SHALL be reduced, with no repeated strobing or screen shake. Reduced motion SHALL retain environmental identity through light, fog, wetness and low-motion effects.

#### Scenario: Flash off

- **WHEN** a shared lightning event occurs with flashes disabled
- **THEN** no lighting flash is rendered and the preference does not alter other clients.

#### Scenario: OS reduced motion

- **WHEN** the user has not overridden a reduced-motion system preference
- **THEN** vigorous motion is reduced while the place remains atmospheric and navigable.

#### Scenario: Particle checkbox off

- **WHEN** particles are disabled
- **THEN** lighting, fog, wet surfaces, seats and interactions remain functional.

### Requirement: Camera and measurement acceptance

Atmosphere SHALL support every existing camera mode without replacing the active camera or hiding interaction prompts. Implementation SHALL record normal/reduced measurements on declared hardware, including frame time, draws, triangles, particles, lights, shadows and memory observations; unmeasured performance SHALL NOT be represented as verified.

#### Scenario: First person under rain

- **WHEN** a visitor cycles into first person
- **THEN** near-camera particles remain usable and shelter and prompts remain readable.

#### Scenario: Acceptance report

- **WHEN** an environment is promoted as accepted
- **THEN** its busiest state and hidden-world round trip have reproducible screenshots and measured results or an explicit failed gate.
