## Purpose

Defines user-controlled environmental audio, spatial crossfades and compatible mixing with specialized media and opt-in conferencing.

## Requirements

### Requirement: Gesture and lifecycle

Environmental audio SHALL start only after an explicit enabling gesture, tolerate autoplay denial, and stop within 200ms of place exit. Crossing a zone SHALL crossfade retained sources instead of repeatedly restarting them.

#### Scenario: Autoplay denied

- **WHEN** a browser refuses audio startup
- **THEN** visual travel completes and a later explicit Sound action can retry.

#### Scenario: Arcade entry

- **WHEN** the listener walks from exposed rain beneath a roof
- **THEN** direct rain softens and roof patter rises smoothly without restarting loop playback.

#### Scenario: Travel before thunder

- **WHEN** a visitor leaves after a flash but before its thunder time
- **THEN** that place’s thunder is canceled.

### Requirement: Independent local gains

Ambience, weather, effects, media and voice SHALL have bounded local gain policy. Existing footstep preferences SHALL survive. Provider media SHALL keep its existing playback path and local volume; mix adjustments SHALL NOT become shared timeline mutations.

#### Scenario: Change weather volume

- **WHEN** one visitor lowers weather volume
- **THEN** only their weather audio changes; remote users, queue and crop state are unchanged.

#### Scenario: Media engine switch

- **WHEN** a new Theater item loads while a mix reduction is active
- **THEN** effective local volume reflects both user volume and mix gain without overwriting the user’s preference.

### Requirement: Conferencing integration is optional

Existing conferencing SHALL be the only source of call activity/capture. If available, active voice SHALL reduce environmental and media audio through one local mix policy; leaving/failure SHALL restore it. Missing voice support SHALL NOT create capture or block any environment.

#### Scenario: Call ends

- **WHEN** an opt-in call adapter reports voice inactive or is removed
- **THEN** environment/media gain returns with bounded release and no stuck ducking.

#### Scenario: Provider lacks volume control

- **WHEN** a degraded provider cannot accept volume adjustment
- **THEN** playback continues and ducking is represented as unavailable rather than skipping or changing the shared item.
