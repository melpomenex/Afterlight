# Design: Modernize and Extend Afterlight In-Game Chat Experience

## Context

Afterlight's in-game chat operates over a single global channel (`#afterlight`), bridged between an authoritative Phoenix gateway (`Afterlight.Social.Relay`), a Node IRC sidecar (`server/chat.js`), and game clients (`src/ui/chatPanel.js`). 

The current interface consists of a plain `<div>` log and a `<form>` with a single text `<input>`. It lacks rich interaction capabilities: no emoji picker, no autocomplete, no visual grouping, no scroll preservation when reading history, and no personalization. 

The application architecture uses vanilla ES modules with Three.js and native DOM/CSS overlays. Chat must stay lightweight, fully accessible, and unobtrusive while players engage with the 3D world, play arcade games, or watch synchronized streams in The Orpheum.

## Goals / Non-Goals

**Goals:**
- Provide a zero-dependency, native Unicode emoji picker with search, categories, and recent history.
- Provide contextual autocomplete for emoji `:shortcodes` and player `@mentions`.
- Implement intelligent scroll anchoring and an unread jump pill (`↓ N new messages`).
- Introduce consecutive message grouping and three layout styles (Comfortable, Compact, Bubble).
- Support threaded-lite inline replies and player mention highlights.
- Create a coherent appearance customization system with 6 presets, density/font/background dimensions, and active World theme integration (`match-world`).
- Build an Appearance Settings dialog with real-time Live Preview and persistent localStorage storage.
- Maintain strict keyboard-only navigation, ARIA semantics, and game input isolation.

**Non-Goals:**
- Discord clone with multi-channel hierarchies, voice servers, or user permission roles.
- External GIF/sticker API integrations (e.g. Giphy/Tenor), avoiding third-party API keys, privacy leaks, and network overhead.
- Arbitrary raw HTML formatting in messages.
- Server-side database schema changes (chat remains an ephemeral relay with 100-message ring buffer).

## Decisions

### Decision 1: Self-Contained Native Unicode Emoji Dataset (`src/ui/chat/emojiData.js`)
- **Choice**: Embed a curated, lightweight Unicode emoji catalog (~380 top-used standard emojis) with metadata (unicode, shortcode, category, search keywords).
- **Rationale**: External emoji packages (like emoji-mart or twemoji) pull in 300KB-1MB+ bundles or load external images from CDNs. Native Unicode emojis render crisp and native on all platforms with zero network latency, zero dependencies, and tiny bundle size (~25KB).
- **Alternatives considered**: External npm package (rejected due to bundle bloat and external CDN reliance); raw character input only (rejected as poor UX).

### Decision 2: Dual-Mode Autocomplete Popover (`src/ui/chat/autocomplete.js`)
- **Choice**: A lightweight floating popup anchored above the composer that detects active triggers at cursor:
  - `:word` triggers emoji search suggestions.
  - `@word` triggers player nickname suggestions (populated from `remotePlayers`, recent senders, and local player).
- **Rationale**: Keeps the composer clean without multi-button toolbars. ArrowUp/Down navigates, Enter/Tab commits, and Escape/Backspace cancels without losing typed context.
- **Alternatives considered**: Separate modal dialogs (rejected: too disruptive); textarea plugins (rejected: unnecessary dependency).

### Decision 3: Consecutive Message Grouping & Layouts
- **Choice**: Track message sender and timestamp. Consecutive messages from the same sender within 180 seconds without intervening senders group under a single header (avatar badge, nickname, timestamp), while subsequent lines omit repeated headers.
- **Rationale**: Drastically reduces visual noise in active conversations. Supported seamlessly in Comfortable and Bubble layouts, while Compact layout maintains single-line IRC density.

### Decision 4: Scroll Anchoring & Unread Jump Pill
- **Choice**: Monitor log scroll position. If distance from bottom > 48px, incoming messages append to DOM without altering `scrollTop`. An unread jump pill appears: `↓ N new messages`. Clicking or scrolling back to bottom dismisses the pill.
- **Rationale**: Eliminates the frustrating problem of being yanked to the bottom while trying to read earlier messages.

### Decision 5: Backward-Compatible Reply Protocol
- **Choice**: Format replies as clean quoted text (`> @Nick: excerpt\nReply text`). The client parses the quote header to render a styled quote box with jump-to-source click handling.
- **Rationale**: Fully backward compatible with Phoenix `Afterlight.Social.Relay`, Node `server/chat.js`, IRC bridges, and older clients without any server migrations or protocol breakage.

### Decision 6: Semantic CSS Tokens & World Theme Integration
- **Choice**: Define semantic variables on `.chat-panel`: `--chat-bg`, `--chat-surface`, `--chat-border`, `--chat-accent`, `--chat-text`, `--chat-muted`, `--chat-font-size`, `--chat-line-gap`.
- **Rationale**: Decouples personalization from component markup. When `match-world` is chosen, `chatPreferences.js` reads `worldState.snapshot().selection.worldId` (or subscribes to changes) and applies matching palette tones (coastal teal, rainforest moss, alpine glacial, desert gold, redwood rust, cloud indigo) while strictly enforcing WCAG AA contrast.

### Decision 7: Appearance Modal with Live Preview (`src/ui/chat/appearanceModal.js`)
- **Choice**: A dedicated dialog containing a live preview widget that renders mock conversation items. Modifying any preset, density, or font immediately updates the preview and the active panel.
- **Rationale**: Instant feedback without guesswork. Reversible with "Reset to defaults".

## Risks / Trade-offs

- **[Risk] High CPU/GPU load from backdrop blur in glass modes**
  → *Mitigation*: Cap `backdrop-filter: blur(10px)`. Provide solid and translucent presets without blur.
- **[Risk] Keyboard shortcut conflicts with 3D game controls**
  → *Mitigation*: All chat inputs, buttons, and popups stop propagation of `keydown`. `onFocusChange` clears game keys, jump momentum, and exits pointer lock. Escape hierarchy ensures popups close first before returning focus to game.
- **[Risk] XSS or script injection via user text or links**
  → *Mitigation*: Text is rendered via `document.createTextNode` and `textContent`. URLs are detected with strict protocol validation (`https?://`) and created safely via DOM elements with `rel="noopener noreferrer"`.
- **[Risk] DOM accumulation during long sessions**
  → *Mitigation*: Hard retention cap of 200 message elements (`MAX_LINES`). FIFO pruning removes oldest nodes.
