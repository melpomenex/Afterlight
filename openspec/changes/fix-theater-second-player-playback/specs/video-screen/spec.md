## MODIFIED Requirements

### Requirement: Room-wide bill changes arrive live
When any occupant changes the shared bill (add, play now, skip, remove, or playback control), every connected occupant in the theater SHALL see the resulting screen change within the broadcast cadence (about two seconds) without reloading. A client SHALL NOT be able to mistake an unacknowledged bill change for success: the booth SHALL either reflect the change or surface a readable error. A rejection SHALL be surfaced to the acting player even when no playlist or torrent resolve is pending, and it SHALL be attributable to the action that caused it.

#### Scenario: Another occupant queues a video
- **WHEN** occupant A adds a video while occupant B is seated in the theater
- **THEN** B's screen and queue reflect the new item within about two seconds

#### Scenario: Service refuses an action
- **WHEN** the gateway or playback service refuses a booth action (for example, a queue cap or an unrouted message)
- **THEN** the acting player sees a readable error message, and the shared bill is unchanged

#### Scenario: Rejected play-now is not silent
- **WHEN** an occupant's play-now or add action is refused while no playlist or torrent resolve is pending
- **THEN** the booth shows the readable reason and the shared bill is unchanged, rather than appearing to do nothing

### Requirement: Playback failures self-heal
A live item that cannot play because of its source (unreadable source, failed stream, fatally stalled download) SHALL end visibly — the room sees an error naming the item — and the bill SHALL advance to the next queued item or idle. Repeated source failures SHALL NOT wedge the screen, duplicate bill entries, or loop endlessly on the same item. A playback restriction local to one client (browser autoplay policy, embed refusal, unavailable decoder, transient player error) is not a source failure: that client SHALL NOT report the item ended or failed and the shared bill SHALL NOT advance because of it.

#### Scenario: Broken source skipped
- **WHEN** the live item's source fails to load or report fatal progress
- **THEN** the room sees the item named as failed and playback continues with the next queued item or idle

#### Scenario: Advancing is idempotent
- **WHEN** several occupants' clients report the same item ended or failed
- **THEN** the bill advances exactly once and the queue contains no duplicates

#### Scenario: Client-local block does not advance the bill
- **WHEN** one occupant's client cannot start playback because of its own browser or player state while other occupants are playing the item
- **THEN** that client sends no ended/failed report, the shared bill stays on the item, and the other occupants keep playing

## ADDED Requirements

### Requirement: Playback starts for every occupant
When any occupant starts a shared item, every connected client in the theater SHALL bring its own player to the shared timeline: playing, or — when the browser blocks or stalls autoplay — showing a visible one-tap start control that starts playback at the corrected shared position. Detection SHALL cover a player that starts and then stops, not only one that never starts, and playback SHALL NOT depend on which occupant queued the item.

#### Scenario: Second occupant follows a first occupant's start
- **WHEN** occupant A starts an item and occupant B has the theater screen visible
- **THEN** B's screen plays the item at the shared position, or shows the one-tap start control, without B reloading or re-queueing

#### Scenario: A player that starts and then stops
- **WHEN** a client's player begins playback and then pauses or stalls while the shared bill still says the item is playing
- **THEN** the client detects the stall and offers the one-tap start control instead of remaining silently stopped

#### Scenario: Recovery starts playback
- **WHEN** the player activates the one-tap start control
- **THEN** playback resumes at the shared timeline position and no ended or failed report is sent for the item

#### Scenario: Player handshake never completes
- **WHEN** a client's player never becomes ready because its embed handshake is blocked or races (for example a rejected cross-origin postMessage)
- **THEN** the client rebuilds the player once and, if it still cannot become ready, shows a local readable problem without reporting the item ended or failed and without changing the shared bill

#### Scenario: Second occupant starts the item themselves
- **WHEN** occupant B pastes a supported link and presses play in the booth
- **THEN** the item plays for B at the shared position (or B gets the one-tap start control), and every other occupant's screen follows the same item
